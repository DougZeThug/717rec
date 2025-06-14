
-- Add is_archived column to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create index for performance on season queries
CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_is_archived ON seasons(is_archived);

-- Create a function to ensure only one active season at a time
CREATE OR REPLACE FUNCTION ensure_single_active_season()
RETURNS TRIGGER AS $$
BEGIN
  -- If this season is being set to active, deactivate all others
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
    UPDATE seasons 
    SET is_active = false 
    WHERE id != NEW.id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single active season
DROP TRIGGER IF EXISTS trg_ensure_single_active_season ON seasons;
CREATE TRIGGER trg_ensure_single_active_season
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_season();

-- Add RLS policies for seasons table
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read seasons
CREATE POLICY "Authenticated users can read seasons" ON seasons
  FOR SELECT 
  TO authenticated
  USING (true);

-- Allow only admins to modify seasons (we'll check is_admin in the application layer)
CREATE POLICY "Admins can manage seasons" ON seasons
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
