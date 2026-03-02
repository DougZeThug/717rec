
-- =============================================================
-- Fix 3 unscored Competitive playoff matches for Winter 1 2026
-- and correct team_season_stats accordingly
-- =============================================================

-- 1. Score: Offdogs beat Jager Bombers 2-0 (Winners R4)
UPDATE playoff_matches SET
  winner_id = '77110b92-d2d8-495b-afed-cac65deb6253',
  loser_id = 'b214167b-7f7e-4470-a811-bf2a093c9620',
  team1_score = 0, team2_score = 2,
  status = 'completed'
WHERE id = '1b74e515-43f4-491b-a7cd-359d89899c48';

-- 2. Score: Cuzzo's Clinic beat Bag Babies 2-0 (Losers R4)
UPDATE playoff_matches SET
  winner_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',
  loser_id = '626be920-071d-4aea-a1f5-1819893215ca',
  team1_score = 2, team2_score = 0,
  status = 'completed'
WHERE id = '6ae7ec84-79c3-41d0-a1e9-83a7bb9d575e';

-- 3. Score: Seize the Maize beat Pepperoni Cheesers 2-0 (Losers R4)
UPDATE playoff_matches SET
  winner_id = '8c5adea2-09b7-4298-83dc-295dae74fdb8',
  loser_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35',
  team1_score = 0, team2_score = 2,
  status = 'completed'
WHERE id = 'b376b6cc-45a8-4e30-9ee2-3131d2fb8f6a';

-- 4. Fix team_season_stats for the 6 affected teams
-- Winter 1 2026 season_id: 4b90a1d8-b90a-4e47-8e8c-b89a7b54e106

-- Offdogs: +1 win, +2 game wins
UPDATE team_season_stats SET
  match_wins = 13, game_wins = 27
WHERE team_id = '77110b92-d2d8-495b-afed-cac65deb6253'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Jager Bombers: +1 loss, +2 game losses
UPDATE team_season_stats SET
  match_losses = 2, game_losses = 5
WHERE team_id = 'b214167b-7f7e-4470-a811-bf2a093c9620'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Cuzzo's Clinic: +1 win, +2 game wins
UPDATE team_season_stats SET
  match_wins = 16, game_wins = 33
WHERE team_id = 'ad4ec289-fd85-4322-8ebb-68647607de23'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Bag Babies: +1 loss, +2 game losses, rank 8→5
UPDATE team_season_stats SET
  match_losses = 5, game_losses = 11, playoff_rank = 5
WHERE team_id = '626be920-071d-4aea-a1f5-1819893215ca'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Seize the Maize: +1 win, +2 game wins
UPDATE team_season_stats SET
  match_wins = 8, game_wins = 20
WHERE team_id = '8c5adea2-09b7-4298-83dc-295dae74fdb8'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Pepperoni Cheesers: +1 loss, +2 game losses
UPDATE team_season_stats SET
  match_losses = 6, game_losses = 14
WHERE team_id = 'c9d644a4-4e5a-43a0-9805-9d93299cda35'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- 5. Fix playoff ranks for non-involved teams
-- Came from Dicks: 6→7
UPDATE team_season_stats SET playoff_rank = 7
WHERE team_id = 'af3bf12d-b671-4458-9d3c-5c2e29e362ac'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- Birds of Prey: 6→7
UPDATE team_season_stats SET playoff_rank = 7
WHERE team_id = '831c8441-2b8b-4512-8f09-9701062a6648'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';

-- 3 Amigos: 8→9
UPDATE team_season_stats SET playoff_rank = 9
WHERE team_id = '9ee2b996-99f6-446c-be20-8255ca75d8c8'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';
