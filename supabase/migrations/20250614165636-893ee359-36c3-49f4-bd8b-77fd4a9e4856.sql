
-- Add columns to team_timeslots table to support back-to-back scheduling
ALTER TABLE team_timeslots 
ADD COLUMN is_back_to_back boolean NOT NULL DEFAULT false,
ADD COLUMN pair_slot text,
ADD COLUMN match_sequence integer;

-- Add comments to explain the new columns
COMMENT ON COLUMN team_timeslots.is_back_to_back IS 'Indicates if this timeslot is part of a back-to-back pair';
COMMENT ON COLUMN team_timeslots.pair_slot IS 'The paired timeslot for back-to-back scheduling (e.g., if timeslot is "6:30 PM", pair_slot would be "7:00 PM")';
COMMENT ON COLUMN team_timeslots.match_sequence IS 'Sequence number within the back-to-back pair (1 for first match, 2 for second match)';

-- Create index for efficient querying of back-to-back pairs
CREATE INDEX IF NOT EXISTS idx_team_timeslots_back_to_back 
ON team_timeslots (match_date, is_back_to_back, pair_slot) 
WHERE is_back_to_back = true;

-- Create index for match sequence queries
CREATE INDEX IF NOT EXISTS idx_team_timeslots_sequence 
ON team_timeslots (team_id, match_date, match_sequence) 
WHERE is_back_to_back = true;
