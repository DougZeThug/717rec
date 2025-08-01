-- Fix Baggin' & Braggin' and add Bag Babies to competitive division

-- Update Baggin' & Braggin' ranking
UPDATE team_season_stats 
SET playoff_rank = 5
WHERE season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND team_id IN (SELECT t.id FROM teams t WHERE t.name = 'Baggin'' & Braggin''');

-- Add or update Bag Babies in competitive division
INSERT INTO team_season_stats (
  season_id, team_id, division_name, playoff_rank, champion, runner_up,
  match_wins, match_losses, game_wins, game_losses
)
SELECT 
  'e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid,
  t.id,
  'Competitive',
  11,
  false,
  false,
  COALESCE(SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN m.loser_id = t.id THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(
    CASE 
      WHEN m.team1_id = t.id THEN m.team1_game_wins
      WHEN m.team2_id = t.id THEN m.team2_game_wins
      ELSE 0
    END
  ), 0),
  COALESCE(SUM(
    CASE 
      WHEN m.team1_id = t.id THEN m.team2_game_wins
      WHEN m.team2_id = t.id THEN m.team1_game_wins
      ELSE 0
    END
  ), 0)
FROM teams t
LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id) 
  AND m.season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'
  AND m.iscompleted = true
WHERE t.name = 'Bag Babies'
GROUP BY t.id, t.name
ON CONFLICT (season_id, team_id) 
DO UPDATE SET 
  division_name = 'Competitive',
  playoff_rank = 11,
  champion = false,
  runner_up = false;