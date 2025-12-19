-- Drop the broken RLS policies on team_stats
DROP POLICY IF EXISTS "select_own_team_stats" ON public.team_stats;
DROP POLICY IF EXISTS "insert_team_stats" ON public.team_stats;
DROP POLICY IF EXISTS "update_team_stats" ON public.team_stats;
DROP POLICY IF EXISTS "delete_team_stats" ON public.team_stats;

-- Create correct RLS policies
-- Team stats are public data in a sports league - anyone can view
CREATE POLICY "Anyone can view team stats"
ON public.team_stats
FOR SELECT
USING (true);

-- Only admins can insert team stats
CREATE POLICY "Admins can insert team stats"
ON public.team_stats
FOR INSERT
WITH CHECK (current_user_is_admin());

-- Only admins can update team stats
CREATE POLICY "Admins can update team stats"
ON public.team_stats
FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Only admins can delete team stats
CREATE POLICY "Admins can delete team stats"
ON public.team_stats
FOR DELETE
USING (current_user_is_admin());