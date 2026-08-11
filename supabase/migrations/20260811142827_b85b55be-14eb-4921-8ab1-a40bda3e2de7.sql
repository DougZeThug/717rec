-- Shared match source and canonical power-score formula.
--
-- Power score is currently computed in three places with three different weight
-- sets and two different definitions of its inputs, and none of them read
-- playoff results the same way:
--
--   v_team_details              40/45/15 on 0-100, division-weighted inputs, no playoffs
--   get_season_team_power_scores 40/40/20 on 0-100, division-weighted inputs, no playoffs
--   v_team_season_agg            0.40/0.45/0.15 on 0-1, plain inputs, playoffs but byes count
--
-- This migration introduces the shared pieces. Nothing reads them yet; the
-- consumers are switched over one at a time in later migrations so each change
-- can be verified on its own.

-- ---------------------------------------------------------------------------
-- 1. One row per completed match, from every source that holds one.
--
-- Column names deliberately mirror public.matches so the existing consumers can
-- swap their join target without any of the surrounding arithmetic changing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_match_source
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.season_id,
  m.team1_id,
  m.team2_id,
  -- Left raw, not coalesced: the regular-season half must stay byte-equivalent
  -- to what the current consumers already compute.
  m.team1_game_wins,
  m.team2_game_wins,
  m.winner_id,
  m.loser_id,
  'regular'::text AS source
FROM public.matches m
WHERE m.iscompleted = true
  AND m.season_id IS NOT NULL

UNION ALL

SELECT
  ma.id,
  ma.season_id,
  ma.team1_id,
  ma.team2_id,
  ma.team1_game_wins,
  ma.team2_game_wins,
  ma.winner_id,
  ma.loser_id,
  'archived'::text AS source
FROM public.matches_archive ma
WHERE ma.iscompleted = true
  AND ma.season_id IS NOT NULL

UNION ALL

SELECT
  pm.id,
  b.season_id,
  pm.team1_id,
  pm.team2_id,
  -- playoff_matches.team1_score/team2_score hold GAME WINS, the same unit as
  -- matches.team1_game_wins/team2_game_wins.
  COALESCE(pm.team1_score, 0) AS team1_game_wins,
  COALESCE(pm.team2_score, 0) AS team2_game_wins,
  pm.winner_id,
  pm.loser_id,
  'playoff'::text AS source
FROM public.playoff_matches pm
JOIN public.brackets b ON b.id = pm.bracket_id
WHERE pm.winner_id IS NOT NULL
  -- Bye exclusion: a bye is a row with a winner and no opponent. Counting one
  -- hands the team a free win, which is what v_team_season_agg does today.
  AND pm.team1_id IS NOT NULL
  AND pm.team2_id IS NOT NULL
  AND b.season_id IS NOT NULL;

COMMENT ON VIEW public.v_power_score_match_source IS
  'Every completed match across matches, matches_archive and playoff_matches, '
  'shaped like public.matches. Playoff byes are excluded. Canonical input for power score.';

-- ---------------------------------------------------------------------------
-- 2. The "current" scope, which is what v_team_details represents.
--
-- v_team_details has no season filter and relies on old seasons having been moved
-- into matches_archive. brackets/playoff_matches are not archived that way, so the
-- playoff half has to be restricted to one season explicitly or every past
-- season's bracket would leak into the live standings.
--
-- Which season that is needs a little care. partial_archive_season clears
-- is_active and sets playoffs_active, so between the regular season being archived
-- and the playoffs being finalized there is no active season at all — and a plain
-- is_active lookup would drop the bracket exactly when the bracket is the only
-- thing happening. Active season first, so that a newly activated season keeps the
-- outgoing season's bracket out of its own standings; the playoffs-active season
-- only as the fallback.
--
-- Note this is the opposite order from usePlayoffPageData, deliberately. That page
-- is showing the bracket, so it prefers the season still playing one; the standings
-- describe whichever season is currently being played, which is the new one as soon
-- as it exists. Matches fetchRankingsData.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_standings_season_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1),
    (SELECT id FROM public.seasons WHERE playoffs_active = true LIMIT 1)
  );
$$;

COMMENT ON FUNCTION public.current_standings_season_id() IS
  'The season the live standings describe: the active season, falling back to the '
  'season whose playoffs are still running after a partial archive.';

CREATE OR REPLACE VIEW public.v_power_score_match_source_current
WITH (security_invoker = on) AS
SELECT *
FROM public.v_power_score_match_source
WHERE source = 'regular'
   OR (
     source = 'playoff'
     AND season_id = public.current_standings_season_id()
   );

COMMENT ON VIEW public.v_power_score_match_source_current IS
  'v_power_score_match_source limited to the live season: all regular-season rows '
  'plus playoff rows for the current standings season only.';

