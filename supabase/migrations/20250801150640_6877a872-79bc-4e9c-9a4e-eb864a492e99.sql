-- Add Tag'em and Bag'em to Intermediate High division for Summer 1 2025
INSERT INTO team_season_stats (
  season_id, 
  team_id, 
  division_name, 
  playoff_rank, 
  champion, 
  runner_up,
  match_wins,
  match_losses,
  game_wins,
  game_losses
) VALUES (
  'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
  '8aef742f-f7d7-4996-a2bb-96a430b5e005',
  'Intermediate High',
  4,
  false,
  false,
  0,
  0,
  0,
  0
) ON CONFLICT (season_id, team_id) 
DO UPDATE SET 
  division_name = 'Intermediate High',
  playoff_rank = 4,
  champion = false,
  runner_up = false;