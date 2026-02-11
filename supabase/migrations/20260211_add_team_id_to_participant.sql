-- Add team_id column to participant table
-- This allows mapping bracket participants back to teams for standings calculation.
-- Without this column, BracketStandingsService cannot save final placements
-- to playoff_team_records (team_id is always undefined).

ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_participant_team_id ON participant(team_id);
