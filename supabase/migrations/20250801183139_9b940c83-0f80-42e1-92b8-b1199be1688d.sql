-- Create new season "Summer 2 2025" and transition from previous season
-- This migration handles the complete season transition process

-- Step 1: Create the new season (will automatically become active due to trigger)
INSERT INTO public.seasons (name, start_date, is_active, is_archived)
VALUES ('Summer 2 2025', CURRENT_DATE, true, false);

-- Step 2: Archive any unfinished matches from previous seasons
-- Move incomplete matches to archive table
INSERT INTO public.matches_archive (
  id, team1_id, team2_id, winner_id, loser_id, team1_score, team2_score,
  team1_game_wins, team2_game_wins, round_number, bracket_id, season_id,
  iscompleted, date, location, metadata, match_type, position,
  next_match_id, next_loser_match_id, best_of, created_at, archived_at
)
SELECT 
  id, team1_id, team2_id, winner_id, loser_id, team1_score, team2_score,
  team1_game_wins, team2_game_wins, round_number, bracket_id, season_id,
  iscompleted, date, location, metadata, match_type, position,
  next_match_id, next_loser_match_id, best_of, created_at, now()
FROM public.matches
WHERE iscompleted = false OR iscompleted IS NULL;

-- Delete the archived incomplete matches from active matches table
DELETE FROM public.matches 
WHERE iscompleted = false OR iscompleted IS NULL;

-- Step 3: Reset team seeds for fresh playoff seeding
UPDATE public.teams SET seed = NULL;

-- Step 4: Deactivate streak badges (hot_streak, cold_streak) as they should reset with seasons
-- Keep achievement badges like king_slayer, clutch_performer, consistent_performer
UPDATE public.team_badge_events 
SET is_active = false 
WHERE badge_type IN ('hot_streak', 'cold_streak') 
AND is_active = true;

-- Step 5: Log the season transition for audit purposes
DO $$
DECLARE
  new_season_id UUID;
BEGIN
  -- Get the new season ID
  SELECT id INTO new_season_id 
  FROM public.seasons 
  WHERE name = 'Summer 2 2025' AND is_active = true;
  
  -- Log the season transition
  PERFORM public.log_security_operation(
    'season_transition',
    'seasons',
    new_season_id,
    NULL,
    jsonb_build_object('new_season', 'Summer 2 2025', 'transition_date', CURRENT_DATE)
  );
END $$;