
-- Update the team_timeslots table constraint to allow 'BYE' as a valid timeslot
ALTER TABLE team_timeslots DROP CONSTRAINT IF EXISTS team_timeslots_timeslot_check;

ALTER TABLE team_timeslots ADD CONSTRAINT team_timeslots_timeslot_check 
CHECK (timeslot = ANY (ARRAY['6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', 'BYE']));
