-- Admin controls for the power-score unification (migrations 20260809120000-125000).
--
-- The unification rewrites every historical team_season_stats row, which
-- re-orders Career Rankings on the Stats page. Migration 20260809121000 backed
-- the old numbers up into team_season_stats_pre_unification and
-- team_details_power_pre_unification, but both tables have RLS enabled with no
-- policies, so nothing can read them, and undoing the unification means
-- hand-writing SQL.
--
-- This migration gives the admin panel five functions:
--
--   admin_power_unification_status()            where things stand
--   admin_get_pre_unification_season_stats()    the backed-up per-season rows
--   admin_get_pre_unification_team_power()      the backed-up standings power rows
--   admin_revert_power_score_unification()      one-click revert
--   admin_reapply_power_score_unification()     one-click re-apply
--
-- Design notes:
--
--   * All five are plpgsql on purpose: plpgsql bodies do not resolve table
--     references at creation time, so this file applies cleanly even on a
--     database where the 20260809 migrations have not run yet. A missing
--     backup table surfaces at call time as 42P01, which the frontend shows
--     as "not applied yet" rather than an error.
--
--   * Status is derived from pg_catalog (does the live view text use
--     power_score_100?) instead of a marker table. A marker would drift the
--     moment someone runs SQL by hand; the catalogs cannot lie.
--
--   * Revert does NOT copy the backup rows back into team_season_stats.
--     upsert_team_season_stats() re-derives every season from v_team_season_agg,
--     so restoring the OLD view/function definitions and re-running the upsert
--     brings back the old formula INCLUDING any matches finalized after the
--     unification was applied. A row copy would silently drop those games.
--     The backup tables stay untouched either way - they are the comparison
--     baseline and the audit trail.
--
--   * The old definitions embedded in the revert function are copied verbatim
--     from the last migrations that defined them on main:
--       v_team_match_stats            00000000000000_baseline.sql
--       v_team_details (+dependents)  20251002122723_dd700dd2
--       v_team_season_agg             20260408173910_5dd9611a
--       get_season_team_power_scores  20260330152902_b23e3ef7
--     The new definitions in the reapply function are copied verbatim from
--     20260809122000 / 20260809124000 / 20260809125000. The only deliberate
--     deviation: the baseline v_team_match_stats predates the security_invoker
--     convention, so the reverted copy adds WITH (security_invoker = on);
--     it changes who the view runs as, never what it returns.

