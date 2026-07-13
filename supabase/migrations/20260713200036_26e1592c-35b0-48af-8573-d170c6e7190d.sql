DROP POLICY IF EXISTS "Members insert team_players" ON public.team_players;
DROP POLICY IF EXISTS "Members update team_players" ON public.team_players;

CREATE POLICY "Members insert team_players"
ON public.team_players
FOR INSERT
TO authenticated
WITH CHECK (
  current_user_is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_players.team_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
    AND (team_players.profile_id IS NULL OR team_players.profile_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Members update team_players"
ON public.team_players
FOR UPDATE
TO authenticated
USING (
  current_user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.team_id = team_players.team_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.is_approved = true
  )
)
WITH CHECK (
  current_user_is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_players.team_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
    AND (team_players.profile_id IS NULL OR team_players.profile_id = (SELECT auth.uid()))
  )
);