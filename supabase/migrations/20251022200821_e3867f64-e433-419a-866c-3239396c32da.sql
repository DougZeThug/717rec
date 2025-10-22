-- Create stage table for brackets-manager
CREATE TABLE IF NOT EXISTS stage (
  id SERIAL PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  number INTEGER NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create group table for brackets-manager
CREATE TABLE IF NOT EXISTS "group" (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT
);

-- Create round table for brackets-manager
CREATE TABLE IF NOT EXISTS round (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  name TEXT
);

-- Create match table for brackets-manager (replaces playoff_matches)
CREATE TABLE IF NOT EXISTS match (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
  round_id INTEGER NOT NULL REFERENCES round(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  opponent1_id INTEGER,
  opponent2_id INTEGER,
  opponent1_score INTEGER,
  opponent2_score INTEGER,
  opponent1_result TEXT,
  opponent2_result TEXT
);

-- Create match_game table for best-of series
CREATE TABLE IF NOT EXISTS match_game (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES match(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  opponent1_score INTEGER,
  opponent2_score INTEGER,
  status INTEGER NOT NULL DEFAULT 1
);

-- Update participants table to match brackets-manager schema
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES brackets(id) ON DELETE CASCADE,
  ALTER COLUMN position DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stage_tournament ON stage(tournament_id);
CREATE INDEX IF NOT EXISTS idx_group_stage ON "group"(stage_id);
CREATE INDEX IF NOT EXISTS idx_round_group ON round(group_id);
CREATE INDEX IF NOT EXISTS idx_match_stage ON match(stage_id);
CREATE INDEX IF NOT EXISTS idx_match_round ON match(round_id);
CREATE INDEX IF NOT EXISTS idx_match_game_match ON match_game(match_id);
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON participants(tournament_id);

-- Enable RLS on new tables
ALTER TABLE stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE round ENABLE ROW LEVEL SECURITY;
ALTER TABLE match ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_game ENABLE ROW LEVEL SECURITY;

-- RLS policies for public read access
CREATE POLICY "Public read stage" ON stage FOR SELECT USING (true);
CREATE POLICY "Public read group" ON "group" FOR SELECT USING (true);
CREATE POLICY "Public read round" ON round FOR SELECT USING (true);
CREATE POLICY "Public read match" ON match FOR SELECT USING (true);
CREATE POLICY "Public read match_game" ON match_game FOR SELECT USING (true);

-- RLS policies for admin write access
CREATE POLICY "Admin write stage" ON stage FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin write group" ON "group" FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin write round" ON round FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin write match" ON match FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin write match_game" ON match_game FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());