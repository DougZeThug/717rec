-- Create security definer function to check team membership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_is_team_member(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE user_id = p_user_id
      AND team_id = p_team_id
  );
$$;

-- Drop the problematic SELECT policy that causes recursion
DROP POLICY IF EXISTS "authenticated_can_select_memberships" ON public.team_memberships;

-- Create new SELECT policy using the security definer function
CREATE POLICY "authenticated_can_select_memberships" 
ON public.team_memberships
FOR SELECT
TO authenticated
USING (
  -- Users can see their own memberships
  auth.uid() = user_id
  OR
  -- Users can see memberships of teams they belong to (using security definer function)
  public.user_is_team_member(auth.uid(), team_id)
);