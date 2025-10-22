-- Add bracket_data JSONB column to store brackets-manager's in-memory database
ALTER TABLE brackets 
ADD COLUMN bracket_data JSONB;

-- Add index for performance
CREATE INDEX idx_brackets_bracket_data ON brackets USING GIN (bracket_data);

-- Add comment
COMMENT ON COLUMN brackets.bracket_data IS 'Complete brackets-manager in-memory database state (stages, groups, rounds, matches, participants)';