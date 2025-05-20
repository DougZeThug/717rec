
-- DEFERRABLE FK pointers so we can bulk-insert the tree first
ALTER TABLE matches
  ALTER CONSTRAINT matches_next_match_id_fkey
    DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE matches
  ALTER CONSTRAINT matches_next_loser_match_id_fkey
    DEFERRABLE INITIALLY DEFERRED;

-- new participants table (one row per team in bracket)
CREATE TABLE IF NOT EXISTS participants (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bracket_id   uuid NOT NULL REFERENCES brackets (id) ON DELETE CASCADE,
  team_id      uuid NOT NULL REFERENCES teams (id)    ON DELETE CASCADE,
  position     int  NOT NULL,
  UNIQUE (bracket_id, team_id)
);

-- Add Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY "Admins have full access to participants"
  ON participants
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Policy for all users (read-only)
CREATE POLICY "All users can view participants"
  ON participants
  FOR SELECT
  USING (true);
