
-- Migration: Fix participants table to conform with brackets-manager library requirements
-- Date: 2025-05-21

-- 1️⃣ add required columns if absent
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS "name" text,
  ADD COLUMN IF NOT EXISTS "tournament_id" uuid,
  ADD COLUMN IF NOT EXISTS "seeding" int,
  ADD COLUMN IF NOT EXISTS "position" int;

-- 2️⃣ populate name + tournament_id for legacy rows
UPDATE participants
SET
  name = COALESCE(name, team_id::text),
  tournament_id = COALESCE(tournament_id, bracket_id)
WHERE name IS NULL OR tournament_id IS NULL;

-- 3️⃣ ensure correct PK / unique key used by brackets-manager
ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_tournament_name_key;
ALTER TABLE participants
  ADD CONSTRAINT participants_tournament_name_key
    UNIQUE (tournament_id, name);

-- 4️⃣ optional: keep bracket_id for compatibility but it's not required
-- (bracket_id is already present in the table)
