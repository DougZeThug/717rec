
-- Add name column if missing
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS name text;

-- Seed existing rows with team_id text if name is null
UPDATE participants
SET name = team_id::text
WHERE name IS NULL;

-- Ensure unique key used by library
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participants_tournament_name_key'
  ) THEN
    ALTER TABLE participants
      ADD CONSTRAINT participants_tournament_name_key
        UNIQUE (bracket_id, name);
  END IF;
END $$;

-- Make matches FK constraints deferrable if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_next_match_id_fkey'
  ) THEN
    ALTER TABLE matches
      ALTER CONSTRAINT matches_next_match_id_fkey
        DEFERRABLE INITIALLY DEFERRED;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_next_loser_match_id_fkey'
  ) THEN
    ALTER TABLE matches
      ALTER CONSTRAINT matches_next_loser_match_id_fkey
        DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Make playoff_matches FKs deferrable if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playoff_matches_next_win_match_id_fkey'
  ) THEN
    ALTER TABLE playoff_matches
      ALTER CONSTRAINT playoff_matches_next_win_match_id_fkey
        DEFERRABLE INITIALLY DEFERRED;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playoff_matches_next_lose_match_id_fkey'
  ) THEN
    ALTER TABLE playoff_matches
      ALTER CONSTRAINT playoff_matches_next_lose_match_id_fkey
        DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
