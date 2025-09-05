-- Update v_head_to_head view to include playoff matches
DROP VIEW IF EXISTS public.v_head_to_head;

CREATE VIEW public.v_head_to_head AS
WITH all_matches AS (
  -- Regular season matches
  SELECT 
    m.id,
    m.team1_id,
    m.team2_id, 
    m.winner_id,
    m.loser_id,
    m.team1_game_wins,
    m.team2_game_wins,
    m.date as match_date,
    'regular' as match_type
  FROM public.matches m
  WHERE m.iscompleted = true
  
  UNION ALL
  
  -- Playoff matches  
  SELECT
    pm.id,
    pm.team1_id,
    pm.team2_id,
    pm.winner_id,
    pm.loser_id,
    -- Calculate game wins from playoff_games if available, otherwise use scores
    COALESCE(
      (SELECT COUNT(*) FROM public.playoff_games pg 
       WHERE pg.match_id = pm.id AND 
       ((pm.team1_id = pm.winner_id AND pg.winner_id = pm.team1_id) OR 
        (pm.team2_id = pm.winner_id AND pg.winner_id = pm.team2_id AND pg.winner_id = pm.team1_id))),
      CASE WHEN pm.winner_id = pm.team1_id THEN pm.team1_score ELSE 0 END
    ) as team1_game_wins,
    COALESCE(
      (SELECT COUNT(*) FROM public.playoff_games pg 
       WHERE pg.match_id = pm.id AND 
       ((pm.team1_id = pm.loser_id AND pg.winner_id = pm.team2_id) OR 
        (pm.team2_id = pm.loser_id AND pg.winner_id = pm.team1_id))),
      CASE WHEN pm.winner_id = pm.team2_id THEN pm.team2_score ELSE 0 END
    ) as team2_game_wins,
    pm.created_at as match_date,
    'playoff' as match_type
  FROM public.playoff_matches pm
  WHERE pm.winner_id IS NOT NULL
),
team_matchups AS (
  SELECT 
    team1_id as team_id,
    team2_id as opponent_id,
    CASE WHEN winner_id = team1_id THEN 1 ELSE 0 END as wins,
    CASE WHEN loser_id = team1_id THEN 1 ELSE 0 END as losses,
    COALESCE(team1_game_wins, 0) as game_wins,
    COALESCE(team2_game_wins, 0) as game_losses,
    match_date
  FROM all_matches
  WHERE team1_id IS NOT NULL AND team2_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    team2_id as team_id,
    team1_id as opponent_id,
    CASE WHEN winner_id = team2_id THEN 1 ELSE 0 END as wins,
    CASE WHEN loser_id = team2_id THEN 1 ELSE 0 END as losses,
    COALESCE(team2_game_wins, 0) as game_wins,
    COALESCE(team1_game_wins, 0) as game_losses,
    match_date
  FROM all_matches
  WHERE team1_id IS NOT NULL AND team2_id IS NOT NULL
)
SELECT 
  tm.team_id,
  tm.opponent_id,
  COUNT(*) as matches_played,
  SUM(tm.wins) as wins,
  SUM(tm.losses) as losses,
  SUM(tm.game_wins) as game_wins,
  SUM(tm.game_losses) as game_losses,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND(SUM(tm.wins)::numeric / COUNT(*)::numeric, 3)
    ELSE 0 
  END as win_pct,
  MAX(tm.match_date) as last_played_at
FROM team_matchups tm
GROUP BY tm.team_id, tm.opponent_id
HAVING COUNT(*) > 0;