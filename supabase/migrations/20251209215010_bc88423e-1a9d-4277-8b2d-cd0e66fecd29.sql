-- Drop the insecure policy that uses JWT claims
DROP POLICY IF EXISTS "Anon can update team_memberships" ON public.team_memberships;

-- Create a secure policy using the current_user_is_admin() function
CREATE POLICY "Admins or owners can update team_memberships"
ON public.team_memberships FOR UPDATE
USING (current_user_is_admin() OR user_id = auth.uid())
WITH CHECK (current_user_is_admin() OR user_id = auth.uid());