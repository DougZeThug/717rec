-- Migration: Add team_id and position columns to the participant table
-- These columns allow mapping bracket participants back to actual teams
-- and tracking their seeding position in the bracket.

-- Add team_id column (nullable because BYE participants have no team)
ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add position column for bracket seeding position
ALTER TABLE participant
  ADD COLUMN IF NOT EXISTS position INT;

-- Add index on team_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_participant_team_id ON participant(team_id);
