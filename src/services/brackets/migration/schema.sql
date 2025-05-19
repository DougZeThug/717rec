
-- Add migration tracking fields to brackets table
ALTER TABLE IF EXISTS brackets 
ADD COLUMN IF NOT EXISTS migrated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS migrated_at timestamp with time zone;

-- Create index for faster querying of unmigrated brackets
CREATE INDEX IF NOT EXISTS idx_brackets_migrated ON brackets (migrated) 
WHERE migrated IS NULL OR migrated = false;

-- Comment on the new columns
COMMENT ON COLUMN brackets.migrated IS 'Flag indicating if bracket has been migrated to brackets-manager format';
COMMENT ON COLUMN brackets.migrated_at IS 'Timestamp when the bracket was migrated';
