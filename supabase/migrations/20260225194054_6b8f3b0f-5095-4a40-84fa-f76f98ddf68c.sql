
-- 1. participants: restrict INSERT/UPDATE/DELETE to admin
DROP POLICY "Authenticated delete participants" ON participants;
DROP POLICY "Authenticated insert participants" ON participants;
DROP POLICY "Authenticated update participants" ON participants;

CREATE POLICY "Admins can manage participants" ON participants
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 2. matches_archive: restrict ALL writes to admin
DROP POLICY "Service writes archived matches" ON matches_archive;
CREATE POLICY "Admins can manage archived matches" ON matches_archive
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 3. team_details_archive: restrict ALL writes to admin
DROP POLICY "service writes archive" ON team_details_archive;
CREATE POLICY "Admins can manage archive" ON team_details_archive
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 4. ranking_snapshots: restrict INSERT/UPDATE to admin
DROP POLICY "Authenticated users can insert rankings" ON ranking_snapshots;
DROP POLICY "Authenticated users can update rankings" ON ranking_snapshots;

CREATE POLICY "Admins can insert rankings" ON ranking_snapshots
  FOR INSERT WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can update rankings" ON ranking_snapshots
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 5. playoff_games: restrict all writes to admin, open SELECT to public
DROP POLICY "Authenticated users can delete playoff games" ON playoff_games;
DROP POLICY "Authenticated users can insert playoff games" ON playoff_games;
DROP POLICY "Authenticated users can update playoff games" ON playoff_games;
DROP POLICY "Authenticated users can select playoff games" ON playoff_games;

CREATE POLICY "Admins can manage playoff games" ON playoff_games
  FOR ALL USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Public can view playoff games" ON playoff_games
  FOR SELECT USING (true);

-- 6. score_submissions: restrict UPDATE to admin
DROP POLICY "Allow authenticated users to update score submissions" ON score_submissions;
CREATE POLICY "Admins can update score submissions" ON score_submissions
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

-- 7. season_team_participation: restrict UPDATE to admin
DROP POLICY "Anyone can update participation" ON season_team_participation;
CREATE POLICY "Admins can update participation" ON season_team_participation
  FOR UPDATE USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
