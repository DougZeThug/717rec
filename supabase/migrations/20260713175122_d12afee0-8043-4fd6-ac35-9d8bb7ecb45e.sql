
-- Fix 1: broaden participants SELECT policy to both anon + authenticated
DROP POLICY IF EXISTS "Public can read participants" ON public.participants;
CREATE POLICY "Public can read participants"
  ON public.participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix 2: prevent users from changing team_id on their own pending membership rows
DROP POLICY IF EXISTS "Update membership" ON public.team_memberships;
CREATE POLICY "Update membership"
  ON public.team_memberships
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND is_approved = false
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND is_approved = false
    AND team_id = (
      SELECT tm.team_id FROM public.team_memberships tm WHERE tm.id = team_memberships.id
    )
  );
