-- Fix Fall 2025 playoff bracket season assignments
-- Update all brackets with "Fall 2025" in title to correct season
UPDATE brackets 
SET season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'  -- Fall 2025 season
WHERE title ILIKE '%fall 2025%'
  AND season_id = 'e537c594-3ba9-4d79-ba63-f6ed90c89e30';  -- Currently incorrect Summer 1 2025

-- Recalculate all team season stats to include playoff matches
SELECT public.upsert_team_season_stats();