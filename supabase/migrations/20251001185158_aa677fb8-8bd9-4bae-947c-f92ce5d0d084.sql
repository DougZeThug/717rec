-- Deactivate all badges for the new Fall 2025 season
-- This resets badge states as teams start fresh in the new season

UPDATE public.team_badge_events
SET is_active = false
WHERE is_active = true;