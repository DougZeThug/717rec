-- Let the admin formula controls write archived seasons again.
--
-- 20260812130000 froze power_score, sos and division_name for archived seasons,
-- so that changing a division or re-weighting one could no longer rewrite
-- finished history. That guard is right for routine writes -- match finalize,
-- live-score finalize, score resubmit, archive -- but it is wrong for the two
-- controls whose entire job is to change the formula:
--
--   admin_revert_power_score_unification()
--   admin_reapply_power_score_unification()
--
-- Both end with PERFORM public.upsert_team_season_stats() (see
-- 20260811143430_..., lines 681 and 900). Under the freeze those calls became a
-- no-op for every archived season, so the control reported success while
-- History and Career kept the previous formula. A silent failure, and worse than
-- an error: the admin has no way to tell.
--
-- Fix: upsert_team_season_stats() takes an explicit opt-in. The DEFAULT false
-- keeps all ~20 existing zero-argument call sites behaving exactly as they do
-- now, so the freeze still holds everywhere it should. Only the two formula
-- controls pass true.
--
-- The two control functions below are reproduced verbatim from
-- pg_get_functiondef() against a fully migrated database. Exactly one line
-- changes in each -- the upsert call -- which is verified by diffing the
-- extracted original against this file. They are long and mechanical; do not
-- hand-edit them beyond that line.

-- ---------------------------------------------------------------------------
-- 1. The opt-in parameter.
--
-- DROP first: adding a defaulted parameter creates a NEW function rather than
-- replacing the old one, and leaving both would make every existing
-- upsert_team_season_stats() call ambiguous.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.upsert_team_season_stats();

CREATE OR REPLACE FUNCTION public.upsert_team_season_stats(
  p_include_archived boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     sos, power_score, division_name, recorded_at)
  SELECT
    season_id, team_id, match_wins::integer, match_losses::integer,
    game_wins::integer, game_losses::integer, sos, power_score,
    division_name,
    now()
  FROM v_team_season_agg
  WHERE team_id IS NOT NULL
    AND season_id IS NOT NULL
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins   = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins    = EXCLUDED.game_wins,
    game_losses  = EXCLUDED.game_losses,
    -- Archived seasons are immutable for routine writes, so a present-day
    -- division or weight edit cannot rewrite finished history. p_include_archived
    -- is the deliberate exception, used by the formula controls and by
    -- admin_recompute_season_power().
    sos = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.sos
      ELSE EXCLUDED.sos
    END,
    power_score = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.power_score
      ELSE EXCLUDED.power_score
    END,
    division_name = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.division_name
      ELSE EXCLUDED.division_name
    END,
    recorded_at  = now();
END;
$$;

COMMENT ON FUNCTION public.upsert_team_season_stats(boolean) IS
  'Propagates v_team_season_agg into team_season_stats. Archived seasons are '
  'frozen for division_name, power_score and sos unless p_include_archived is '
  'true, which only the formula controls pass.';

-- ---------------------------------------------------------------------------
-- 2. The two formula controls, reproduced verbatim except for the upsert call.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_revert_power_score_unification()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $functionx$
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

  -- Formula change: must reach archived seasons too, or this control silently
  -- reports success while History and Career keep the previous formula.
  PERFORM public.upsert_team_season_stats(true);
  PERFORM public.prune_team_season_stats_not_in_agg();

  RETURN 'reverted';
END;
$functionx$

;

CREATE OR REPLACE FUNCTION public.admin_reapply_power_score_unification()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $functionx$
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

  -- Formula change: must reach archived seasons too, or this control silently
  -- reports success while History and Career keep the previous formula.
  PERFORM public.upsert_team_season_stats(true);
  PERFORM public.prune_team_season_stats_not_in_agg();

  RETURN 'applied';
END;
$functionx$

;