-- ---------------------------------------------------------------------------
-- 1. Status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_power_unification_status()
RETURNS TABLE(
  status text,
  backed_up_at timestamptz,
  backup_season_rows bigint,
  backup_power_rows bigint,
  live_season_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_agg_unified boolean;
  v_details_unified boolean;
  v_backup_exists boolean;
  v_status text;
  v_backed_up_at timestamptz;
  v_backup_season_rows bigint := 0;
  v_backup_power_rows bigint := 0;
  v_live_season_rows bigint := 0;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- CASE, not AND: Postgres does not promise left-to-right evaluation of AND
  -- operands, so pg_get_viewdef must only be reachable once the view exists.
  v_agg_unified := CASE
    WHEN to_regclass('public.v_team_season_agg') IS NULL THEN false
    ELSE pg_get_viewdef('public.v_team_season_agg'::regclass) ILIKE '%power_score_100%'
  END;
  v_details_unified := CASE
    WHEN to_regclass('public.v_team_details') IS NULL THEN false
    ELSE pg_get_viewdef('public.v_team_details'::regclass) ILIKE '%power_score_100%'
  END;
  v_backup_exists := to_regclass('public.team_season_stats_pre_unification') IS NOT NULL;

  IF v_agg_unified AND v_details_unified THEN
    v_status := 'applied';
  ELSIF NOT v_agg_unified AND NOT v_details_unified AND v_backup_exists THEN
    v_status := 'reverted';
  ELSIF NOT v_agg_unified AND NOT v_details_unified THEN
    v_status := 'not_applied';
  ELSE
    -- One view unified, the other not: someone applied or reverted by hand
    -- and stopped halfway.
    v_status := 'partial';
  END IF;

  IF v_backup_exists THEN
    EXECUTE 'SELECT MIN(backed_up_at), COUNT(*) FROM public.team_season_stats_pre_unification'
      INTO v_backed_up_at, v_backup_season_rows;
  END IF;
  IF to_regclass('public.team_details_power_pre_unification') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.team_details_power_pre_unification'
      INTO v_backup_power_rows;
  END IF;
  SELECT COUNT(*) INTO v_live_season_rows FROM public.team_season_stats;

  RETURN QUERY SELECT v_status, v_backed_up_at,
                      v_backup_season_rows, v_backup_power_rows, v_live_season_rows;
END;
$fn$;

COMMENT ON FUNCTION public.admin_power_unification_status() IS
  'Admin-only. Whether the power-score unification is applied, reverted, or '
  'not applied, derived from the live view definitions plus backup-table row counts.';

-- ---------------------------------------------------------------------------
-- 2. Backed-up per-season rows (the pre-unification team_season_stats)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_pre_unification_season_stats()
RETURNS TABLE(
  team_id uuid,
  season_id uuid,
  season_name text,
  match_wins integer,
  match_losses integer,
  game_wins integer,
  game_losses integer,
  sos numeric,
  power_score numeric,
  division_name text,
  champion boolean,
  runner_up boolean,
  playoff_rank integer,
  backed_up_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF to_regclass('public.team_season_stats_pre_unification') IS NULL THEN
    RAISE EXCEPTION 'pre-unification backup tables do not exist yet'
      USING ERRCODE = '42P01';
  END IF;

  -- The seasons join mirrors the seasons!inner(name) join the live career
  -- fetch does in CareerBulkFetchService, so the frontend can feed backup rows
  -- through the same career calculators unchanged.
  RETURN QUERY EXECUTE
    'SELECT b.team_id, b.season_id, s.name,
            b.match_wins, b.match_losses, b.game_wins, b.game_losses,
            b.sos, b.power_score, b.division_name,
            COALESCE(b.champion, false), b.runner_up, b.playoff_rank,
            b.backed_up_at
     FROM public.team_season_stats_pre_unification b
     LEFT JOIN public.seasons s ON s.id = b.season_id';
END;
$fn$;

COMMENT ON FUNCTION public.admin_get_pre_unification_season_stats() IS
  'Admin-only. The team_season_stats rows as they stood before the power-score '
  'unification, with season names joined in.';

-- ---------------------------------------------------------------------------
-- 3. Backed-up standings power rows (the pre-unification v_team_details)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_pre_unification_team_power()
RETURNS TABLE(
  team_id uuid,
  power_score numeric,
  wins bigint,
  losses bigint,
  game_wins bigint,
  game_losses bigint,
  win_percentage numeric,
  game_win_percentage numeric,
  backed_up_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF to_regclass('public.team_details_power_pre_unification') IS NULL THEN
    RAISE EXCEPTION 'pre-unification backup tables do not exist yet'
      USING ERRCODE = '42P01';
  END IF;

  RETURN QUERY EXECUTE
    'SELECT b.team_id, b.power_score, b.wins, b.losses,
            b.game_wins, b.game_losses, b.win_percentage, b.game_win_percentage,
            b.backed_up_at
     FROM public.team_details_power_pre_unification b';
END;
$fn$;

COMMENT ON FUNCTION public.admin_get_pre_unification_team_power() IS
  'Admin-only. The v_team_details power/record columns as they stood before '
  'the power-score unification.';

-- ---------------------------------------------------------------------------
-- 4. Revert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revert_power_score_unification()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_unified boolean;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_unified := (CASE
      WHEN to_regclass('public.v_team_season_agg') IS NULL THEN false
      ELSE pg_get_viewdef('public.v_team_season_agg'::regclass) ILIKE '%power_score_100%'
    END)
    OR (CASE
      WHEN to_regclass('public.v_team_details') IS NULL THEN false
      ELSE pg_get_viewdef('public.v_team_details'::regclass) ILIKE '%power_score_100%'
    END);
  IF NOT v_unified THEN
    RETURN 'already_reverted';
  END IF;

  -- Same drop order as 20260809124000: v_team_details depends on
  -- v_team_match_stats, and v_team_strength_of_schedule depends on both.
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_details CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_match_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_season_agg';

  -- v_team_match_stats: baseline definition (matches only).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_match_stats
    WITH (security_invoker = on)
    AS
    SELECT
      t.id AS team_id,
      COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
      COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) AS losses,
      COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                        WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                        ELSE 0 END), 0) AS game_wins,
      COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                        WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                        ELSE 0 END), 0) AS game_losses,
      CASE WHEN COUNT(m.id) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)::numeric
                / NULLIF(COUNT(m.id), 0)
      END AS win_percentage,
      CASE WHEN COALESCE(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                  WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                                  ELSE 0 END), 0)::numeric
                / NULLIF(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0)
      END AS game_win_percentage,
      COALESCE(SUM(CASE WHEN m.loser_id = t.id
                        AND CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                 ELSE COALESCE(m.team2_game_wins, 0) END > 0
                        THEN 1 ELSE 0 END), 0) AS close_match_losses,
      CASE WHEN COALESCE(SUM(d_opp.division_weight), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END), 0)
                / NULLIF(SUM(d_opp.division_weight), 0)
      END AS weighted_win_percentage,
      CASE WHEN COALESCE(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                             * d_opp.division_weight), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                  WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                                  ELSE 0 END * d_opp.division_weight), 0)
                / NULLIF(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                             * d_opp.division_weight), 0)
      END AS weighted_game_win_percentage
    FROM public.teams t
    LEFT JOIN public.matches m
      ON (m.team1_id = t.id OR m.team2_id = t.id) AND m.iscompleted = true
    LEFT JOIN public.teams t_opp
      ON t_opp.id = CASE WHEN m.team1_id = t.id THEN m.team2_id
                         WHEN m.team2_id = t.id THEN m.team1_id END
    LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
    GROUP BY t.id
  $ddl$;

  -- v_team_details: 20251002122723 definition (inline 40/45/15 power_calc,
  -- matches only, no playoffs).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_details
    WITH (security_invoker = on)
    AS
    SELECT
        t.id AS team_id,
        t.name,
        t.logo_url,
        t.image_url,
        t.players,
        t.created_at,
        t.division_id,
        COALESCE(d.display_division, 'Recreational') AS divisionname,
        COALESCE(stats.win_percentage, 0) AS win_percentage,
        COALESCE(stats.game_win_percentage, 0) AS game_win_percentage,
        COALESCE(stats.wins, t.wins::bigint) AS wins,
        COALESCE(stats.losses, t.losses::bigint) AS losses,
        COALESCE(stats.game_wins, t.game_wins::bigint) AS game_wins,
        COALESCE(stats.game_losses, t.game_losses::bigint) AS game_losses,
        COALESCE(stats.close_match_losses, 0) AS close_match_losses,
        COALESCE(weighted_stats.weighted_win_percentage, 0) AS weighted_win_percentage,
        COALESCE(weighted_stats.weighted_game_win_percentage, 0) AS weighted_game_win_percentage,
        COALESCE(sos_calc.sos, 0.5) AS sos,
        power_calc.power_score AS power_score
    FROM teams t
    LEFT JOIN divisions d ON t.division_id = d.id
    LEFT JOIN v_team_match_stats stats ON t.id = stats.team_id
    LEFT JOIN (
        SELECT
            t.id as team_id,
            CASE
                WHEN COUNT(m.*) = 0 THEN 0
                ELSE (
                    SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) /
                    NULLIF(COUNT(m.*), 0)
                )
            END as weighted_win_percentage,
            CASE
                WHEN SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                             WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                             ELSE 0 END) = 0 THEN 0
                ELSE (
                    SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins * d_opp.division_weight
                             WHEN m.team2_id = t.id THEN m.team2_game_wins * d_opp.division_weight
                             ELSE 0 END) /
                    NULLIF(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                                   WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                                   ELSE 0 END), 0)
                )
            END as weighted_game_win_percentage
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN teams t_opp ON (
            CASE
                WHEN m.team1_id = t.id THEN m.team2_id
                WHEN m.team2_id = t.id THEN m.team1_id
            END = t_opp.id
        )
        LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
        GROUP BY t.id
    ) weighted_stats ON t.id = weighted_stats.team_id
    LEFT JOIN (
        SELECT
            t.id as team_id,
            CASE
                WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
                ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
            END as sos
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN teams opp ON (
            CASE
                WHEN m.team1_id = t.id THEN m.team2_id
                WHEN m.team2_id = t.id THEN m.team1_id
            END = opp.id
        )
        LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id
        GROUP BY t.id
    ) sos_calc ON t.id = sos_calc.team_id
    LEFT JOIN (
        SELECT
            t.id as team_id,
            CASE
                WHEN COUNT(m.*) = 0 THEN NULL
                ELSE (
                    (COALESCE(weighted_match_stats.weighted_win_percentage, 0) * 40.0) +
                    (COALESCE(sos_component.sos, 0.5) * 45.0) +
                    (COALESCE(weighted_game_stats.weighted_game_win_percentage, 0) * 15.0)
                )
            END as power_score
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN (
            SELECT
                t.id as team_id,
                CASE
                    WHEN COUNT(m.*) = 0 THEN 0
                    ELSE (
                        SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) /
                        NULLIF(COUNT(m.*), 0)
                    )
                END as weighted_win_percentage
            FROM teams t
            LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
            LEFT JOIN teams t_opp ON (
                CASE
                    WHEN m.team1_id = t.id THEN m.team2_id
                    WHEN m.team2_id = t.id THEN m.team1_id
                END = t_opp.id
            )
            LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
            GROUP BY t.id
        ) weighted_match_stats ON t.id = weighted_match_stats.team_id
        LEFT JOIN (
            SELECT
                t.id as team_id,
                CASE
                    WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
                    ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
                END as sos
            FROM teams t
            LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
            LEFT JOIN teams opp ON (
                CASE
                    WHEN m.team1_id = t.id THEN m.team2_id
                    WHEN m.team2_id = t.id THEN m.team1_id
                END = opp.id
            )
            LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id
            GROUP BY t.id
        ) sos_component ON t.id = sos_component.team_id
        LEFT JOIN (
            SELECT
                t.id as team_id,
                CASE
                    WHEN SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                                 WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                                 ELSE 0 END) = 0 THEN 0
                    ELSE (
                        SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins * d_opp.division_weight
                                 WHEN m.team2_id = t.id THEN m.team2_game_wins * d_opp.division_weight
                                 ELSE 0 END) /
                        NULLIF(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                                       WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                                       ELSE 0 END), 0)
                    )
                END as weighted_game_win_percentage
            FROM teams t
            LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
            LEFT JOIN teams t_opp ON (
                CASE
                    WHEN m.team1_id = t.id THEN m.team2_id
                    WHEN m.team2_id = t.id THEN m.team1_id
                END = t_opp.id
            )
            LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
            GROUP BY t.id
        ) weighted_game_stats ON t.id = weighted_game_stats.team_id
        GROUP BY t.id, weighted_match_stats.weighted_win_percentage, sos_component.sos, weighted_game_stats.weighted_game_win_percentage
    ) power_calc ON t.id = power_calc.team_id
    ORDER BY t.name
  $ddl$;

  -- Dependents, identical on both sides of the unification.
  EXECUTE $ddl$
    CREATE VIEW public.v_team_details_with_season
    WITH (security_invoker = on)
    AS
    SELECT
        t.team_id,
        t.name,
        t.logo_url,
        t.image_url,
        t.players,
        t.wins,
        t.losses,
        t.game_wins,
        t.game_losses,
        t.created_at,
        t.division_id,
        t.divisionname,
        t.win_percentage,
        t.game_win_percentage,
        t.close_match_losses,
        t.weighted_win_percentage,
        t.weighted_game_win_percentage,
        t.sos,
        t.power_score,
        s.id as season_id
    FROM v_team_details t
    CROSS JOIN (SELECT id FROM seasons WHERE is_active = true LIMIT 1) s
  $ddl$;

  EXECUTE $ddl$
    CREATE VIEW public.v_team_power_scores
    WITH (security_invoker = on)
    AS
    SELECT
        team_id,
        name as team_name,
        division_id,
        wins,
        losses,
        game_wins,
        game_losses,
        win_percentage,
        game_win_percentage,
        close_match_losses,
        sos,
        power_score
    FROM v_team_details
  $ddl$;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_team_sos') THEN
    EXECUTE $ddl$
      CREATE VIEW public.v_team_strength_of_schedule AS
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.division_id,
        s.wins,
        s.losses,
        s.game_wins,
        s.game_losses,
        s.win_percentage,
        s.game_win_percentage,
        s.close_match_losses,
        sos.sos
      FROM public.teams t
      LEFT JOIN public.v_team_match_stats s ON s.team_id = t.id
      LEFT JOIN public.v_team_sos sos ON sos.team_id = t.id
    $ddl$;
  END IF;

  -- v_team_season_agg: 20260408173910 definition (plain win rate, playoffs
  -- counted including byes).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_season_agg
    WITH (security_invoker = on)
    AS
    WITH regular_season_matches AS (
        SELECT ('reg_'::text || (m.id)::text) AS match_key,
            m.season_id,
            m.team1_id AS team_id,
            CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(m.team1_game_wins, 0) AS game_wins,
            COALESCE(m.team2_game_wins, 0) AS game_losses,
            m.team2_id AS opponent_id
        FROM matches m
        WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
        UNION ALL
        SELECT ('reg_'::text || (m.id)::text) AS match_key,
            m.season_id,
            m.team2_id AS team_id,
            CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(m.team2_game_wins, 0) AS game_wins,
            COALESCE(m.team1_game_wins, 0) AS game_losses,
            m.team1_id AS opponent_id
        FROM matches m
        WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
    ), archived_season_matches AS (
        SELECT ('arch_'::text || (ma.id)::text) AS match_key,
            ma.season_id,
            ma.team1_id AS team_id,
            CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(ma.team1_game_wins, 0) AS game_wins,
            COALESCE(ma.team2_game_wins, 0) AS game_losses,
            ma.team2_id AS opponent_id
        FROM matches_archive ma
        WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
        UNION ALL
        SELECT ('arch_'::text || (ma.id)::text) AS match_key,
            ma.season_id,
            ma.team2_id AS team_id,
            CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(ma.team2_game_wins, 0) AS game_wins,
            COALESCE(ma.team1_game_wins, 0) AS game_losses,
            ma.team1_id AS opponent_id
        FROM matches_archive ma
        WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
    ), playoff_season_matches AS (
        SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
            b.season_id,
            pm.team1_id AS team_id,
            CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(pm.team1_score, 0) AS game_wins,
            COALESCE(pm.team2_score, 0) AS game_losses,
            pm.team2_id AS opponent_id
        FROM (playoff_matches pm
            JOIN brackets b ON ((pm.bracket_id = b.id)))
        WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
        UNION ALL
        SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
            b.season_id,
            pm.team2_id AS team_id,
            CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_wins,
            CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_losses,
            COALESCE(pm.team2_score, 0) AS game_wins,
            COALESCE(pm.team1_score, 0) AS game_losses,
            pm.team1_id AS opponent_id
        FROM (playoff_matches pm
            JOIN brackets b ON ((pm.bracket_id = b.id)))
        WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
    ), all_matches AS (
        SELECT * FROM regular_season_matches
        UNION ALL
        SELECT * FROM archived_season_matches
        UNION ALL
        SELECT * FROM playoff_season_matches
    ), team_season_data AS (
        SELECT all_matches.season_id,
            all_matches.team_id,
            sum(all_matches.match_wins) AS match_wins,
            sum(all_matches.match_losses) AS match_losses,
            sum(all_matches.game_wins) AS game_wins,
            sum(all_matches.game_losses) AS game_losses
        FROM all_matches
        GROUP BY all_matches.season_id, all_matches.team_id
    ), sos_calc AS (
        SELECT am.season_id,
            am.team_id,
            CASE
                WHEN (count(DISTINCT am.opponent_id) > 0) THEN avg(COALESCE(d.division_weight, 0.85))
                ELSE NULL::numeric
            END AS sos
        FROM ((all_matches am
            LEFT JOIN teams t_opp ON ((am.opponent_id = t_opp.id)))
            LEFT JOIN divisions d ON ((t_opp.division_id = d.id)))
        GROUP BY am.season_id, am.team_id
    )
    SELECT tsd.season_id,
        tsd.team_id,
        tsd.match_wins,
        tsd.match_losses,
        tsd.game_wins,
        tsd.game_losses,
        CASE
            WHEN ((tsd.match_wins + tsd.match_losses) > 0) THEN ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)
            ELSE NULL::numeric
        END AS win_percentage,
        CASE
            WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
            ELSE NULL::numeric
        END AS game_win_percentage,
        sc.sos,
        CASE
            WHEN (((tsd.match_wins + tsd.match_losses) > 0) AND (sc.sos IS NOT NULL)) THEN (((0.40 * ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)) + (0.45 * sc.sos)) + (0.15 *
            CASE
                WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
                ELSE (0)::numeric
            END))
            ELSE NULL::numeric
        END AS power_score,
        COALESCE(
          tda.divisionname,
          d.display_division
        ) AS division_name
    FROM team_season_data tsd
    LEFT JOIN sos_calc sc ON ((tsd.season_id = sc.season_id) AND (tsd.team_id = sc.team_id))
    LEFT JOIN teams t ON (tsd.team_id = t.id)
    LEFT JOIN divisions d ON (t.division_id = d.id)
    LEFT JOIN team_details_archive tda ON (tda.team_id = tsd.team_id AND tda.season_id = tsd.season_id)
  $ddl$;

  -- get_season_team_power_scores: 20260330152902 definition (40/40/20,
  -- regular-season matches only). Same signature in both directions.
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.get_season_team_power_scores(p_season_id uuid)
    RETURNS TABLE(
      team_id uuid,
      power_score numeric,
      sos numeric,
      wins bigint,
      losses bigint,
      game_wins bigint,
      game_losses bigint,
      division_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT
        t.id AS team_id,
        -- 40/40/20 POWER SCORE FORMULA - NULL for teams with no matches in this season
        CASE
          WHEN match_counts.total_matches = 0 THEN NULL
          ELSE (
            (COALESCE(weighted_match_stats.weighted_win_percentage, 0) * 40.0) +
            (COALESCE(sos_component.sos, 0.5) * 40.0) +
            (COALESCE(weighted_game_stats.weighted_game_win_percentage, 0) * 20.0)
          )
        END AS power_score,
        COALESCE(sos_component.sos, 0.5) AS sos,
        COALESCE(match_counts.win_count, 0) AS wins,
        COALESCE(match_counts.loss_count, 0) AS losses,
        COALESCE(match_counts.gw_count, 0) AS game_wins,
        COALESCE(match_counts.gl_count, 0) AS game_losses,
        t.division_id
      FROM public.teams t
      -- Filter out teams that opted out
      LEFT JOIN public.team_season_opt_out tso ON t.id = tso.team_id AND tso.season_id = p_season_id
      -- Match counts for this season
      LEFT JOIN (
        SELECT
          sub_t.id AS tid,
          COUNT(m.*)::bigint AS total_matches,
          SUM(CASE WHEN m.winner_id = sub_t.id THEN 1 ELSE 0 END)::bigint AS win_count,
          SUM(CASE WHEN m.iscompleted = true AND m.winner_id IS NOT NULL AND m.winner_id != sub_t.id THEN 1 ELSE 0 END)::bigint AS loss_count,
          SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0)
                   WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0)
                   ELSE 0 END)::bigint AS gw_count,
          SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0)
                   WHEN m.team2_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0)
                   ELSE 0 END)::bigint AS gl_count
        FROM public.teams sub_t
        LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id)
          AND m.iscompleted = true
          AND m.season_id = p_season_id
        GROUP BY sub_t.id
      ) match_counts ON t.id = match_counts.tid
      -- Weighted match win percentage
      LEFT JOIN (
        SELECT
          sub_t.id AS tid,
          CASE
            WHEN COUNT(m.*) = 0 THEN 0
            ELSE (
              SUM(CASE WHEN m.winner_id = sub_t.id THEN d_opp.division_weight ELSE 0 END) /
              NULLIF(COUNT(m.*), 0)
            )
          END AS weighted_win_percentage
        FROM public.teams sub_t
        LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id)
          AND m.iscompleted = true
          AND m.season_id = p_season_id
        LEFT JOIN public.teams t_opp ON (
          CASE
            WHEN m.team1_id = sub_t.id THEN m.team2_id
            WHEN m.team2_id = sub_t.id THEN m.team1_id
          END = t_opp.id
        )
        LEFT JOIN public.divisions d_opp ON t_opp.division_id = d_opp.id
        GROUP BY sub_t.id
      ) weighted_match_stats ON t.id = weighted_match_stats.tid
      -- SOS
      LEFT JOIN (
        SELECT
          sub_t.id AS tid,
          CASE
            WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
            ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
          END AS sos
        FROM public.teams sub_t
        LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id)
          AND m.iscompleted = true
          AND m.season_id = p_season_id
        LEFT JOIN public.teams opp ON (
          CASE
            WHEN m.team1_id = sub_t.id THEN m.team2_id
            WHEN m.team2_id = sub_t.id THEN m.team1_id
          END = opp.id
        )
        LEFT JOIN public.divisions d_opp ON opp.division_id = d_opp.id
        GROUP BY sub_t.id
      ) sos_component ON t.id = sos_component.tid
      -- Weighted game win percentage
      LEFT JOIN (
        SELECT
          sub_t.id AS tid,
          CASE
            WHEN SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)
                          WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) + COALESCE(m.team1_game_wins, 0)
                          ELSE 0 END) = 0 THEN 0
            ELSE (
              SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) * d_opp.division_weight
                       WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) * d_opp.division_weight
                       ELSE 0 END) /
              NULLIF(SUM(CASE WHEN m.team1_id = sub_t.id THEN COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)
                             WHEN m.team2_id = sub_t.id THEN COALESCE(m.team2_game_wins, 0) + COALESCE(m.team1_game_wins, 0)
                             ELSE 0 END), 0)
            )
          END AS weighted_game_win_percentage
        FROM public.teams sub_t
        LEFT JOIN public.matches m ON (sub_t.id = m.team1_id OR sub_t.id = m.team2_id)
          AND m.iscompleted = true
          AND m.season_id = p_season_id
        LEFT JOIN public.teams t_opp ON (
          CASE
            WHEN m.team1_id = sub_t.id THEN m.team2_id
            WHEN m.team2_id = sub_t.id THEN m.team1_id
          END = t_opp.id
        )
        LEFT JOIN public.divisions d_opp ON t_opp.division_id = d_opp.id
        GROUP BY sub_t.id
      ) weighted_game_stats ON t.id = weighted_game_stats.tid
      WHERE tso.team_id IS NULL
        AND match_counts.total_matches > 0;
    END;
    $function$
  $ddl$;

  -- DROP wipes grants; restore the same set 20260809124000/125000 granted.
  EXECUTE 'GRANT SELECT ON public.v_team_match_stats TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details_with_season TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_power_scores TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_season_agg TO anon, authenticated';

  -- The actual data revert: re-derive every season's stored stats under the
  -- old formula. Covers matches finalized after the unification too.
  PERFORM public.upsert_team_season_stats();

  RETURN 'reverted';
