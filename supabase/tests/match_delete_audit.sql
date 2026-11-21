\set ON_ERROR_STOP on

-- The audit trail for match deletes (20261121120000).
--
-- Every DELETE on public.matches must write ONE security_audit_log row
-- (action match_delete, record_id = the match id, old_values = the whole old row,
-- user_id = auth.uid()), and the log must never block or change the delete:
--   logged     an admin delete through delete_match_with_stats_reversal() (an
--              open match and a completed match that is not archived), and a
--              delete with no signed-in person (user_id empty: the SQL editor,
--              cron, the service role)
--   not logged a season archive delete: archive_season() and
--              partial_archive_season() copy the completed matches into
--              matches_archive (same id) and then delete them from matches. That
--              is a move, not a delete. A refused delete (a non-admin calling the
--              RPC) writes nothing either, because nothing was deleted.
-- The audit is failure-safe: if the audit write fails, the delete still lands
-- (case 6). The games and rounds of a deleted match go with it by cascade and
-- are NOT logged (case 3).
--
-- Plain counts run as the owner. The counts only look at rows of this test's
-- matches.
--
-- Case 6 forces the audit insert to fail on purpose. The function turns that into
-- a WARNING, so the log of this file holds one expected line:
--   WARNING:  audit_match_delete failed on matches DELETE: ...

BEGIN;

