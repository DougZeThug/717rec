
-- Step 1: Link Winter 1 2026 brackets to the active season
UPDATE brackets 
SET season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'
WHERE id IN (
  '428f974f-697e-40c2-95f7-418086027a0f',
  'dbf640b8-4796-484d-9654-e0c9044b7459',
  '29a823d8-47b3-489c-a9f1-ebc6586d9baf'
)
AND season_id IS NULL;

-- Step 2: Refresh team_season_stats from the view
SELECT upsert_team_season_stats();
