-- Remove the tautological team_id self-reference from the Update membership policy.
-- The trg_prevent_team_membership_reassignment BEFORE UPDATE trigger already
-- blocks non-admin changes to team_id (and other locked columns), so the
-- broken WITH CHECK subquery is redundant and misleading to scanners.
DROP POLICY IF EXISTS "Update membership" ON public.team_memberships;

CREATE POLICY "Update membership"
ON public.team_memberships
FOR UPDATE
USING (
  (user_id = (SELECT auth.uid())) AND (is_approved = false)
)
WITH CHECK (
  (user_id = (SELECT auth.uid())) AND (is_approved = false)
);