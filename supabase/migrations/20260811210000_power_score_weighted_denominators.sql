-- Restore the weighted denominators, and stop Hidden teams affecting ratings.
--
-- DEFECT 1: division weight was counted three times instead of once.
--
-- 20260809120000 made the win rate division-weighted. It put the opponent's
-- division weight in the numerator but left the denominator as a plain match
-- count:
--
--   SUM(win * opp_weight) / COUNT(matches)      <- what it did
--   SUM(win * opp_weight) / SUM(opp_weight)     <- what a weighted average is
--
-- The same slip landed in weighted_game_win_pct, where the weight multiplied
-- the numerator but not the games in the denominator.
--
-- The effect is not a mild deflation. Because both performance terms are
-- silently scaled by opponent strength on top of the 45% strength-of-schedule
-- term, a team's total is capped at 100 * (average opponent division weight):
--
--   Competitive Low (0.925)  ->  max 92.5, min 41.6
--   Intermediate High (0.85) ->  max 85.0, min 38.3
--   Recreational High (0.50) ->  max 50.0, min 22.5
--
-- An undefeated Recreational team could not score above 50.0. Worse, results
-- lost to schedule: a 4-10 Competitive team outranked an 8-8 Intermediate team,
-- and a 16-2 team sat below a 12-2 team.
--
-- Restoring the weighted denominators puts both performance terms back on a
-- true 0-1 scale. Strength of schedule is NOT weakened by this:
--
--   * The 45% SOS term is untouched. A harder schedule still adds up to 45
--     points and a soft one as few as 4.5.
--   * Inside weighted_win_pct, a win over a 0.925 opponent still contributes
--     nearly twice what a win over a 0.50 opponent does. Only the scale is
--     normalised, so beating your whole schedule reads as 1.0 whoever it was.
--
-- Two 10-5 teams, before and after:
--
--                        win%      SOS       game%     total
--   Competitive       26.7      41.6      9.0      77.3
--   Recreational      26.7      22.5      9.0      58.2
--
-- A 19-point gap for the harder schedule, which is the point of the metric.
--
-- DEFECT 2: the Hidden division carries division_weight = -1.0.
--
-- Seeded by 20250807125135 as a sentinel for teams that must not appear in the
-- frontend. Nothing excluded Hidden teams from the rating maths, so a NEGATIVE
-- weight flowed into every term. Beating a Hidden team subtracted from the
-- winner's weighted win total -- a win that made the score go down.
--
-- Matches against Hidden teams now drop out of all three weighted terms, in
-- both the numerator and the denominator, so they neither help nor hurt. The
-- -1.0 weight is deliberately left in place: it is a sentinel, and leaving it
-- means this filter fails loudly rather than silently if it is ever removed.
--
-- W-L RECORDS ARE NOT TOUCHED. matches_played, wins, losses, game_wins and
-- game_losses keep counting every match, including Hidden ones. Only the three
-- weighted rating terms filter. This matters because v_team_season_agg reads
-- c.wins / c.losses for match_wins / match_losses on the History page, and a
-- blanket WHERE clause here would silently rewrite historical records.
--
-- ALSO: an opponent with no division row now defaults to 0.85 in all three
-- terms. It already did in SOS. In the other two the raw NULL weight was
-- dropped by SUM while the match still counted in the denominator, deflating
-- the score -- the same class of bug as defect 1, on a rarer path.
--
-- Expected movement: the realistic league range widens from about 27-92.5 to
-- about 22-97, and the 85+ "elite" colour band becomes reachable for the first
-- time. Cuzzo's Clinic (16-2) passes Baggin' & Braggin' (12-2); The
-- Undigestibles (8-8) passes 3 Amigos (4-10). Both corrections.
--
-- The 40/45/15 weights in power_score_100() are unchanged and correct.

-- ---------------------------------------------------------------------------
-- Per-season components.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_components
WITH (security_invoker = on) AS
WITH rm AS (
  SELECT
    tm.season_id,
    tm.team_id,
    tm.match_id,
    tm.source,
    tm.is_win,
    tm.is_loss,
    tm.game_wins,
    tm.game_losses,
    t_opp.id AS opponent_id,
    COALESCE(d_opp.division_weight, 0.85) AS opp_weight,
    (COALESCE(d_opp.display_division, '') NOT ILIKE 'hidden%') AS rates
  FROM public.v_power_score_team_matches tm
  LEFT JOIN public.teams t_opp ON t_opp.id = tm.opponent_id
  LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
)
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
FROM rm
GROUP BY rm.season_id, rm.team_id;

COMMENT ON VIEW public.v_power_score_components IS
  'Per-season power score inputs for every team. Feed to power_score_100(). '
  'weighted_win_pct and weighted_game_win_pct are true weighted averages on a '
  '0-1 scale; opponent strength is carried by the sos term. Matches against '
  'Hidden-division teams are excluded from the three weighted terms but still '
  'count in matches_played, wins, losses, game_wins and game_losses.';

-- ---------------------------------------------------------------------------
-- The same components over the live-season scope, ungrouped, for v_team_details.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_components_current
WITH (security_invoker = on) AS
WITH rm AS (
  SELECT
    tm.season_id,
    tm.team_id,
    tm.match_id,
    tm.source,
    tm.is_win,
    tm.is_loss,
    tm.game_wins,
    tm.game_losses,
    t_opp.id AS opponent_id,
    COALESCE(d_opp.division_weight, 0.85) AS opp_weight,
    (COALESCE(d_opp.display_division, '') NOT ILIKE 'hidden%') AS rates
  FROM public.v_power_score_team_matches tm
  LEFT JOIN public.teams t_opp ON t_opp.id = tm.opponent_id
  LEFT JOIN public.divisions d_opp ON d_opp.id = t_opp.division_id
  WHERE tm.source = 'regular'
     OR (
       tm.source = 'playoff'
       AND tm.season_id = public.current_standings_season_id()
     )
)
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
FROM rm
GROUP BY rm.team_id;

COMMENT ON VIEW public.v_power_score_components_current IS
  'v_power_score_components over the live season only, ungrouped by season, for v_team_details.';

-- v_team_details is deliberately NOT changed here. Hidden teams keep a computed
-- score in the view because several surfaces fetch them on purpose --
-- useTeamsQuery({ includeHidden: true }), useCareerRankingsWithHidden and the
-- admin power-migration comparison all expect a number. Hiding them from the
-- public standings is a read-layer concern and is handled in the MCP tools,
-- which read team_season_stats rather than this view.

-- ---------------------------------------------------------------------------
-- Propagate to the stored per-season rows now, rather than leaving the database
-- half-updated until the next match finalize triggers it anyway. Same call the
-- unification migration ends with.
-- ---------------------------------------------------------------------------
SELECT public.upsert_team_season_stats();
