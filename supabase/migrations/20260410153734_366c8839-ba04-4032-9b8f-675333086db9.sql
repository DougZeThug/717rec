-- teams SELECT: drop both redundant opt-out filters, create one
DROP POLICY "Public can view active teams" ON public.teams;
DROP POLICY "Public teams access with opt-out filter" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT
  USING (NOT EXISTS (
    SELECT 1 FROM team_season_opt_out o
    JOIN seasons s ON s.id = o.season_id AND s.is_active
    WHERE o.team_id = teams.id
  ));

-- teams UPDATE: merge two identical membership checks
DROP POLICY "Approved team members can update teams" ON public.teams;
DROP POLICY "Team members can update own team" ON public.teams;
CREATE POLICY "Approved members can update own team" ON public.teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.team_id = teams.id
      AND team_memberships.user_id = (SELECT auth.uid())
      AND team_memberships.is_approved = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_memberships.team_id = teams.id
      AND team_memberships.user_id = (SELECT auth.uid())
      AND team_memberships.is_approved = true
  ));

-- team_memberships UPDATE: combine admin + user into one
DROP POLICY "Admins can update any membership field" ON public.team_memberships;
DROP POLICY "Users can update own membership team" ON public.team_memberships;
CREATE POLICY "Update membership" ON public.team_memberships FOR UPDATE TO authenticated
  USING (
    current_user_is_admin()
    OR (user_id = (SELECT auth.uid()) AND is_approved = false)
  )
  WITH CHECK (
    current_user_is_admin()
    OR (user_id = (SELECT auth.uid()) AND is_approved = false
        AND approved_by IS NULL AND approved_at IS NULL)
  );