-- Consolidate overlapping permissive RLS policies to clear linter warnings.

-- contact_requests SELECT
DROP POLICY IF EXISTS "Admins can view contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Users can view their own contact requests" ON public.contact_requests;
CREATE POLICY "View contact requests (admin or owner)"
ON public.contact_requests
FOR SELECT TO authenticated
USING (
  public.current_user_is_admin()
  OR user_id = (SELECT auth.uid())
);

-- matches_archive SELECT: drop redundant authenticated-only policy; public policy already covers it.
DROP POLICY IF EXISTS "Authenticated read archived matches" ON public.matches_archive;

-- teams UPDATE
DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
DROP POLICY IF EXISTS "Approved members can update own team" ON public.teams;
CREATE POLICY "Update teams (admin or approved member)"
ON public.teams
FOR UPDATE TO authenticated
USING (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_memberships.team_id = teams.id
      AND team_memberships.user_id = (SELECT auth.uid())
      AND team_memberships.is_approved = true
  )
)
WITH CHECK (
  public.current_user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_memberships.team_id = teams.id
      AND team_memberships.user_id = (SELECT auth.uid())
      AND team_memberships.is_approved = true
  )
);