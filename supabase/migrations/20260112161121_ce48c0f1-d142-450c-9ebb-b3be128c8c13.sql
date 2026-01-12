-- Remove orphaned team_season_stats record for The Tomato Saucers in Winter 2026
-- This team has no matches in any of the 3 match sources (matches, matches_archive, playoff_matches) for this season
DELETE FROM public.team_season_stats
WHERE team_id = 'accd6e20-f761-4769-8cdc-6c9495cc231c'
  AND season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';