
-- Add approval-related columns to team_memberships table
ALTER TABLE team_memberships 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false,
ADD COLUMN approved_by uuid REFERENCES profiles(id),
ADD COLUMN approved_at timestamp with time zone;

-- Create index for better performance on approval queries
CREATE INDEX idx_team_memberships_is_approved ON team_memberships(is_approved);
CREATE INDEX idx_team_memberships_pending ON team_memberships(team_id, is_approved) WHERE is_approved = false;

-- Update RLS policies to ensure only approved members can edit teams
-- First, let's ensure the teams table has proper RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read teams (for displaying team lists)
DROP POLICY IF EXISTS "Everyone can view teams" ON teams;
CREATE POLICY "Everyone can view teams" ON teams
  FOR SELECT 
  TO authenticated
  USING (true);

-- Only approved team members can update team details
DROP POLICY IF EXISTS "Approved team members can update teams" ON teams;
CREATE POLICY "Approved team members can update teams" ON teams
  FOR UPDATE 
  TO authenticated
  USING (
    id IN (
      SELECT team_id 
      FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND is_approved = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT team_id 
      FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND is_approved = true
    )
  );

-- Update team_memberships RLS policies
-- Users can read their own memberships
DROP POLICY IF EXISTS "Users can read their own memberships" ON team_memberships;
CREATE POLICY "Users can read their own memberships" ON team_memberships
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Users can read team memberships for teams they belong to
DROP POLICY IF EXISTS "Team members can read team memberships" ON team_memberships;
CREATE POLICY "Team members can read team memberships" ON team_memberships
  FOR SELECT 
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_memberships tm 
      WHERE tm.user_id = auth.uid()
    )
  );

-- Users can create their own memberships (but they start as unapproved)
DROP POLICY IF EXISTS "Users can create memberships" ON team_memberships;
CREATE POLICY "Users can create memberships" ON team_memberships
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_approved = false);

-- Only users can delete their own memberships
DROP POLICY IF EXISTS "Users can delete their own memberships" ON team_memberships;
CREATE POLICY "Users can delete their own memberships" ON team_memberships
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can update memberships (for approval/rejection)
DROP POLICY IF EXISTS "Admins can update team memberships" ON team_memberships;
CREATE POLICY "Admins can update team memberships" ON team_memberships
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );
