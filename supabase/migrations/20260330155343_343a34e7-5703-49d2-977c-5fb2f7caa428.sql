-- Fix 1: Team requests - restrict SELECT to submitter + admins
DROP POLICY "Anyone can view requests" ON public.team_requests;

CREATE POLICY "Users can view own requests, admins view all"
  ON public.team_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = submitted_by
    OR current_user_is_admin()
  );

-- Fix 3: Team memberships - tighten UPDATE policies
DROP POLICY "Users can update their membership" ON public.team_memberships;
DROP POLICY "Admins or owners can update team_memberships" ON public.team_memberships;

CREATE POLICY "Admins can update any membership field"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Users can update own membership team"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );