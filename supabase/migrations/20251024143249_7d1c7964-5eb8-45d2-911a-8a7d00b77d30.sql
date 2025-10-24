-- ============================================
-- CRITICAL SECURITY FIXES
-- ============================================

-- ============================================
-- 1. FIX MATCHES TABLE POLICIES
-- ============================================
-- Drop all dangerous and overlapping policies on matches table
DROP POLICY IF EXISTS "Allow all operations for anyone" ON matches;
DROP POLICY IF EXISTS "Allow updates to matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can view matches" ON matches;
DROP POLICY IF EXISTS "Admin full access" ON matches;
DROP POLICY IF EXISTS "Public read access" ON matches;

-- Create clean, secure policies for matches table
-- 1. Public can view all matches
CREATE POLICY "Public can view matches"
ON matches FOR SELECT
USING (true);

-- 2. Only admins can create matches
CREATE POLICY "Admins can create matches"
ON matches FOR INSERT
WITH CHECK (current_user_is_admin());

-- 3. Only admins can update matches
CREATE POLICY "Admins can update matches"
ON matches FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 4. Only admins can delete matches
CREATE POLICY "Admins can delete matches"
ON matches FOR DELETE
USING (current_user_is_admin());

-- ============================================
-- 2. FIX TEAMS TABLE POLICIES
-- ============================================
-- Drop all overlapping and dangerous policies on teams table
DROP POLICY IF EXISTS "Enable insert for all users" ON teams;
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON teams;
DROP POLICY IF EXISTS "Allow updates to team stats" ON teams;
DROP POLICY IF EXISTS "Public read access" ON teams;
DROP POLICY IF EXISTS "Admin full access" ON teams;
DROP POLICY IF EXISTS "Authenticated insert access" ON teams;

-- Create clean, secure policies for teams table
-- 1. Public can view non-opted-out teams
CREATE POLICY "Public can view active teams"
ON teams FOR SELECT
USING (
  NOT EXISTS (
    SELECT 1 FROM team_season_opt_out
    WHERE team_id = teams.id
    AND season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
  )
);

-- 2. Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Team members can update their own team
CREATE POLICY "Team members can update own team"
ON teams FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = teams.id
    AND user_id = auth.uid()
    AND is_approved = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = teams.id
    AND user_id = auth.uid()
    AND is_approved = true
  )
);

-- 4. Only admins can delete teams
CREATE POLICY "Admins can delete teams"
ON teams FOR DELETE
USING (current_user_is_admin());

-- 5. Admins have full control over teams
CREATE POLICY "Admins full access to teams"
ON teams FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- ============================================
-- 3. FIX TEAM_TIMESLOTS TABLE POLICIES
-- ============================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Enable all access to team_timeslots" ON team_timeslots;

-- Create clean, secure policies for team_timeslots table
-- 1. Anyone can view timeslots (public read access as requested)
CREATE POLICY "Public can view timeslots"
ON team_timeslots FOR SELECT
USING (true);

-- 2. Only admins can insert timeslots
CREATE POLICY "Admins can insert timeslots"
ON team_timeslots FOR INSERT
WITH CHECK (current_user_is_admin());

-- 3. Only admins can update timeslots
CREATE POLICY "Admins can update timeslots"
ON team_timeslots FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 4. Only admins can delete timeslots
CREATE POLICY "Admins can delete timeslots"
ON team_timeslots FOR DELETE
USING (current_user_is_admin());