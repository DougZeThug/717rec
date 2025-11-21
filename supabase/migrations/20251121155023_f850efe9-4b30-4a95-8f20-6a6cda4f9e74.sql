-- Complete Fall 2025 Season Archival
-- Step 1: Delete match comment associated with Fall 2025 matches
DELETE FROM match_comments
WHERE match_id IN (
  SELECT id FROM matches 
  WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
);

-- Step 2: Delete archived matches from matches table (safely in matches_archive)
DELETE FROM matches 
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND iscompleted = true;

-- Step 3: Update team_season_stats with division names
UPDATE team_season_stats tss
SET division_name = d.name
FROM teams t
JOIN divisions d ON t.division_id = d.id
WHERE tss.season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND tss.team_id = t.id;

-- Step 4: Record playoff results for all 4 divisions

-- Competitive Division
UPDATE team_season_stats
SET champion = true, playoff_rank = 1
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '77110b92-d2d8-495b-afed-cac65deb6253'; -- Offdogs

UPDATE team_season_stats
SET runner_up = true, playoff_rank = 2
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'ad4ec289-fd85-4322-8ebb-68647607de23'; -- Cuzzo's Clinic

UPDATE team_season_stats
SET playoff_rank = 3
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'f243ccec-9f41-4899-8170-d98812373012'; -- Hole Violators

-- Intermediate 1 Division
UPDATE team_season_stats
SET champion = true, playoff_rank = 1
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '0c7261b9-db22-48d1-8487-ba9eeb90fbef'; -- Wrong Hole

UPDATE team_season_stats
SET runner_up = true, playoff_rank = 2
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '37bf909c-3bcf-45fc-860e-9f64b7b03cbe'; -- Bumbleweed

UPDATE team_season_stats
SET playoff_rank = 3
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '4ce38a7a-df7b-4d71-a17c-b8be65e342fe'; -- Sweat Bandits

-- Intermediate 2 Division
UPDATE team_season_stats
SET champion = true, playoff_rank = 1
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '01ec006b-6ee3-47b3-ac8d-f93cc11d3460'; -- Buttery Nips

UPDATE team_season_stats
SET runner_up = true, playoff_rank = 2
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'aaa86740-56e6-4482-b589-2a292f69692e'; -- Tom & Tom

UPDATE team_season_stats
SET playoff_rank = 3
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893'; -- Believers

-- Recreational Division
UPDATE team_season_stats
SET champion = true, playoff_rank = 1
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = '34b1dacf-0c30-4a4c-8228-432701868f34'; -- The Cornholy Trinity

UPDATE team_season_stats
SET runner_up = true, playoff_rank = 2
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'c577e0f9-6700-4220-a902-b368ca915bbd'; -- Here for Fireball

UPDATE team_season_stats
SET playoff_rank = 3
WHERE season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
  AND team_id = 'de3cb5fe-7c5f-4211-8876-a52140df49b7'; -- Sour Patch Kids

-- Step 5: Archive team stats to team_details_archive
INSERT INTO team_details_archive (
  season_id, team_id, name, logo_url, image_url, division_id, divisionname,
  players, created_at, wins, losses, game_wins, game_losses,
  win_percentage, game_win_percentage, weighted_win_percentage,
  weighted_game_win_percentage, sos, close_match_losses, power_score, snapshot_at
)
SELECT 
  tss.season_id,
  tss.team_id,
  t.name,
  t.logo_url,
  t.image_url,
  t.division_id,
  tss.division_name,
  t.players,
  t.created_at,
  tss.match_wins,
  tss.match_losses,
  tss.game_wins,
  tss.game_losses,
  CASE WHEN (tss.match_wins + tss.match_losses) > 0 
    THEN tss.match_wins::numeric / (tss.match_wins + tss.match_losses) 
    ELSE 0 END as win_percentage,
  CASE WHEN (tss.game_wins + tss.game_losses) > 0 
    THEN tss.game_wins::numeric / (tss.game_wins + tss.game_losses) 
    ELSE 0 END as game_win_percentage,
  NULL as weighted_win_percentage,
  NULL as weighted_game_win_percentage,
  tss.sos,
  0 as close_match_losses,
  tss.power_score,
  now() as snapshot_at
FROM team_season_stats tss
JOIN teams t ON tss.team_id = t.id
WHERE tss.season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac';

-- Step 6: Archive season and record champions
UPDATE seasons 
SET 
  is_active = false,
  is_archived = true,
  end_date = '2025-11-07',
  champion_team_id = '77110b92-d2d8-495b-afed-cac65deb6253',  -- Offdogs (Competitive)
  runner_up_team_id = 'ad4ec289-fd85-4322-8ebb-68647607de23',  -- Cuzzo's Clinic (Competitive)
  third_place_team_id = 'f243ccec-9f41-4899-8170-d98812373012', -- Hole Violators (Competitive)
  updated_at = now()
WHERE id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac';