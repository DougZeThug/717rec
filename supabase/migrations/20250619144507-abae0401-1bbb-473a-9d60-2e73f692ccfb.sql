
-- Drop the old constraint that only allowed 4 timeslots
ALTER TABLE team_timeslots DROP CONSTRAINT IF EXISTS team_timeslots_timeslot_check;

-- Add the new constraint with all 8 timeslot values
ALTER TABLE team_timeslots ADD CONSTRAINT team_timeslots_timeslot_check 
CHECK (timeslot = ANY (ARRAY[
  '6:00 PM'::text, 
  '6:30 PM'::text, 
  '7:00 PM'::text, 
  '7:30 PM'::text, 
  '8:00 PM'::text, 
  '8:30 PM'::text, 
  '9:00 PM'::text, 
  '9:30 PM'::text
]));
