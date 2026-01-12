-- Drop the existing SELECT policy on team_memberships
DROP POLICY IF EXISTS "authenticated_can_select_memberships" ON team_memberships;

-- Create a new policy that also allows admins to view all memberships
CREATE POLICY "Users and admins can view memberships"
ON team_memberships
FOR SELECT
USING (
  current_user_is_admin() 
  OR auth.uid() = user_id 
  OR user_is_team_member(auth.uid(), team_id)
);