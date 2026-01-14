-- Add is_double_header column to team_timeslots table
-- This allows teams to be marked as playing in two separate timeslot blocks on the same day

ALTER TABLE team_timeslots
ADD COLUMN IF NOT EXISTS is_double_header BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN team_timeslots.is_double_header IS 'Indicates if this team is scheduled for two separate timeslot blocks (double header)';
