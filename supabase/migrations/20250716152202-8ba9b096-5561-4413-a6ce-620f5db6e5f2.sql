-- Step 1: Create a security definer function to check if a user belongs to a team
-- This function executes with elevated privileges, bypassing RLS to prevent recursion
CREATE OR REPLACE FUNCTION public.user_belongs_to_team(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships 
    WHERE user_id = auth.uid() AND team_id = p_team_id
  )
$$;

-- Step 2: Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Team members can read team memberships" ON public.team_memberships;

-- Step 3: Create a new policy using the security definer function
-- This prevents recursion by using the function instead of directly querying the table
CREATE POLICY "Team members can read team memberships" ON public.team_memberships
FOR SELECT 
TO authenticated
USING (public.user_belongs_to_team(team_id));