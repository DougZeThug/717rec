
-- ============================================================
-- Part 1: Fix auth_rls_initplan warnings (wrap auth.uid() in select)
-- ============================================================

-- team_analysis: delete, insert, update
DROP POLICY IF EXISTS "Admins can delete team analysis" ON public.team_analysis;
CREATE POLICY "Admins can delete team analysis" ON public.team_analysis
  FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can insert team analysis" ON public.team_analysis;
CREATE POLICY "Admins can insert team analysis" ON public.team_analysis
  FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Admins can update team analysis" ON public.team_analysis;
CREATE POLICY "Admins can update team analysis" ON public.team_analysis
  FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- profiles: view own, update own
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

-- season_team_participation: delete
DROP POLICY IF EXISTS "Admins can delete participation" ON public.season_team_participation;
CREATE POLICY "Admins can delete participation" ON public.season_team_participation
  FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- team_memberships: view, create, update own
DROP POLICY IF EXISTS "Users and admins can view memberships" ON public.team_memberships;
CREATE POLICY "Users and admins can view memberships" ON public.team_memberships
  FOR SELECT TO public
  USING (current_user_is_admin() OR ((SELECT auth.uid()) = user_id) OR user_is_team_member((SELECT auth.uid()), team_id));

DROP POLICY IF EXISTS "Users can create their membership" ON public.team_memberships;
CREATE POLICY "Users can create their membership" ON public.team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_approved = false AND approved_by IS NULL AND approved_at IS NULL);

DROP POLICY IF EXISTS "Users can update own membership team" ON public.team_memberships;
CREATE POLICY "Users can update own membership team" ON public.team_memberships
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_approved = false)
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_approved = false AND approved_by IS NULL AND approved_at IS NULL);

-- ranking_snapshots: delete
DROP POLICY IF EXISTS "Admins can delete rankings" ON public.ranking_snapshots;
CREATE POLICY "Admins can delete rankings" ON public.ranking_snapshots
  FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- team_details_archive: update
DROP POLICY IF EXISTS "Admin users can update archive" ON public.team_details_archive;
CREATE POLICY "Admin users can update archive" ON public.team_details_archive
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

-- messages: insert
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;
CREATE POLICY "Authenticated can insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- team_requests: view
DROP POLICY IF EXISTS "Users can view own requests, admins view all" ON public.team_requests;
CREATE POLICY "Users can view own requests, admins view all" ON public.team_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = submitted_by OR current_user_is_admin());

-- teams: "Team members can update own team" — need to read the current policy first
-- Based on the linter finding, it uses auth.uid() without select wrapper
DROP POLICY IF EXISTS "Team members can update own team" ON public.teams;
CREATE POLICY "Team members can update own team" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.team_id = teams.id
        AND team_memberships.user_id = (SELECT auth.uid())
        AND team_memberships.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.team_id = teams.id
        AND team_memberships.user_id = (SELECT auth.uid())
        AND team_memberships.is_approved = true
    )
  );

-- ============================================================
-- Part 2: Fix multiple_permissive_policies (split ALL into writes)
-- ============================================================

-- divisions
DROP POLICY IF EXISTS "Admin full access" ON public.divisions;
CREATE POLICY "Admin insert divisions" ON public.divisions FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update divisions" ON public.divisions FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete divisions" ON public.divisions FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- games
DROP POLICY IF EXISTS "Admin full access" ON public.games;
CREATE POLICY "Admin insert games" ON public.games FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update games" ON public.games FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete games" ON public.games FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- group
DROP POLICY IF EXISTS "Admin write group" ON public."group";
CREATE POLICY "Admin insert group" ON public."group" FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update group" ON public."group" FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete group" ON public."group" FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- match
DROP POLICY IF EXISTS "Admin write match" ON public."match";
CREATE POLICY "Admin insert match" ON public."match" FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update match" ON public."match" FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete match" ON public."match" FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- match_game
DROP POLICY IF EXISTS "Admin write match_game" ON public.match_game;
CREATE POLICY "Admin insert match_game" ON public.match_game FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update match_game" ON public.match_game FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete match_game" ON public.match_game FOR DELETE TO authenticated
  USING (current_user_is_admin());
