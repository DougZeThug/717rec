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
  AND approved_by IS NULL
  AND approved_at IS NULL
);