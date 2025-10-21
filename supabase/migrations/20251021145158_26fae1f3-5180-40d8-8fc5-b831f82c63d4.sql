-- Add uses_brackets_manager column to brackets table
-- This enables hybrid approach: new brackets use brackets-manager.js, existing use Challonge

ALTER TABLE brackets 
ADD COLUMN uses_brackets_manager BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX idx_brackets_uses_brackets_manager ON brackets(uses_brackets_manager);

-- Add comment for documentation
COMMENT ON COLUMN brackets.uses_brackets_manager IS 'True if bracket was created with brackets-manager.js, false if using legacy Challonge integration';