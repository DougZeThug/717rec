
-- Link remaining Winter 1 2026 brackets to the active season
UPDATE brackets 
SET season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'
WHERE id IN (
  '428f974f-7295-410d-a3d0-d1f11280c17d',
  'dbf640b8-2f5e-4a05-8ecb-71b49aee15b0'
)
AND season_id IS NULL;

-- Refresh team_season_stats
SELECT upsert_team_season_stats();
