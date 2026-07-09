
-- Restrict INSERT on team_requests
DROP POLICY IF EXISTS "Authenticated users can submit requests" ON public.team_requests;

CREATE POLICY "Team members can submit requests for their team"
ON public.team_requests
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  AND status = 'PENDING'
  AND admin_notes IS NULL
  AND processed_by IS NULL
  AND processed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.team_id = team_requests.team_id
      AND tm.user_id = (SELECT auth.uid())
  )
);
