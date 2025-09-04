-- Update the CHECK constraint on team_timeslots.timeslot to include '5:30 PM'
ALTER TABLE public.team_timeslots 
DROP CONSTRAINT IF EXISTS team_timeslots_timeslot_check;

ALTER TABLE public.team_timeslots 
ADD CONSTRAINT team_timeslots_timeslot_check 
CHECK (timeslot IN ('5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', 'BYE'));