END;
$fn$;

COMMENT ON FUNCTION public.admin_revert_power_score_unification() IS
  'Admin-only. Restores the pre-unification view/function definitions and '
  're-derives team_season_stats under the old formula. Idempotent.';

-- ---------------------------------------------------------------------------
-- 5. Re-apply
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reapply_power_score_unification()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_agg_unified boolean;
  v_details_unified boolean;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_agg_unified := CASE
    WHEN to_regclass('public.v_team_season_agg') IS NULL THEN false
    ELSE pg_get_viewdef('public.v_team_season_agg'::regclass) ILIKE '%power_score_100%'
  END;
  v_details_unified := CASE
    WHEN to_regclass('public.v_team_details') IS NULL THEN false
    ELSE pg_get_viewdef('public.v_team_details'::regclass) ILIKE '%power_score_100%'
  END;
  IF v_agg_unified AND v_details_unified THEN
    RETURN 'already_applied';
  END IF;

  IF to_regclass('public.v_power_score_components_current') IS NULL THEN
    RAISE EXCEPTION 'shared power-score views missing - apply migration 20260809120000 first';
  END IF;

  EXECUTE 'DROP VIEW IF EXISTS public.v_team_details CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_match_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_season_agg';

  -- v_team_match_stats: 20260809124000 definition (shared current-season
  -- source, playoff games included).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_match_stats
    WITH (security_invoker = on)
    AS
    SELECT
      t.id AS team_id,
      COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
      COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) AS losses,
      COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                        WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                        ELSE 0 END), 0) AS game_wins,
      COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                        WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                        ELSE 0 END), 0) AS game_losses,
      CASE WHEN COUNT(m.id) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)::numeric
                / NULLIF(COUNT(m.id), 0)
      END AS win_percentage,
      CASE WHEN COALESCE(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                  WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                                  ELSE 0 END), 0)::numeric
                / NULLIF(SUM(COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0)), 0)
      END AS game_win_percentage,
      COALESCE(SUM(CASE WHEN m.loser_id = t.id
                        AND CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                 ELSE COALESCE(m.team2_game_wins, 0) END > 0
                        THEN 1 ELSE 0 END), 0) AS close_match_losses,
      CASE WHEN COALESCE(SUM(d_opp.division_weight), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END), 0)
                / NULLIF(SUM(d_opp.division_weight), 0)
      END AS weighted_win_percentage,
      CASE WHEN COALESCE(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                             * d_opp.division_weight), 0) = 0 THEN 0
           ELSE COALESCE(SUM(CASE WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                                  WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                                  ELSE 0 END * d_opp.division_weight), 0)
                / NULLIF(SUM((COALESCE(m.team1_game_wins, 0) + COALESCE(m.team2_game_wins, 0))
                             * d_opp.division_weight), 0)
      END AS weighted_game_win_percentage
    FROM public.teams t
    LEFT JOIN public.v_power_score_match_source_current m
      ON (m.team1_id = t.id OR m.team2_id = t.id)
    LEFT JOIN public.teams t_opp
      ON t_opp.id = CASE WHEN m.team1_id = t.id THEN m.team2_id
                         WHEN m.team2_id = t.id THEN m.team1_id END
    LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
    GROUP BY t.id
  $ddl$;
  EXECUTE $ddl$
    COMMENT ON VIEW public.v_team_match_stats IS
      'Live-season team records, playoff games included, from v_power_score_match_source_current.'
  $ddl$;

  -- v_team_details: 20260809124000 definition (shared components view,
  -- canonical power_score_100).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_details
    WITH (security_invoker = on)
    AS
    SELECT
        t.id AS team_id,
        t.name,
        t.logo_url,
        t.image_url,
        t.players,
        t.created_at,
        t.division_id,
        COALESCE(d.display_division, 'Recreational') AS divisionname,
        COALESCE(stats.win_percentage, 0) AS win_percentage,
        COALESCE(stats.game_win_percentage, 0) AS game_win_percentage,
        COALESCE(stats.wins, t.wins::bigint) AS wins,
        COALESCE(stats.losses, t.losses::bigint) AS losses,
        COALESCE(stats.game_wins, t.game_wins::bigint) AS game_wins,
        COALESCE(stats.game_losses, t.game_losses::bigint) AS game_losses,
        COALESCE(stats.close_match_losses, 0) AS close_match_losses,
        COALESCE(comp.weighted_win_pct, 0) AS weighted_win_percentage,
        COALESCE(comp.weighted_game_win_pct, 0) AS weighted_game_win_percentage,
        COALESCE(comp.sos, 0.5) AS sos,
        CASE
          WHEN comp.team_id IS NULL OR comp.matches_played = 0 THEN NULL
          ELSE public.power_score_100(comp.weighted_win_pct, comp.sos, comp.weighted_game_win_pct)
        END AS power_score
    FROM teams t
    LEFT JOIN divisions d ON t.division_id = d.id
    LEFT JOIN public.v_team_match_stats stats ON t.id = stats.team_id
    LEFT JOIN public.v_power_score_components_current comp ON t.id = comp.team_id
    ORDER BY t.name
  $ddl$;

  EXECUTE $ddl$
    CREATE VIEW public.v_team_details_with_season
    WITH (security_invoker = on)
    AS
    SELECT
        t.team_id,
        t.name,
        t.logo_url,
        t.image_url,
        t.players,
        t.wins,
        t.losses,
        t.game_wins,
        t.game_losses,
        t.created_at,
        t.division_id,
        t.divisionname,
        t.win_percentage,
        t.game_win_percentage,
        t.close_match_losses,
        t.weighted_win_percentage,
        t.weighted_game_win_percentage,
        t.sos,
        t.power_score,
        s.id as season_id
    FROM v_team_details t
    CROSS JOIN (SELECT id FROM seasons WHERE is_active = true LIMIT 1) s
  $ddl$;

  EXECUTE $ddl$
    CREATE VIEW public.v_team_power_scores
    WITH (security_invoker = on)
    AS
    SELECT
        team_id,
        name as team_name,
        division_id,
        wins,
        losses,
        game_wins,
        game_losses,
        win_percentage,
        game_win_percentage,
        close_match_losses,
        sos,
        power_score
    FROM v_team_details
  $ddl$;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_team_sos') THEN
    EXECUTE $ddl$
      CREATE VIEW public.v_team_strength_of_schedule AS
      SELECT
        t.id AS team_id,
        t.name AS team_name,
        t.division_id,
        s.wins,
        s.losses,
        s.game_wins,
        s.game_losses,
        s.win_percentage,
        s.game_win_percentage,
        s.close_match_losses,
        sos.sos
      FROM public.teams t
      LEFT JOIN public.v_team_match_stats s ON s.team_id = t.id
      LEFT JOIN public.v_team_sos sos ON sos.team_id = t.id
    $ddl$;
  END IF;

  -- v_team_season_agg: 20260809125000 definition (canonical formula, byes
  -- excluded at the source).
  EXECUTE $ddl$
    CREATE VIEW public.v_team_season_agg
    WITH (security_invoker = on)
    AS
    SELECT
      c.season_id,
      c.team_id,
      c.wins AS match_wins,
      c.losses AS match_losses,
      c.game_wins,
      c.game_losses,
      CASE
        WHEN (c.wins + c.losses) > 0
          THEN (c.wins)::numeric / ((c.wins + c.losses))::numeric
        ELSE NULL::numeric
      END AS win_percentage,
      CASE
        WHEN (c.game_wins + c.game_losses) > 0
          THEN (c.game_wins)::numeric / ((c.game_wins + c.game_losses))::numeric
        ELSE NULL::numeric
      END AS game_win_percentage,
      c.sos,
      CASE
        WHEN (c.wins + c.losses) > 0 AND c.sos IS NOT NULL
          THEN public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) / 100.0
        ELSE NULL::numeric
      END AS power_score,
      COALESCE(tda.divisionname, d.display_division) AS division_name
    FROM public.v_power_score_components c
    LEFT JOIN public.teams t ON t.id = c.team_id
    LEFT JOIN public.divisions d ON d.id = t.division_id
    LEFT JOIN public.team_details_archive tda
      ON tda.team_id = c.team_id AND tda.season_id = c.season_id
  $ddl$;
  EXECUTE $ddl$
    COMMENT ON VIEW public.v_team_season_agg IS
      'Per-season team stats from the canonical match source and formula. Playoff '
      'results count, byes do not. power_score is on the 0-1 scale.'
  $ddl$;

  -- get_season_team_power_scores: 20260809122000 definition (canonical
  -- formula and match source, playoffs included).
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION public.get_season_team_power_scores(p_season_id uuid)
    RETURNS TABLE(
      team_id uuid,
      power_score numeric,
      sos numeric,
      wins bigint,
      losses bigint,
      game_wins bigint,
      game_losses bigint,
      division_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT
        t.id AS team_id,
        public.power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) AS power_score,
        COALESCE(c.sos, 0.5) AS sos,
        COALESCE(c.wins, 0) AS wins,
        COALESCE(c.losses, 0) AS losses,
        COALESCE(c.game_wins, 0) AS game_wins,
        COALESCE(c.game_losses, 0) AS game_losses,
        t.division_id
      FROM public.teams t
      JOIN public.v_power_score_components c
        ON c.team_id = t.id
       AND c.season_id = p_season_id
      -- Filter out teams that opted out
      LEFT JOIN public.team_season_opt_out tso
        ON t.id = tso.team_id AND tso.season_id = p_season_id
      WHERE tso.team_id IS NULL
        AND c.matches_played > 0;
    END;
    $function$
  $ddl$;
  EXECUTE $ddl$
    COMMENT ON FUNCTION public.get_season_team_power_scores(uuid) IS
      'Season power scores from the canonical formula and match source, playoffs '
      'included. Feeds power_score_snapshots via the capture-power-snapshots function.'
  $ddl$;

  EXECUTE 'GRANT SELECT ON public.v_team_match_stats TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details_with_season TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_power_scores TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_season_agg TO anon, authenticated';

  PERFORM public.upsert_team_season_stats();

  RETURN 'applied';
END;
$fn$;

COMMENT ON FUNCTION public.admin_reapply_power_score_unification() IS
  'Admin-only. Restores the unified (canonical-formula) view/function '
  'definitions and re-derives team_season_stats. Idempotent.';

-- ---------------------------------------------------------------------------
-- Execution rights: admins authenticate as `authenticated`; the in-function
-- current_user_is_admin() check does the real gating. anon gets nothing.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_power_unification_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_pre_unification_season_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_pre_unification_team_power() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revert_power_score_unification() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reapply_power_score_unification() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_power_unification_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_season_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_team_power() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revert_power_score_unification() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reapply_power_score_unification() TO authenticated, service_role;
