-- Add confirmation_open column to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS confirmation_open boolean NOT NULL DEFAULT false;

-- Create season_team_participation table
CREATE TABLE IF NOT EXISTS season_team_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PLAYING', 'NOT_PLAYING')),
  submitted_by uuid REFERENCES auth.users(id),
  submitted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_season_team_participation_updated_at
  BEFORE UPDATE ON season_team_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE season_team_participation ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can read all rows
CREATE POLICY "Admins can view all participation"
  ON season_team_participation
  FOR SELECT
  USING (current_user_is_admin());

-- Any authenticated user can read their submissions (for the homepage card)
CREATE POLICY "Users can view participation"
  ON season_team_participation
  FOR SELECT
  USING (true);

-- Any authenticated user can insert (trusted internal app)
CREATE POLICY "Authenticated users can insert participation"
  ON season_team_participation
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Any authenticated user can update (trusted internal app)
CREATE POLICY "Authenticated users can update participation"
  ON season_team_participation
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete
CREATE POLICY "Admins can delete participation"
  ON season_team_participation
  FOR DELETE
  USING (current_user_is_admin());