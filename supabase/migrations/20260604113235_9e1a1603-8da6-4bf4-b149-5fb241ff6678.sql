-- Replace the overly-permissive public INSERT policy on season_team_participation
DROP POLICY IF EXISTS "Anyone can submit participation" ON public.season_team_participation;

CREATE POLICY "Authenticated team members can submit participation"
ON public.season_team_participation
FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT auth.uid())
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships tm
      WHERE tm.user_id = (SELECT auth.uid())
        AND tm.team_id = season_team_participation.team_id
    )
  )
);