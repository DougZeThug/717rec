-- Undo 20261006120000_exclude_ties_from_win_rate.sql: a tie counts in the
-- win-rate denominators again (Standings Win % and the Power Score match term).
--
-- NOT A MIGRATION. This file lives outside supabase/migrations/ on purpose: CI
-- replays every migration, and if this were one it would undo the change on
-- every run. Paste it into the Supabase SQL Editor only when you actually want
-- to go back. See docs/OPERATIONS.md section 6e.
--
-- It puts back the previous view text (copied verbatim from 20260811143013 and
-- 20260812171421), then recomputes every stored season from match history.
-- It does NOT copy scores from team_season_stats_pre_tie_exclusion: that
-- snapshot predates any match played since, and restoring it would erase
-- those ratings.
--
-- Runs in a single transaction. If any step raises, nothing is applied.
--
-- AFTER RUNNING: the migration file is still in the repo, so anyone applying
-- migrations by hand will re-apply the change. Revert the PR too.

BEGIN;

CREATE OR REPLACE VIEW public.v_team_match_stats
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
GROUP BY t.id;

GRANT SELECT ON public.v_team_match_stats TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_power_score_components
WITH (security_invoker = on) AS
SELECT
  rm.season_id,
  rm.team_id,
  COUNT(rm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN rm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN rm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(rm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(rm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT rm.opponent_id) FILTER (WHERE rm.rates) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(rm.opp_weight) FILTER (WHERE rm.rates)))
  END AS sos,
  CASE
    WHEN COALESCE(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.game_wins * rm.opp_weight) FILTER (WHERE rm.rates), 0)
         / NULLIF(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches_rated rm
GROUP BY rm.season_id, rm.team_id;

COMMENT ON VIEW public.v_power_score_components IS
  'Per-season power score inputs for every team. Feed to power_score_100(). '
  'Opponent weight is resolved as of the match date; see '
  'v_power_score_team_matches_rated. weighted_win_pct and weighted_game_win_pct '
  'are true weighted averages on a 0-1 scale, with opponent strength carried by '
  'the sos term. Matches whose opponent division cannot be determined are '
  'excluded from the three weighted terms but still count in matches_played, '
  'wins, losses, game_wins and game_losses.';

CREATE OR REPLACE VIEW public.v_power_score_components_current
WITH (security_invoker = on) AS
SELECT
  rm.team_id,
  COUNT(rm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN rm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN rm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(rm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(rm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT rm.opponent_id) FILTER (WHERE rm.rates) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(rm.opp_weight) FILTER (WHERE rm.rates)))
  END AS sos,
  CASE
    WHEN COALESCE(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.game_wins * rm.opp_weight) FILTER (WHERE rm.rates), 0)
         / NULLIF(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches_rated rm
WHERE rm.source = 'regular'
   OR (
     rm.source = 'playoff'
     AND rm.season_id = public.current_standings_season_id()
   )
GROUP BY rm.team_id;

GRANT SELECT ON public.v_power_score_components TO anon, authenticated;
GRANT SELECT ON public.v_power_score_components_current TO anon, authenticated;

-- Same recompute as the migration: every stored season, archived included.
DO $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.team_season_stats tss
  SET power_score        = agg.power_score,
      career_power_score = agg.career_power_score,
      sos                = agg.sos,
      recorded_at        = now()
  FROM public.v_team_season_agg agg
  WHERE agg.season_id = tss.season_id
    AND agg.team_id   = tss.team_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'tie exclusion reverted: % season rows recomputed', v_rows;
END $$;

COMMIT;
