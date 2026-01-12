-- Migration: Sync brackets-manager match inserts to playoff_matches
-- This creates a trigger that automatically creates a corresponding playoff_matches row
-- whenever a new row is inserted into the brackets-manager "match" table.
--
-- SCHEMA EVIDENCE:
-- - match table: id (SERIAL), stage_id, group_id, round_id, number, opponent1_id, opponent2_id, status
-- - playoff_matches table: id (UUID), bracket_id, round, position, match_type, team1_id, team2_id, status
-- - stage table: id, tournament_id (bracket UUID)
-- - group table: id, stage_id, number (1=winners, 2=losers, 3=finals)
-- - round table: id, group_id, number (round number)
-- - participants table: id (INTEGER), team_id (UUID), tournament_id (bracket UUID)
--
-- RULE: A "bracket manager match" is any row in the "match" table (all rows qualify).
-- The linkage to brackets is via match.stage_id → stage.tournament_id.
--
-- LINKAGE KEY: playoff_matches.match_id (INTEGER FK) → match.id
-- IDEMPOTENCY: UNIQUE constraint on playoff_matches(match_id) + ON CONFLICT DO NOTHING

-- Step 1: Add match_id column to playoff_matches if it doesn't exist
-- This column links playoff_matches rows to their source brackets-manager match rows
ALTER TABLE playoff_matches
  ADD COLUMN IF NOT EXISTS match_id INTEGER;

-- Step 2: Add foreign key constraint to match table
-- Using a DO block to handle the case where the constraint might already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playoff_matches_match_id_fkey'
  ) THEN
    ALTER TABLE playoff_matches
      ADD CONSTRAINT playoff_matches_match_id_fkey
      FOREIGN KEY (match_id) REFERENCES match(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Add unique constraint for idempotency
-- This prevents duplicate playoff_matches rows if the trigger fires multiple times
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'playoff_matches_match_id_unique'
  ) THEN
    ALTER TABLE playoff_matches
      ADD CONSTRAINT playoff_matches_match_id_unique UNIQUE (match_id);
  END IF;
END $$;

-- Step 4: Create the trigger function that syncs match inserts to playoff_matches
-- This function maps brackets-manager schema to playoff_matches schema
CREATE OR REPLACE FUNCTION sync_match_to_playoff_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bracket_id UUID;
  v_round_number INTEGER;
  v_group_number INTEGER;
  v_match_type playoff_match_type;
  v_team1_id UUID;
  v_team2_id UUID;
BEGIN
  -- Step A: Get bracket_id from stage.tournament_id
  SELECT s.tournament_id INTO v_bracket_id
  FROM stage s
  WHERE s.id = NEW.stage_id;

  -- If no bracket found, skip (not a valid bracket-manager match)
  IF v_bracket_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Step B: Get round number from round table
  SELECT r.number INTO v_round_number
  FROM round r
  WHERE r.id = NEW.round_id;

  IF v_round_number IS NULL THEN
    v_round_number := 1; -- Default to round 1 if not found
  END IF;

  -- Step C: Get group number and map to match_type
  SELECT g.number INTO v_group_number
  FROM "group" g
  WHERE g.id = NEW.group_id;

  -- Map group number to match_type enum
  -- group.number: 1 = winners bracket, 2 = losers bracket, 3 = grand finals
  CASE v_group_number
    WHEN 1 THEN v_match_type := 'winners'::playoff_match_type;
    WHEN 2 THEN v_match_type := 'losers'::playoff_match_type;
    WHEN 3 THEN v_match_type := 'finals'::playoff_match_type;
    ELSE v_match_type := 'winners'::playoff_match_type; -- Default to winners
  END CASE;

  -- Step D: Look up team UUIDs from participants table using opponent IDs
  -- opponent1_id/opponent2_id are INTEGER participant IDs
  IF NEW.opponent1_id IS NOT NULL THEN
    SELECT p.team_id INTO v_team1_id
    FROM participant p
    WHERE p.id = NEW.opponent1_id;
  END IF;

  IF NEW.opponent2_id IS NOT NULL THEN
    SELECT p.team_id INTO v_team2_id
    FROM participant p
    WHERE p.id = NEW.opponent2_id;
  END IF;

  -- Step E: Insert into playoff_matches with ON CONFLICT DO NOTHING for idempotency
  -- The unique constraint on match_id ensures no duplicates
  INSERT INTO playoff_matches (
    id,
    bracket_id,
    round,
    position,
    match_type,
    team1_id,
    team2_id,
    status,
    match_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_bracket_id,
    v_round_number,
    NEW.number,  -- match.number = position within round
    v_match_type,
    v_team1_id,
    v_team2_id,
    CASE NEW.status
      WHEN 4 THEN 'completed'
      ELSE 'pending'
    END,
    NEW.id,  -- Link back to brackets-manager match
    NOW()
  )
  ON CONFLICT (match_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 5: Create the AFTER INSERT trigger on match table
-- Using DROP IF EXISTS + CREATE to ensure clean state
DROP TRIGGER IF EXISTS sync_match_insert_to_playoff_matches ON match;

CREATE TRIGGER sync_match_insert_to_playoff_matches
  AFTER INSERT ON match
  FOR EACH ROW
  EXECUTE FUNCTION sync_match_to_playoff_matches();

-- Step 6: Grant necessary permissions for the trigger function to work
-- The function uses SECURITY DEFINER so it runs with elevated privileges
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON stage TO authenticated;
GRANT SELECT ON round TO authenticated;
GRANT SELECT ON "group" TO authenticated;
GRANT SELECT ON participant TO authenticated;
GRANT INSERT ON playoff_matches TO authenticated;

-- Add comment documenting the trigger
COMMENT ON FUNCTION sync_match_to_playoff_matches() IS
  'Automatically syncs new brackets-manager match rows to playoff_matches table. '
  'Triggered AFTER INSERT on match table. Uses match_id unique constraint for idempotency.';

COMMENT ON TRIGGER sync_match_insert_to_playoff_matches ON match IS
  'Syncs new bracket-manager matches to playoff_matches for app-layer queries.';
