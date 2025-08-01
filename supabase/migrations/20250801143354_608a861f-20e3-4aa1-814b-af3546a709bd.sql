-- Fix Summer 1 2025 team season stats and champions

-- First, recalculate team season stats from actual match data for Summer 1 2025
WITH summer_stats AS (
  SELECT 
    t.id as team_id,
    'e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid as season_id,
    COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0) as match_wins,
    COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0) as match_losses,
    COALESCE(SUM(
      CASE 
        WHEN m.team1_id = t.id THEN m.team1_game_wins
        WHEN m.team2_id = t.id THEN m.team2_game_wins
        ELSE 0
      END
    ), 0) as game_wins,
    COALESCE(SUM(
      CASE 
        WHEN m.team1_id = t.id THEN m.team2_game_wins
        WHEN m.team2_id = t.id THEN m.team1_game_wins
        ELSE 0
      END
    ), 0) as game_losses,
    -- Map division names for history display
    CASE 
      WHEN d.name IN ('Competitive', 'Competitive Low') THEN 'Competitive'
      WHEN d.name = 'Intermediate High' THEN 'Intermediate High'
      WHEN d.name = 'Intermediate' THEN 'Intermediate Low'
      WHEN d.name LIKE '%Recreational%' THEN 'Recreational'
      ELSE d.name
    END as division_name
  FROM teams t
  LEFT JOIN divisions d ON t.division_id = d.id
  LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) 
    AND m.season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
    AND m.iscompleted = true
  WHERE t.id NOT IN (
    SELECT team_id FROM team_season_opt_out 
    WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  )
  GROUP BY t.id, d.name
)
INSERT INTO team_season_stats (
  season_id, team_id, match_wins, match_losses, game_wins, game_losses, 
  division_name, champion, runner_up, playoff_rank
)
SELECT 
  season_id, team_id, match_wins, match_losses, game_wins, game_losses,
  division_name,
  -- Mark the four champions
  CASE 
    WHEN team_id IN (
      'ad4ec289-fd85-4322-8ebb-68647607de23', -- Cuzzo's Clinic
      'c9d644a4-4e5a-43a0-9805-9d93299cda35', -- Pepperoni Cheesers  
      '2ab2e684-8c28-45c3-801a-ea215433a8e4', -- Miracle @ Marion
      'c577e0f9-6700-4220-a902-b368ca915bbd'  -- Here for Fireball
    ) THEN true
    ELSE false
  END as champion,
  false as runner_up,
  -- Set playoff rank 1 for champions
  CASE 
    WHEN team_id IN (
      'ad4ec289-fd85-4322-8ebb-68647607de23',
      'c9d644a4-4e5a-43a0-9805-9d93299cda35',
      '2ab2e684-8c28-45c3-801a-ea215433a8e4',
      'c577e0f9-6700-4220-a902-b368ca915bbd'
    ) THEN 1
    ELSE NULL
  END as playoff_rank
FROM summer_stats
ON CONFLICT (season_id, team_id) 
DO UPDATE SET 
  match_wins = EXCLUDED.match_wins,
  match_losses = EXCLUDED.match_losses,
  game_wins = EXCLUDED.game_wins,
  game_losses = EXCLUDED.game_losses,
  division_name = EXCLUDED.division_name,
  champion = EXCLUDED.champion,
  runner_up = EXCLUDED.runner_up,
  playoff_rank = EXCLUDED.playoff_rank,
  recorded_at = NOW();

-- Calculate and update power scores and SOS for Summer 1 2025
SELECT upsert_team_season_stats();