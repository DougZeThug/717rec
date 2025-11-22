-- Fix doubled team records by adding team_id to opponent_weights JOIN
DROP VIEW IF EXISTS public.v_team_season_agg CASCADE;

CREATE VIEW public.v_team_season_agg AS
WITH regular_season_matches AS (
  SELECT 
    'reg_' || m.id::text AS match_key,
    m.season_id,
    m.team1_id AS team_id,
    CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN m.winner_id = m.team2_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(m.team1_game_wins, 0) AS game_wins,
    COALESCE(m.team2_game_wins, 0) AS game_losses,
    m.team2_id AS opponent_id
  FROM matches m
  WHERE m.iscompleted = true
    AND m.season_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'reg_' || m.id::text AS match_key,
    m.season_id,
    m.team2_id AS team_id,
    CASE WHEN m.winner_id = m.team2_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(m.team2_game_wins, 0) AS game_wins,
    COALESCE(m.team1_game_wins, 0) AS game_losses,
    m.team1_id AS opponent_id
  FROM matches m
  WHERE m.iscompleted = true
    AND m.season_id IS NOT NULL
),
archived_season_matches AS (
  SELECT 
    'arch_' || ma.id::text AS match_key,
    ma.season_id,
    ma.team1_id AS team_id,
    CASE WHEN ma.winner_id = ma.team1_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN ma.winner_id = ma.team2_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(ma.team1_game_wins, 0) AS game_wins,
    COALESCE(ma.team2_game_wins, 0) AS game_losses,
    ma.team2_id AS opponent_id
  FROM matches_archive ma
  WHERE ma.iscompleted = true
    AND ma.season_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'arch_' || ma.id::text AS match_key,
    ma.season_id,
    ma.team2_id AS team_id,
    CASE WHEN ma.winner_id = ma.team2_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN ma.winner_id = ma.team1_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(ma.team2_game_wins, 0) AS game_wins,
    COALESCE(ma.team1_game_wins, 0) AS game_losses,
    ma.team1_id AS opponent_id
  FROM matches_archive ma
  WHERE ma.iscompleted = true
    AND ma.season_id IS NOT NULL
),
playoff_season_matches AS (
  SELECT 
    'playoff_' || pm.id::text AS match_key,
    b.season_id,
    pm.team1_id AS team_id,
    CASE WHEN pm.winner_id = pm.team1_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN pm.winner_id = pm.team2_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(pm.team1_score, 0) AS game_wins,
    COALESCE(pm.team2_score, 0) AS game_losses,
    pm.team2_id AS opponent_id
  FROM playoff_matches pm
  JOIN brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL
    AND b.season_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'playoff_' || pm.id::text AS match_key,
    b.season_id,
    pm.team2_id AS team_id,
    CASE WHEN pm.winner_id = pm.team2_id THEN 1 ELSE 0 END AS match_wins,
    CASE WHEN pm.winner_id = pm.team1_id THEN 1 ELSE 0 END AS match_losses,
    COALESCE(pm.team2_score, 0) AS game_wins,
    COALESCE(pm.team1_score, 0) AS game_losses,
    pm.team1_id AS opponent_id
  FROM playoff_matches pm
  JOIN brackets b ON pm.bracket_id = b.id
  WHERE pm.winner_id IS NOT NULL
    AND b.season_id IS NOT NULL
),
all_matches AS (
  SELECT * FROM regular_season_matches
  UNION ALL
  SELECT * FROM archived_season_matches
  UNION ALL
  SELECT * FROM playoff_season_matches
),
opponent_weights AS (
  SELECT 
    am.match_key,
    am.team_id,
    am.season_id,
    AVG(COALESCE(d.division_weight, 0.85)) AS avg_opponent_weight
  FROM all_matches am
  LEFT JOIN teams opp ON am.opponent_id = opp.id
  LEFT JOIN divisions d ON opp.division_id = d.id
  GROUP BY am.match_key, am.team_id, am.season_id
)
SELECT 
  am.team_id,
  am.season_id,
  SUM(am.match_wins)::integer AS match_wins,
  SUM(am.match_losses)::integer AS match_losses,
  SUM(am.game_wins)::integer AS game_wins,
  SUM(am.game_losses)::integer AS game_losses,
  COALESCE(AVG(ow.avg_opponent_weight), 0.85) AS sos,
  CASE 
    WHEN SUM(am.match_wins + am.match_losses) > 0 THEN
      (SUM(am.match_wins)::numeric / NULLIF(SUM(am.match_wins + am.match_losses), 0)) * COALESCE(AVG(ow.avg_opponent_weight), 0.85)
    ELSE 0
  END AS power_score
FROM all_matches am
LEFT JOIN opponent_weights ow ON am.match_key = ow.match_key AND am.team_id = ow.team_id
GROUP BY am.team_id, am.season_id;

-- Recalculate all team season stats with corrected data
SELECT public.upsert_team_season_stats();