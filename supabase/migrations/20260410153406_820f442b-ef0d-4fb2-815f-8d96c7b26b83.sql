
-- =============================================
-- GROUP 1: Drop ALL policies, replace with INSERT/UPDATE/DELETE
-- =============================================

-- participant
DROP POLICY "Admin write participant" ON public.participant;
CREATE POLICY "Admin insert participant" ON public.participant FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update participant" ON public.participant FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete participant" ON public.participant FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- round
DROP POLICY "Admin write round" ON public.round;
CREATE POLICY "Admin insert round" ON public.round FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update round" ON public.round FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete round" ON public.round FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- stage
DROP POLICY "Admin write stage" ON public.stage;
CREATE POLICY "Admin insert stage" ON public.stage FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update stage" ON public.stage FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete stage" ON public.stage FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- participants
DROP POLICY "Admins can manage participants" ON public.participants;
CREATE POLICY "Admin insert participants" ON public.participants FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update participants" ON public.participants FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete participants" ON public.participants FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- playoff_games
DROP POLICY "Admins can manage playoff games" ON public.playoff_games;
CREATE POLICY "Admin insert playoff games" ON public.playoff_games FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update playoff games" ON public.playoff_games FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete playoff games" ON public.playoff_games FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- power_score_snapshots
DROP POLICY "Admins can manage snapshots" ON public.power_score_snapshots;
CREATE POLICY "Admin insert snapshots" ON public.power_score_snapshots FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update snapshots" ON public.power_score_snapshots FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete snapshots" ON public.power_score_snapshots FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- team_season_stats
DROP POLICY IF EXISTS "Admins can manage team season stats" ON public.team_season_stats;
CREATE POLICY "Admin insert team season stats" ON public.team_season_stats FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update team season stats" ON public.team_season_stats FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete team season stats" ON public.team_season_stats FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- matches_archive
DROP POLICY "Admins can manage archived matches" ON public.matches_archive;
CREATE POLICY "Admin insert archived matches" ON public.matches_archive FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update archived matches" ON public.matches_archive FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete archived matches" ON public.matches_archive FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- =============================================
-- GROUP 2: team_details_archive
-- =============================================
DROP POLICY "Admins can manage archive" ON public.team_details_archive;
DROP POLICY "Admin users can update archive" ON public.team_details_archive;
CREATE POLICY "Admin insert archive" ON public.team_details_archive FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update archive" ON public.team_details_archive FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete archive" ON public.team_details_archive FOR DELETE TO authenticated
  USING (current_user_is_admin());

-- =============================================
-- GROUP 3: teams - drop redundant ALL
-- =============================================
DROP POLICY "Admins full access to teams" ON public.teams;

-- =============================================
-- GROUP 4: seasons - drop redundant authenticated SELECT
-- =============================================
DROP POLICY "Authenticated users can read seasons" ON public.seasons;

-- =============================================
-- GROUP 5: Combine overlapping SELECT policies
-- =============================================

-- hero_cards
DROP POLICY "Admins can view all hero cards" ON public.hero_cards;
DROP POLICY "Public can view visible hero cards" ON public.hero_cards;
CREATE POLICY "Read hero cards" ON public.hero_cards FOR SELECT
  USING (is_visible = true OR current_user_is_admin());

-- profiles
DROP POLICY "Admins can view all profiles" ON public.profiles;
DROP POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR current_user_is_admin());