-- ---------------------------------------------------------------------------
-- 3. The canonical formula. The only place these weights are defined.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.power_score_100(
  p_weighted_win_pct numeric,
  p_sos numeric,
  p_weighted_game_win_pct numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (COALESCE(p_weighted_win_pct, 0)      * 40.0)
       + (COALESCE(p_sos, 0.5)                 * 45.0)
       + (COALESCE(p_weighted_game_win_pct, 0) * 15.0);
$$;

COMMENT ON FUNCTION public.power_score_100(numeric, numeric, numeric) IS
  'Canonical power score on a 0-100 scale: 40% weighted win rate, 45% strength of '
  'schedule, 15% weighted game win rate. Divide by 100 for the 0-1 storage scale '
  'used by team_season_stats.';

-- ---------------------------------------------------------------------------
-- 4. Per-team, per-season components, unpivoted so each match contributes one
--    row per participant. Same definitions v_team_details already uses, so teams
--    with no playoff games keep exactly the score they have today.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_team_matches
WITH (security_invoker = on) AS
SELECT
  src.id AS match_id,
  src.season_id,
  src.source,
  src.team1_id AS team_id,
  src.team2_id AS opponent_id,
  (src.winner_id = src.team1_id) AS is_win,
  (src.winner_id IS NOT NULL AND src.winner_id <> src.team1_id) AS is_loss,
  COALESCE(src.team1_game_wins, 0) AS game_wins,
  COALESCE(src.team2_game_wins, 0) AS game_losses
FROM public.v_power_score_match_source src
WHERE src.team1_id IS NOT NULL

UNION ALL

SELECT
  src.id,
  src.season_id,
  src.source,
  src.team2_id,
  src.team1_id,
  (src.winner_id = src.team2_id),
  (src.winner_id IS NOT NULL AND src.winner_id <> src.team2_id),
  COALESCE(src.team2_game_wins, 0),
  COALESCE(src.team1_game_wins, 0)
FROM public.v_power_score_match_source src
WHERE src.team2_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_power_score_components
WITH (security_invoker = on) AS
SELECT
  tm.season_id,
  tm.team_id,
  COUNT(tm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN tm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN tm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(tm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(tm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COUNT(tm.match_id) = 0 THEN 0
    ELSE SUM(CASE WHEN tm.is_win THEN d_opp.division_weight ELSE 0 END)
         / NULLIF(COUNT(tm.match_id), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT t_opp.id) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
  END AS sos,
  CASE
    WHEN COALESCE(SUM(tm.game_wins + tm.game_losses), 0) = 0 THEN 0
    ELSE SUM(tm.game_wins * d_opp.division_weight)
         / NULLIF(SUM(tm.game_wins + tm.game_losses), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches tm
LEFT JOIN public.teams t_opp ON t_opp.id = tm.opponent_id
LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
GROUP BY tm.season_id, tm.team_id;

COMMENT ON VIEW public.v_power_score_components IS
  'Per-season power score inputs for every team. Feed to power_score_100().';

-- The same components over the live-season scope, with no season grouping, for
-- v_team_details.
CREATE OR REPLACE VIEW public.v_power_score_components_current
WITH (security_invoker = on) AS
SELECT
  tm.team_id,
  COUNT(tm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN tm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN tm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(tm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(tm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COUNT(tm.match_id) = 0 THEN 0
    ELSE SUM(CASE WHEN tm.is_win THEN d_opp.division_weight ELSE 0 END)
         / NULLIF(COUNT(tm.match_id), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT t_opp.id) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
  END AS sos,
  CASE
    WHEN COALESCE(SUM(tm.game_wins + tm.game_losses), 0) = 0 THEN 0
    ELSE SUM(tm.game_wins * d_opp.division_weight)
         / NULLIF(SUM(tm.game_wins + tm.game_losses), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches tm
LEFT JOIN public.teams t_opp ON t_opp.id = tm.opponent_id
LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
WHERE tm.source = 'regular'
   OR (
     tm.source = 'playoff'
     AND tm.season_id = public.current_standings_season_id()
   )
GROUP BY tm.team_id;

COMMENT ON VIEW public.v_power_score_components_current IS
  'v_power_score_components over the live season only, ungrouped by season, for v_team_details.';

GRANT SELECT ON public.v_power_score_match_source TO anon, authenticated;
GRANT SELECT ON public.v_power_score_match_source_current TO anon, authenticated;
GRANT SELECT ON public.v_power_score_team_matches TO anon, authenticated;
GRANT SELECT ON public.v_power_score_components TO anon, authenticated;
GRANT SELECT ON public.v_power_score_components_current TO anon, authenticated;