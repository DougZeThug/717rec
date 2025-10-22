-- Create participant table for brackets-manager
-- This is separate from the 'participants' table which is used for team mapping
CREATE TABLE IF NOT EXISTS participant (
  id SERIAL PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_participant_tournament ON participant(tournament_id);

-- Enable RLS
ALTER TABLE participant ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read participant" ON participant FOR SELECT USING (true);
CREATE POLICY "Admin write participant" ON participant FOR ALL 
  USING (current_user_is_admin()) 
  WITH CHECK (current_user_is_admin());