-- Fix RLS policy conflicts on teams table that are preventing opt-out functionality

-- First, drop the conflicting duplicate SELECT policies
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Everyone can view teams" ON teams; 
DROP POLICY IF EXISTS "Public read access" ON teams;

-- Keep the existing opt-out policy but make it the primary SELECT policy
-- Drop the existing one and recreate it as the main policy
DROP POLICY IF EXISTS "Hide teams opted-out of the active season" ON teams;

-- Create a single consolidated SELECT policy that includes the opt-out filter
CREATE POLICY "Public teams access with opt-out filter" ON teams
  FOR SELECT 
  USING (
    NOT EXISTS (
      SELECT 1 
      FROM team_season_opt_out o
      JOIN seasons s ON s.id = o.season_id AND s.is_active 
      WHERE o.team_id = teams.id
    )
  );