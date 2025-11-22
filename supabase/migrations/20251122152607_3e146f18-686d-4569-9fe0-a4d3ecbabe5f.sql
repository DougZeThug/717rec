-- Fix Summer 2 playoff brackets assigned to wrong season
UPDATE brackets 
SET season_id = 'd50bb12e-99be-4170-802a-695a402373ce'  -- Summer 2 2025
WHERE title ILIKE '%summer 2%'
  AND season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';  -- Currently Summer 1 2025

-- Recalculate team season stats to include playoff data
SELECT public.upsert_team_season_stats();