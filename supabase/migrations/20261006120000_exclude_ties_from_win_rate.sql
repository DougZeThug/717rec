-- A tie does not count in Win % or in the Power Score match-win term.
--
-- Doug's rule (2026-10-06, docs/agents/LEAGUE_CONTEXT.md): Win % = W / (W + L).
-- A completed match with no winner (a tie) is left out of both the top and the
-- bottom. History and Career already did this; the Standings Win % and the
-- Power Score match term divided by every completed match, so a tie read as a
-- loss there.
--
-- Changed, and nothing else:
--   * v_team_match_stats.win_percentage: wins / (wins + losses), 0 when a team
--     has no win and no loss (only ties, or no matches).
--   * weighted_win_pct in v_power_score_components and
--     v_power_score_components_current: the denominator counts only rated
--     matches with a winner. 0 when there are none.
--
-- Not changed: the game-win term and SOS (tied games were still played, and the
-- opponent was still faced), wins, losses, matches_played, and the dead column
-- v_team_match_stats.weighted_win_percentage. upsert_team_season_stats,
-- v_power_score_team_matches_rated and the 2026-10-03 grant lockdown are not
-- touched.
--
-- Each view body is copied verbatim from its latest definition
-- (v_team_match_stats from 20260811143013, both component views from
-- 20260812171421) with only the expressions above edited. Column names, order
-- and types are identical, so CREATE OR REPLACE keeps every dependent view.
--
-- Archived seasons change on purpose (Doug: "fine if they change"). The
-- recompute at the foot of this file refreshes every stored season.
--
-- Run supabase/scripts/backup_before_tie_exclusion.sql first. To undo, run
-- supabase/scripts/revert_tie_exclusion.sql. See docs/OPERATIONS.md section 6e.
--
-- KNOWN GAP: the section 6a Revert / Re-apply controls rebuild these views from
-- text saved in 20260812171710. Pressing either one puts the old tie rule back.

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
  CASE WHEN COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) = 0 THEN 0
       ELSE COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)::numeric
            / NULLIF(COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0)
                     + COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0), 0)
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
    WHEN COALESCE(SUM(rm.opp_weight)
                  FILTER (WHERE rm.rates AND (rm.is_win IS TRUE OR rm.is_loss IS TRUE)), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight)
                  FILTER (WHERE rm.rates AND (rm.is_win IS TRUE OR rm.is_loss IS TRUE)), 0)
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
    WHEN COALESCE(SUM(rm.opp_weight)
                  FILTER (WHERE rm.rates AND (rm.is_win IS TRUE OR rm.is_loss IS TRUE)), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight)
                  FILTER (WHERE rm.rates AND (rm.is_win IS TRUE OR rm.is_loss IS TRUE)), 0)
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

-- ---------------------------------------------------------------------------
-- Recompute every stored season, archived ones included. Same UPDATE as
-- admin_recompute_season_power() (20260820120000), without its season filter.
-- upsert_team_season_stats() is not called: it is frozen for archived seasons
-- and writes more columns than this change needs.
-- ---------------------------------------------------------------------------
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
  RAISE NOTICE 'ties excluded from win rate: % season rows recomputed', v_rows;
END $$;