-- Count of match_delete audit rows for the fixture matches. p_id NULL means every
-- fixture match; p_user NULL means any user.
CREATE FUNCTION pg_temp.del_n(p_id uuid DEFAULT NULL, p_user uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT count(*)
  FROM public.security_audit_log l
  WHERE l.action = 'match_delete'
    AND (p_id IS NULL OR l.record_id = p_id)
    AND (p_user IS NULL OR l.user_id = p_user)
    AND l.record_id IN (
      '00000000-0000-0000-0000-00000000d701',
      '00000000-0000-0000-0000-00000000d702',
      '00000000-0000-0000-0000-00000000d703',
      '00000000-0000-0000-0000-00000000d704',
      '00000000-0000-0000-0000-00000000d705',
      '00000000-0000-0000-0000-00000000d706',
      '00000000-0000-0000-0000-00000000d707',
      '00000000-0000-0000-0000-00000000d708',
      '00000000-0000-0000-0000-00000000d709'
    );
$$;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a701';
  v_scorer_id uuid := '00000000-0000-0000-0000-00000000a702';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b701';
  v_stale_season_id uuid := '00000000-0000-0000-0000-00000000b702';
  v_partial_season_id uuid := '00000000-0000-0000-0000-00000000b703';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b7d1';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c701';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c702';
  v_open_id uuid := '00000000-0000-0000-0000-00000000d701';     -- open match, case 2
  v_done_id uuid := '00000000-0000-0000-0000-00000000d702';     -- completed, not archived, case 3
  v_arch1_id uuid := '00000000-0000-0000-0000-00000000d703';    -- archive_season, case 4
  v_arch2_id uuid := '00000000-0000-0000-0000-00000000d704';    -- archive_season, case 4
  v_arch_open_id uuid := '00000000-0000-0000-0000-00000000d705'; -- open match of the archived season
  v_part_id uuid := '00000000-0000-0000-0000-00000000d706';     -- partial_archive_season, case 4
  v_nojwt_id uuid := '00000000-0000-0000-0000-00000000d707';    -- no signed-in person, case 5
  v_fail_id uuid := '00000000-0000-0000-0000-00000000d708';     -- failing audit, case 6
  v_refused_id uuid := '00000000-0000-0000-0000-00000000d709';  -- refused delete, case 1
  v_game_id uuid := '00000000-0000-0000-0000-00000000e701';
  v_func oid;
  v_trig record;
  v_row record;
  v_before jsonb;
  v_n bigint;
  v_n2 bigint;
  v_rows integer;
  v_gone integer;
  v_triggers integer;
  v_archived integer;
  v_left integer;
  v_has_constraint boolean;
  v_err_text text;
BEGIN
  -- Fixture reset (children first, so a re-run on a dirty database works).
  -- Audit rows are never deleted: the start check below wants none.
  DELETE FROM public.matches_archive WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.match_rounds WHERE match_id IN (v_open_id, v_done_id, v_arch1_id, v_arch2_id, v_arch_open_id, v_part_id, v_nojwt_id, v_fail_id, v_refused_id);
  DELETE FROM public.games WHERE match_id IN (v_open_id, v_done_id, v_arch1_id, v_arch2_id, v_arch_open_id, v_part_id, v_nojwt_id, v_fail_id, v_refused_id);
  DELETE FROM public.matches WHERE id IN (v_open_id, v_done_id, v_arch1_id, v_arch2_id, v_arch_open_id, v_part_id, v_nojwt_id, v_fail_id, v_refused_id);
  DELETE FROM public.team_details_archive WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.team_season_stats WHERE season_id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id IN (v_season_id, v_stale_season_id, v_partial_season_id);
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_scorer_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_scorer_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'match-delete-admin@example.test'),
    (v_scorer_id, 'match-delete-scorer@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'match_delete_admin', 'Match Delete Admin', true),
    (v_scorer_id, 'match_delete_scorer', 'Match Delete Scorer', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  -- One season being played now, and two older inactive seasons for the archive.
  INSERT INTO public.seasons (id, name, start_date, end_date, is_active, is_archived) VALUES
    (v_season_id, 'Match Delete Season', '2026-01-01', NULL, false, false),
    (v_stale_season_id, 'Match Delete Archive Season', '2024-01-01', '2024-06-30', false, false),
    (v_partial_season_id, 'Match Delete Partial Season', '2025-01-01', '2025-06-30', false, false);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Match Delete Division', 'Match Delete Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Match Delete Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Match Delete Team 2', v_division_id, 0, 0, 0, 0);

  -- Fixture for case 2: an open (practice) match.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_open_id, v_team1_id, v_team2_id, v_season_id, 1, false);
  -- Fixture for case 3: a completed match that holds a game and two rounds.
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id, round_number,
                              iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_done_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_season_id, 2, true, 2, 1);
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game_id, v_done_id, 1, 'completed', v_team1_id, 21, 10);
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_done_id, v_game_id, 1, 6, 0),
    (v_done_id, v_game_id, 2, 4, 0);
  -- Fixture for case 4: two completed matches and one open match in the season that
  -- archive_season() archives; one completed match in the partial-archive season.
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id, round_number,
                              iscompleted, team1_game_wins, team2_game_wins) VALUES
    (v_arch1_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_stale_season_id, 1, true, 2, 0),
    (v_arch2_id, v_team1_id, v_team2_id, v_team2_id, v_team1_id, v_stale_season_id, 2, true, 1, 2),
    (v_part_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_partial_season_id, 1, true, 2, 1);
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_arch_open_id, v_team1_id, v_team2_id, v_stale_season_id, 3, false);
  -- Fixtures for cases 5, 6 and 1: three more open matches.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted) VALUES
    (v_nojwt_id, v_team1_id, v_team2_id, v_season_id, 3, false),
    (v_fail_id, v_team1_id, v_team2_id, v_season_id, 4, false),
    (v_refused_id, v_team1_id, v_team2_id, v_season_id, 5, false);

  IF pg_temp.del_n() <> 0 THEN
    RAISE EXCEPTION 'the fixture inserts already wrote match_delete audit rows, got %', pg_temp.del_n();
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 1: a non-admin calls the delete RPC.
  -- The RPC refuses, the match stays, nothing is logged.
  -- ---------------------------------------------------------------------
  PERFORM auth.set_test_claims(v_scorer_id);
  BEGIN
    PERFORM public.delete_match_with_stats_reversal(v_refused_id);
    RAISE EXCEPTION 'a non-admin deleted a match through the RPC';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;
  PERFORM auth.set_test_claims(NULL);
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_refused_id) THEN
    RAISE EXCEPTION 'the refused delete removed the match anyway';
  END IF;
  IF pg_temp.del_n() <> 0 THEN
    RAISE EXCEPTION 'a refused delete wrote % match_delete row(s), expected 0', pg_temp.del_n();
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 2: an admin deletes an open match through the RPC -> exactly one row,
  -- naming the admin, with the whole old row.
  -- ---------------------------------------------------------------------
  SELECT to_jsonb(m) INTO v_before FROM public.matches m WHERE m.id = v_open_id;

  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.delete_match_with_stats_reversal(v_open_id);
  PERFORM auth.set_test_claims(NULL);

  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_open_id) THEN
    RAISE EXCEPTION 'the RPC did not delete the open match';
  END IF;
  IF pg_temp.del_n(v_open_id) <> 1 THEN
    RAISE EXCEPTION 'an admin delete of an open match wrote % match_delete rows, expected 1', pg_temp.del_n(v_open_id);
  END IF;
  IF pg_temp.del_n() <> 1 THEN
    RAISE EXCEPTION 'expected 1 match_delete row in all after case 2, got %', pg_temp.del_n();
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'match_delete' AND record_id = v_open_id;
  IF v_row.user_id IS DISTINCT FROM v_admin_id THEN
    RAISE EXCEPTION 'the match_delete row names % instead of the admin', v_row.user_id;
  END IF;
  IF v_row.table_name IS DISTINCT FROM 'matches' THEN
    RAISE EXCEPTION 'the match_delete row has table_name %', v_row.table_name;
  END IF;
  IF v_row.new_values IS NOT NULL THEN
    RAISE EXCEPTION 'the match_delete row holds new_values: %', v_row.new_values;
  END IF;
  IF v_row.created_at IS NULL THEN
    RAISE EXCEPTION 'the match_delete row has no time';
  END IF;
  IF v_row.old_values IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'old_values is not the whole deleted row: got % expected %', v_row.old_values, v_before;
  END IF;
  IF v_row.old_values ->> 'team1_id' <> v_team1_id::text
     OR v_row.old_values ->> 'season_id' <> v_season_id::text
     OR (v_row.old_values ->> 'round_number')::int <> 1 THEN
    RAISE EXCEPTION 'old_values misses the teams, season or round: %', v_row.old_values;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 3: a completed match that is NOT in matches_archive, deleted through the
  -- RPC (stats reversed) -> exactly one row. Its game and rounds go by cascade and
  -- are not logged.
  -- ---------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_done_id) THEN
    RAISE EXCEPTION 'fixture error: the completed match is already in matches_archive';
  END IF;
  SELECT to_jsonb(m) INTO v_before FROM public.matches m WHERE m.id = v_done_id;

  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.delete_match_with_stats_reversal(v_done_id);
  PERFORM auth.set_test_claims(NULL);

  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_done_id)
     OR EXISTS (SELECT 1 FROM public.games WHERE match_id = v_done_id)
     OR EXISTS (SELECT 1 FROM public.match_rounds WHERE match_id = v_done_id) THEN
    RAISE EXCEPTION 'the RPC left the completed match, its game or its rounds behind';
  END IF;
  IF pg_temp.del_n(v_done_id) <> 1 THEN
    RAISE EXCEPTION 'a completed-match delete wrote % match_delete rows, expected 1', pg_temp.del_n(v_done_id);
  END IF;
  IF pg_temp.del_n() <> 2 THEN
    RAISE EXCEPTION 'expected 2 match_delete rows in all after case 3, got %', pg_temp.del_n();
  END IF;
  IF (SELECT old_values FROM public.security_audit_log
      WHERE action = 'match_delete' AND record_id = v_done_id) IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'the completed-match row does not hold the whole old row';
  END IF;
  IF (SELECT old_values ->> 'winner_id' FROM public.security_audit_log
      WHERE action = 'match_delete' AND record_id = v_done_id) IS DISTINCT FROM v_team1_id::text THEN
    RAISE EXCEPTION 'the completed-match row does not show the winner';
  END IF;
  -- The cascaded game and rounds wrote nothing: no live_* row for this match and
  -- no second match_delete row.
  IF EXISTS (
    SELECT 1 FROM public.security_audit_log l
    WHERE l.action LIKE 'live\_%'
      AND COALESCE(l.old_values ->> 'match_id', l.new_values ->> 'match_id') = v_done_id::text
  ) THEN
    RAISE EXCEPTION 'the cascade wrote live_* audit rows for the deleted match';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 4: the season archive functions MOVE completed matches into
  -- matches_archive and delete them from matches. No match_delete rows.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.del_n();

  -- 4a: archive_season() on an old, inactive season: 2 completed matches move,
  -- the open match stays.
  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.archive_season(v_stale_season_id);
  PERFORM auth.set_test_claims(NULL);

  SELECT count(*) INTO v_archived FROM public.matches_archive
  WHERE id IN (v_arch1_id, v_arch2_id) AND season_id = v_stale_season_id;
  IF v_archived <> 2 THEN
    RAISE EXCEPTION 'archive_season put % of 2 completed matches into matches_archive', v_archived;
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id IN (v_arch1_id, v_arch2_id)) THEN
    RAISE EXCEPTION 'archive_season left a completed match in matches';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_arch_open_id) THEN
    RAISE EXCEPTION 'archive_season removed the open match, which it must leave alone';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_arch1_id AND winner_id = v_team1_id)
     OR NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_arch2_id AND winner_id = v_team2_id) THEN
    RAISE EXCEPTION 'matches_archive lost the winner of an archived match';
  END IF;
  IF pg_temp.del_n() <> v_n THEN
    RAISE EXCEPTION 'archive_season wrote % match_delete row(s), expected 0', pg_temp.del_n() - v_n;
  END IF;

  -- 4b: partial_archive_season() does the same for the playoffs hand-off.
  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.partial_archive_season(v_partial_season_id);
  PERFORM auth.set_test_claims(NULL);

  IF NOT EXISTS (SELECT 1 FROM public.matches_archive WHERE id = v_part_id AND season_id = v_partial_season_id) THEN
    RAISE EXCEPTION 'partial_archive_season did not put the completed match into matches_archive';
  END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_part_id) THEN
    RAISE EXCEPTION 'partial_archive_season left the completed match in matches';
  END IF;
  IF pg_temp.del_n() <> v_n THEN
    RAISE EXCEPTION 'partial_archive_season wrote % match_delete row(s), expected 0', pg_temp.del_n() - v_n;
  END IF;

  -- 4c: the archive skip is by lookup in matches_archive. A real delete of the
  -- archive season's open match (not in matches_archive) is still logged.
  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.delete_match_with_stats_reversal(v_arch_open_id);
  PERFORM auth.set_test_claims(NULL);
  IF pg_temp.del_n(v_arch_open_id) <> 1 THEN
    RAISE EXCEPTION 'deleting the open match of an archived season wrote % rows, expected 1', pg_temp.del_n(v_arch_open_id);
  END IF;
  IF pg_temp.del_n() <> v_n + 1 THEN
    RAISE EXCEPTION 'expected % match_delete rows in all after case 4, got %', v_n + 1, pg_temp.del_n();
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 5: no signed-in person (the SQL editor, cron, the service role). The
  -- delete is logged anyway, with an empty user_id (Doug, 2026-11-21).
  -- ---------------------------------------------------------------------
  v_n := pg_temp.del_n();
  PERFORM auth.set_test_claims(NULL);
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'fixture error: auth.uid() is not empty, got %', auth.uid();
  END IF;
  SELECT to_jsonb(m) INTO v_before FROM public.matches m WHERE m.id = v_nojwt_id;
  DELETE FROM public.matches WHERE id = v_nojwt_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the owner delete did not apply, % rows', v_rows; END IF;
  IF pg_temp.del_n(v_nojwt_id) <> 1 THEN
    RAISE EXCEPTION 'a delete with no signed-in person wrote % rows, expected 1', pg_temp.del_n(v_nojwt_id);
  END IF;
  IF pg_temp.del_n() <> v_n + 1 THEN
    RAISE EXCEPTION 'a delete with no signed-in person wrote % rows in all, expected 1', pg_temp.del_n() - v_n;
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'match_delete' AND record_id = v_nojwt_id;
  IF v_row.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'the no-JWT row names % instead of an empty user', v_row.user_id;
  END IF;
  IF v_row.old_values IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'the no-JWT row does not hold the whole old row: %', v_row.old_values;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 6: FAILURE-SAFE. Make every audit insert fail, then show that an admin
  -- match delete still lands and writes no audit row. The savepoint (inner block)
  -- rolls the constraint and the delete back.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.del_n();
  v_gone := NULL; v_n2 := NULL;
  BEGIN
    ALTER TABLE public.security_audit_log
      ADD CONSTRAINT zz_fail CHECK (false) NOT VALID;

    -- The failure is real: a direct audit write is refused.
    BEGIN
      INSERT INTO public.security_audit_log (action, table_name) VALUES ('match_delete', 'probe');
      RAISE EXCEPTION 'the failure constraint did not refuse a direct audit write';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    PERFORM auth.set_test_claims(v_admin_id);
    PERFORM public.delete_match_with_stats_reversal(v_fail_id);
    PERFORM auth.set_test_claims(NULL);
    SELECT count(*) INTO v_gone FROM public.matches WHERE id = v_fail_id;
    v_n2 := pg_temp.del_n();

    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_gone IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'the match delete did not land when the audit failed, % row(s) left', v_gone;
  END IF;
  IF v_n2 IS DISTINCT FROM v_n THEN
    RAISE EXCEPTION 'audit rows appeared although the audit insert was failing: % before, % after', v_n, v_n2;
  END IF;
  -- The savepoint rolled everything back: constraint gone, match back.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zz_fail'
      AND conrelid = 'public.security_audit_log'::regclass
  ) INTO v_has_constraint;
  IF v_has_constraint THEN RAISE EXCEPTION 'the failure constraint was not rolled back'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_fail_id) THEN
    RAISE EXCEPTION 'the savepoint did not roll back the match delete';
  END IF;
  IF pg_temp.del_n() <> v_n THEN
    RAISE EXCEPTION 'the audit count moved after the savepoint rollback';
  END IF;

  -- With the constraint gone the same delete is logged again.
  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.delete_match_with_stats_reversal(v_fail_id);
  PERFORM auth.set_test_claims(NULL);
  IF pg_temp.del_n(v_fail_id, v_admin_id) <> 1 THEN
    RAISE EXCEPTION 'the delete was not logged once the audit worked again';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 7: the function and the trigger.
  -- ---------------------------------------------------------------------
  SELECT p.oid INTO v_func
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'audit_match_delete';
  IF v_func IS NULL THEN
    RAISE EXCEPTION 'function audit_match_delete is missing';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_func) THEN
    RAISE EXCEPTION 'audit_match_delete is not SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) c
    WHERE p.oid = v_func AND c = 'search_path=pg_catalog, public'
  ) THEN
    RAISE EXCEPTION 'audit_match_delete does not pin search_path to pg_catalog, public: %',
      (SELECT proconfig FROM pg_proc WHERE oid = v_func);
  END IF;
  IF has_function_privilege('anon', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute audit_match_delete';
  END IF;
  IF has_function_privilege('authenticated', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute audit_match_delete';
  END IF;

  -- tgtype bits: 1 row, 2 BEFORE, 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE.
  SELECT count(*) INTO v_triggers
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.matches'::regclass AND t.tgname = 'audit_match_delete' AND NOT t.tgisinternal;
  IF v_triggers <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 trigger audit_match_delete on matches, found %', v_triggers;
  END IF;
  SELECT t.tgtype, t.tgenabled, t.tgfoid, t.tgqual IS NOT NULL AS has_when INTO v_trig
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.matches'::regclass AND t.tgname = 'audit_match_delete' AND NOT t.tgisinternal;
  IF v_trig.tgfoid <> v_func THEN RAISE EXCEPTION 'the matches trigger calls the wrong function'; END IF;
  IF v_trig.tgenabled <> 'O' THEN RAISE EXCEPTION 'the matches trigger is not enabled, got %', v_trig.tgenabled; END IF;
  IF (v_trig.tgtype & 1) = 0 THEN RAISE EXCEPTION 'the matches trigger is not row-level'; END IF;
  IF (v_trig.tgtype & 2) <> 0 THEN RAISE EXCEPTION 'the matches trigger is BEFORE, expected AFTER'; END IF;
  IF (v_trig.tgtype & 4) <> 0 THEN RAISE EXCEPTION 'the matches trigger fires on INSERT, it must not'; END IF;
  IF (v_trig.tgtype & 8) = 0 THEN RAISE EXCEPTION 'the matches trigger does not fire on DELETE'; END IF;
  IF (v_trig.tgtype & 16) <> 0 THEN RAISE EXCEPTION 'the matches trigger fires on UPDATE, it must not'; END IF;
  IF (v_trig.tgtype & 32) <> 0 THEN RAISE EXCEPTION 'the matches trigger fires on TRUNCATE, it must not'; END IF;
  IF v_trig.has_when THEN RAISE EXCEPTION 'the matches trigger has a WHEN clause, it must not'; END IF;

  -- The old cleanup trigger is still there and untouched by this migration.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.matches'::regclass AND NOT t.tgisinternal
      AND t.tgname <> 'audit_match_delete' AND (t.tgtype & 8) <> 0
  ) THEN
    RAISE EXCEPTION 'the other DELETE triggers on matches are gone';
  END IF;

  -- The refused match (case 1) is the only fixture match left in matches.
  SELECT count(*) INTO v_left FROM public.matches
  WHERE id IN (v_open_id, v_done_id, v_arch1_id, v_arch2_id, v_arch_open_id, v_part_id, v_nojwt_id, v_fail_id, v_refused_id);
  IF v_left <> 1 OR NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_refused_id) THEN
    RAISE EXCEPTION 'expected only the refused match to be left, found % fixture match(es)', v_left;
  END IF;

  -- Final tally: open match, completed match, archive-season open match, no-JWT
  -- match, failing-audit match (logged on the second try) = 5 rows. The 3
  -- archived matches wrote none.
  IF pg_temp.del_n() <> 5 THEN
    RAISE EXCEPTION 'expected 5 match_delete rows at the end, got %', pg_temp.del_n();
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.security_audit_log
    WHERE action = 'match_delete'
      AND record_id IN (v_arch1_id, v_arch2_id, v_part_id, v_refused_id)
  ) THEN
    RAISE EXCEPTION 'an archived or refused match has a match_delete row';
  END IF;

  RAISE NOTICE 'match_delete_audit smoke test passed';
END $$;

ROLLBACK;
