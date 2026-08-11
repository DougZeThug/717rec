-- Admin controls for the power-score unification (the 20260809* migrations).

CREATE OR REPLACE FUNCTION public.admin_power_unification_status()
RETURNS TABLE(
  status text,
  backed_up_at timestamptz,
  backup_season_rows bigint,
  backup_team_rows bigint,
  live_season_rows bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_backup_exists boolean;
  v_agg_unified boolean;
  v_details_unified boolean;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_backup_exists := to_regclass('public.team_season_stats_pre_unification') IS NOT NULL;
  v_agg_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_season_agg'), true)) > 0,
    false);
  v_details_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_details'), true)) > 0,
    false);

  IF v_agg_unified AND v_details_unified THEN
    status := 'applied';
  ELSIF v_agg_unified OR v_details_unified THEN
    status := 'partial';
  ELSIF v_backup_exists THEN
    status := 'reverted';
  ELSE
    status := 'not_applied';
  END IF;

  backup_season_rows := 0;
  backup_team_rows := 0;
  IF v_backup_exists THEN
    EXECUTE 'SELECT count(*), max(backed_up_at) FROM public.team_season_stats_pre_unification'
      INTO backup_season_rows, backed_up_at;
  END IF;
  IF to_regclass('public.team_details_power_pre_unification') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.team_details_power_pre_unification'
      INTO backup_team_rows;
  END IF;

  SELECT count(*) INTO live_season_rows FROM public.team_season_stats;

  RETURN NEXT;
END;
$fn$;

COMMENT ON FUNCTION public.admin_power_unification_status() IS
  'Admin-only. Reports whether the power-score unification is applied, reverted, '
  'partial or not_applied, plus backup timestamps and row counts.';

CREATE OR REPLACE FUNCTION public.admin_get_pre_unification_season_stats()
RETURNS TABLE(
  season_id uuid,
  team_id uuid,
  match_wins integer,
  match_losses integer,
  game_wins integer,
  game_losses integer,
  division_name text,
  playoff_rank integer,
  power_score numeric,
  sos numeric,
  champion boolean,
  runner_up boolean,
  recorded_at timestamptz,
  backed_up_at timestamptz,
  season_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    b.season_id,
    b.team_id,
    b.match_wins,
    b.match_losses,
    b.game_wins,
    b.game_losses,
    b.division_name,
    b.playoff_rank,
    b.power_score,
    b.sos,
    b.champion,
    b.runner_up,
    b.recorded_at,
    b.backed_up_at,
    s.name AS season_name
  FROM public.team_season_stats_pre_unification b
  LEFT JOIN public.seasons s ON s.id = b.season_id;
END;
$fn$;

COMMENT ON FUNCTION public.admin_get_pre_unification_season_stats() IS
  'Admin-only. The pre-unification team_season_stats backup joined to season names. '
  'Raises undefined_table when the unification has not been applied.';

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
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    b.team_id,
    b.power_score,
    b.wins,
    b.losses,
    b.game_wins,
    b.game_losses,
    b.win_percentage,
    b.game_win_percentage,
    b.backed_up_at
  FROM public.team_details_power_pre_unification b;
END;
$fn$;

COMMENT ON FUNCTION public.admin_get_pre_unification_team_power() IS
  'Admin-only. The pre-unification v_team_details power/record backup. '
  'Raises undefined_table when the unification has not been applied.';

CREATE OR REPLACE FUNCTION public.admin_revert_power_score_unification()
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

  v_agg_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_season_agg'), true)) > 0,
    false);
  v_details_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_details'), true)) > 0,
    false);

  IF to_regclass('public.team_season_stats_pre_unification') IS NULL THEN
    IF v_agg_unified OR v_details_unified THEN
      RAISE EXCEPTION 'The pre-unification backup tables have been dropped, so revert is no longer available';
    END IF;
    RAISE EXCEPTION 'The power-score unification has not been applied to this database yet, so there is nothing to revert';
  END IF;

  IF NOT v_agg_unified AND NOT v_details_unified THEN
    RETURN 'already_reverted';
  END IF;

  EXECUTE 'DROP VIEW IF EXISTS public.v_team_details CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_match_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_season_agg';

  EXECUTE $def$
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
  $def$;

  EXECUTE $def$
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
  $def$;

  PERFORM public.recreate_power_view_dependents();

  EXECUTE $def$
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
  $def$;

  EXECUTE $def$
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
      LEFT JOIN public.team_season_opt_out tso ON t.id = tso.team_id AND tso.season_id = p_season_id
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
  $def$;

  EXECUTE 'COMMENT ON FUNCTION public.get_season_team_power_scores(uuid) IS '
       || quote_literal('Pre-unification 40/40/20 season power scores, regular-season matches only. Restored by admin_revert_power_score_unification().');
  EXECUTE 'GRANT SELECT ON public.v_team_match_stats TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_season_agg TO anon, authenticated';

  PERFORM public.upsert_team_season_stats();
  PERFORM public.prune_team_season_stats_not_in_agg();

  RETURN 'reverted';
END;
$fn$;

COMMENT ON FUNCTION public.admin_revert_power_score_unification() IS
  'Admin-only. Restores the pre-unification power-score view definitions and '
  're-derives team_season_stats under the old formula. Idempotent. Keeps the '
  'backup tables and the unification''s shared objects so re-apply stays possible.';

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

  IF to_regclass('public.v_power_score_components') IS NULL
     OR to_regclass('public.v_power_score_components_current') IS NULL
     OR to_regprocedure('public.power_score_100(numeric, numeric, numeric)') IS NULL THEN
    RAISE EXCEPTION 'The power-score unification migrations (20260809*) have not been applied to this database yet';
  END IF;

  v_agg_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_season_agg'), true)) > 0,
    false);
  v_details_unified := COALESCE(
    position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_details'), true)) > 0,
    false);

  IF v_agg_unified AND v_details_unified THEN
    RETURN 'already_applied';
  END IF;

  EXECUTE 'DROP VIEW IF EXISTS public.v_team_details CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_match_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.v_team_season_agg';

  EXECUTE $def$
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
  $def$;

  EXECUTE 'COMMENT ON VIEW public.v_team_match_stats IS '
       || quote_literal('Live-season team records, playoff games included, from v_power_score_match_source_current.');

  EXECUTE $def$
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
  $def$;

  PERFORM public.recreate_power_view_dependents();

  EXECUTE $def$
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
  $def$;

  EXECUTE 'COMMENT ON VIEW public.v_team_season_agg IS '
       || quote_literal('Per-season team stats from the canonical match source and formula. Playoff results count, byes do not. power_score is on the 0-1 scale.');

  EXECUTE $def$
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
      LEFT JOIN public.team_season_opt_out tso
        ON t.id = tso.team_id AND tso.season_id = p_season_id
      WHERE tso.team_id IS NULL
        AND c.matches_played > 0;
    END;
    $function$
  $def$;

  EXECUTE 'COMMENT ON FUNCTION public.get_season_team_power_scores(uuid) IS '
       || quote_literal('Season power scores from the canonical formula and match source, playoffs included. Feeds power_score_snapshots via the capture-power-snapshots function.');
  EXECUTE 'GRANT SELECT ON public.v_team_match_stats TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_details TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_season_agg TO anon, authenticated';

  PERFORM public.upsert_team_season_stats();
  PERFORM public.prune_team_season_stats_not_in_agg();

  RETURN 'applied';
END;
$fn$;

COMMENT ON FUNCTION public.admin_reapply_power_score_unification() IS
  'Admin-only. Restores the canonical (unified) power-score definitions from the '
  '20260809* migrations and re-derives team_season_stats. Idempotent.';

CREATE OR REPLACE FUNCTION public.recreate_power_view_dependents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  EXECUTE $def$
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
  $def$;

  EXECUTE $def$
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
  $def$;

  IF to_regclass('public.v_team_sos') IS NOT NULL THEN
    EXECUTE $def$
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
    $def$;
  END IF;

  EXECUTE 'GRANT SELECT ON public.v_team_details_with_season TO anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.v_team_power_scores TO anon, authenticated';
END;
$fn$;

COMMENT ON FUNCTION public.recreate_power_view_dependents() IS
  'Internal helper for admin_revert/admin_reapply_power_score_unification: '
  'rebuilds v_team_details_with_season, v_team_power_scores and (conditionally) '
  'v_team_strength_of_schedule after the CASCADE drops.';

CREATE OR REPLACE FUNCTION public.prune_team_season_stats_not_in_agg()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_view_has_rows boolean;
  v_pruned integer := 0;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.v_team_season_agg
           WHERE team_id IS NOT NULL AND season_id IS NOT NULL)'
    INTO v_view_has_rows;

  IF v_view_has_rows THEN
    EXECUTE 'WITH pruned AS (
               DELETE FROM public.team_season_stats ts
               WHERE NOT EXISTS (
                 SELECT 1 FROM public.v_team_season_agg agg
                 WHERE agg.season_id = ts.season_id
                   AND agg.team_id = ts.team_id
               )
               RETURNING 1
             )
             SELECT count(*) FROM pruned'
      INTO v_pruned;
  END IF;

  RETURN v_pruned;
END;
$fn$;

COMMENT ON FUNCTION public.prune_team_season_stats_not_in_agg() IS
  'Internal helper for admin_revert/admin_reapply_power_score_unification: '
  'deletes team_season_stats rows the live v_team_season_agg no longer emits '
  '(e.g. bye-only playoff rows after moving to the canonical formula).';

REVOKE EXECUTE ON FUNCTION public.admin_power_unification_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_pre_unification_season_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_pre_unification_team_power() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revert_power_score_unification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reapply_power_score_unification() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recreate_power_view_dependents() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prune_team_season_stats_not_in_agg() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_power_unification_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_season_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_team_power() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revert_power_score_unification() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reapply_power_score_unification() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recreate_power_view_dependents() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prune_team_season_stats_not_in_agg() TO authenticated, service_role;

DO $cleanup$
BEGIN
  IF COALESCE(
       position('power_score_100' in pg_get_viewdef(to_regclass('public.v_team_season_agg'), true)) > 0,
       false)
     AND EXISTS (SELECT 1 FROM public.v_team_season_agg
                 WHERE team_id IS NOT NULL AND season_id IS NOT NULL) THEN
    DELETE FROM public.team_season_stats ts
    WHERE NOT EXISTS (
      SELECT 1 FROM public.v_team_season_agg agg
      WHERE agg.season_id = ts.season_id
        AND agg.team_id = ts.team_id
    );
  END IF;
END $cleanup$;