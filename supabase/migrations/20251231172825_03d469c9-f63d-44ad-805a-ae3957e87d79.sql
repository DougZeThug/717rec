-- Targeted delete: ONLY Winter 2026 stale team_season_stats rows
-- This affects exactly 12 rows that have no corresponding matches
DELETE FROM team_season_stats 
WHERE season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';