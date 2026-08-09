-- Put per-season stats on the canonical formula, and stop counting byes.
--
-- Two defects close here:
--
--   1. Byes counted as wins. The playoff CTE this view used matched on
--      winner_id IS NOT NULL without requiring an opponent, so a bye -- a row
--      with a winner and no team2 -- handed the team a free win and a free match.
--   2. The formula disagreed with everything else. This view used plain win rate
--      where v_team_details and get_season_team_power_scores use division-weighted
--      win rate, so the same season produced different ratings depending on which
--      page you were looking at.
--
-- WHAT THIS CHANGES, AND IT IS NOT SMALL:
--
-- Division-weighted win rate scales a team's wins by their opponents' division
-- weight, so historical ratings fall for teams outside the Competitive division
-- and Career Rankings re-order. Every surface built on team_season_stats.power_score
-- moves: the History page numbers and row ordering, career rankings, season
-- breakdowns and trend badges, match predictions, team report cards and league
-- percentiles, and CSV export.
--
-- This cannot be limited to recent seasons. upsert_team_season_stats() takes no
-- season parameter and re-derives every season from this view, and it runs on
-- every match finalize, live-score finalize, score resubmit and archive. Once the
-- view changes, all history follows on the next write regardless. Propagating it
-- here deliberately is what keeps the database from sitting half-updated.
--
-- The previous values are in team_season_stats_pre_unification; see migration
-- 20260809121000 for the restore statement.
--
-- win_percentage and game_win_percentage are deliberately left as plain,
-- unweighted rates. They are not persisted by upsert_team_season_stats(), and
-- changing them would widen the blast radius for no benefit.

DROP VIEW IF EXISTS public.v_team_season_agg;

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
  -- Canonical formula, divided by 100 to keep the 0-1 storage scale that
  -- team_season_stats.power_score and normalizePowerScore depend on.
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
  ON tda.team_id = c.team_id AND tda.season_id = c.season_id;

COMMENT ON VIEW public.v_team_season_agg IS
  'Per-season team stats from the canonical match source and formula. Playoff '
  'results count, byes do not. power_score is on the 0-1 scale.';

GRANT SELECT ON public.v_team_season_agg TO anon, authenticated;

-- Propagate to the stored per-season rows now, rather than leaving the database
-- half-updated until the next match finalize triggers it anyway.
SELECT public.upsert_team_season_stats();
