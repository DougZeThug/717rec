ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_participant_team_id ON participant(team_id);