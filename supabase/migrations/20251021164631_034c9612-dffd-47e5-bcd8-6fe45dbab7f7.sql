-- Fix infinite recursion in team_memberships RLS policy
-- Create a security definer function to check team membership without triggering RLS recursion

CREATE OR REPLACE FUNCTION public.user_is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE user_id = _user_id
      AND team_id = _team_id
  )
$$;

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "authenticated_can_select_memberships" ON team_memberships;
DROP POLICY IF EXISTS "Users can view own and team memberships" ON team_memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON team_memberships;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "Users can view own memberships"
ON team_memberships
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team memberships"
ON team_memberships
FOR SELECT
TO authenticated
USING (public.user_is_team_member(auth.uid(), team_id));

-- Allow admins to view all memberships
CREATE POLICY "Admins can view all memberships"
ON team_memberships
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());