-- Delete orphaned team_season_stats for Winter 2026 season
-- These records remain from matches that were deleted
DELETE FROM public.team_season_stats 
WHERE season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';