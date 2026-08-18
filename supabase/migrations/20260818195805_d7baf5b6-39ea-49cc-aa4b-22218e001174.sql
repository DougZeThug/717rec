DROP POLICY IF EXISTS "Update membership" ON public.team_memberships;

CREATE POLICY "Update membership"
ON public.team_memberships
FOR UPDATE
TO authenticated
USING (
  public.current_user_is_admin()
  OR (user_id = (SELECT auth.uid()) AND is_approved = false)
)
WITH CHECK (
  public.current_user_is_admin()
  OR (
    user_id = (SELECT auth.uid())
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  )
);

DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.team_memberships;

CREATE POLICY "Delete membership (admin or owner)"
ON public.team_memberships
FOR DELETE
TO authenticated
USING (
  public.current_user_is_admin()
  OR user_id = (SELECT auth.uid())
);