\set ON_ERROR_STOP on

-- The audit trail for live-scoring corrections (20261120130000).
--
-- Who undid a round, edited or deleted a round, reopened a game, changed a
-- winner or deleted a game must land in security_audit_log, for ANY signed-in
-- actor (a scorer's undo too), and the normal flow must write nothing:
--   logged     match_rounds DELETE and a real UPDATE, games UPDATE of a
--              COMPLETED game (reopen, winner change), games DELETE
--   not logged any INSERT, a normal game finish (in_progress -> completed), a
--              save that changes nothing, the touch trigger's updated_at write
--              (20261120120000), a cascaded delete, and a caller with no
--              auth.uid() (cron, service role, the SQL editor)
-- The audit is failure-safe: if the audit write fails, the scorer's change still
-- lands (case 9).
--
-- Scorers cannot read security_audit_log (RLS), so every count runs as the owner
-- (after RESET ROLE). The counts only look at rows of this test's matches.
--
-- Case 9 forces the audit insert to fail on purpose. The function turns that into
-- a WARNING, so the log of this file holds two expected lines:
--   WARNING:  audit_live_scoring_correction failed on match_rounds UPDATE: ...
--   WARNING:  audit_live_scoring_correction failed on match_rounds DELETE: ...
--
-- Inside one test transaction now() never changes, so a game that must show a
-- changed updated_at gets an old stamp (2000-01-01) first. The stamp is planted
-- under session_replication_role = replica so set_games_updated_at does not
-- overwrite it, and no audit trigger fires for the plant.

BEGIN;

-- Count of live_* audit rows for the three fixture matches. p_action NULL means
-- every live_* action; p_user NULL means any user.
CREATE FUNCTION pg_temp.live_n(p_action text DEFAULT NULL, p_user uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT count(*)
  FROM public.security_audit_log l
  WHERE (l.action = p_action OR (p_action IS NULL AND l.action LIKE 'live\_%'))
    AND (p_user IS NULL OR l.user_id = p_user)
    AND COALESCE(l.old_values ->> 'match_id', l.new_values ->> 'match_id') IN (
      '00000000-0000-0000-0000-00000000d801',
      '00000000-0000-0000-0000-00000000d802',
      '00000000-0000-0000-0000-00000000d803'
    );
$$;

DO $$
DECLARE
  v_old timestamptz := '2000-01-01 00:00:00+00';
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a801';
  v_scorer_id uuid := '00000000-0000-0000-0000-00000000a802';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b801';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b802';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c801';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c802';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d801';
  v_match2_id uuid := '00000000-0000-0000-0000-00000000d802';
  v_match3_id uuid := '00000000-0000-0000-0000-00000000d803';
  v_game1_id uuid := '00000000-0000-0000-0000-00000000e801';
  v_game2_id uuid := '00000000-0000-0000-0000-00000000e802';
  v_game3_id uuid := '00000000-0000-0000-0000-00000000e803';
  v_game4_id uuid := '00000000-0000-0000-0000-00000000e804';
  v_game5_id uuid := '00000000-0000-0000-0000-00000000e805';
  v_game6_id uuid := '00000000-0000-0000-0000-00000000e806';
  v_round1_id uuid := '00000000-0000-0000-0000-00000000f801';
  v_round2_id uuid := '00000000-0000-0000-0000-00000000f802';
  v_round3_id uuid := '00000000-0000-0000-0000-00000000f803';
  v_round4_id uuid := '00000000-0000-0000-0000-00000000f804';
  v_thrower_id uuid := '00000000-0000-0000-0000-00000000f8a1';
  v_func oid;
  v_trig record;
  v_row record;
  v_n bigint;
  v_n2 bigint;
  v_n3 bigint;
  v_rows integer;
  v_issues bigint;
  v_stamp timestamptz;
  v_score integer;
  v_has_constraint boolean;
BEGIN
  -- Fixture reset (children first, so a re-run on a dirty database works).
  -- Audit rows are never deleted: the start check below wants none.
  DELETE FROM public.match_rounds WHERE match_id IN (v_match_id, v_match2_id, v_match3_id);
  DELETE FROM public.games WHERE match_id IN (v_match_id, v_match2_id, v_match3_id);
  DELETE FROM public.matches WHERE id IN (v_match_id, v_match2_id, v_match3_id);
  DELETE FROM public.team_players WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_memberships WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_scorer_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_scorer_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'live-audit-admin@example.test'),
    (v_scorer_id, 'live-audit-scorer@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'live_audit_admin', 'Live Audit Admin', true),
    (v_scorer_id, 'live_audit_scorer', 'Live Audit Scorer', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Live Audit Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Live Audit Division', 'Live Audit Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Live Audit Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Live Audit Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.team_players (id, team_id, display_name)
  VALUES (v_thrower_id, v_team1_id, 'Live Audit Thrower');
  -- The scorer is an approved member of team 1: a scorer, not an admin.
  INSERT INTO public.team_memberships (team_id, user_id, is_approved, approved_by, approved_at)
  VALUES (v_team1_id, v_scorer_id, true, v_admin_id, now());

  -- Match 1 is the open match. Game 1 (rounds 1 and 2) and game 2 (round 3) are
  -- in progress. Game 3 is finished (round 4).
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, false);
  INSERT INTO public.games (id, match_id, game_number, status) VALUES
    (v_game1_id, v_match_id, 1, 'in_progress'),
    (v_game2_id, v_match_id, 2, 'in_progress');
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game3_id, v_match_id, 3, 'completed', v_team1_id, 21, 10);
  INSERT INTO public.match_rounds (id, match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_round1_id, v_match_id, v_game1_id, 1, 5, 0),
    (v_round2_id, v_match_id, v_game1_id, 2, 0, 3),
    (v_round3_id, v_match_id, v_game2_id, 1, 4, 0),
    (v_round4_id, v_match_id, v_game3_id, 1, 6, 0);

  IF pg_temp.live_n() <> 0 THEN
    RAISE EXCEPTION 'the fixture inserts already wrote live_* audit rows, got %', pg_temp.live_n();
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 1: the function, the triggers and the drift helper.
  -- ---------------------------------------------------------------------
  SELECT p.oid INTO v_func
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'audit_live_scoring_correction';
  IF v_func IS NULL THEN
    RAISE EXCEPTION 'function audit_live_scoring_correction is missing';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_func) THEN
    RAISE EXCEPTION 'audit_live_scoring_correction is not SECURITY DEFINER';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) c
    WHERE p.oid = v_func AND c = 'search_path=pg_catalog, public'
  ) THEN
    RAISE EXCEPTION 'audit_live_scoring_correction does not pin search_path to pg_catalog, public: %',
      (SELECT proconfig FROM pg_proc WHERE oid = v_func);
  END IF;
  IF has_function_privilege('anon', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute audit_live_scoring_correction';
  END IF;
  IF has_function_privilege('authenticated', v_func, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute audit_live_scoring_correction';
  END IF;

  -- tgtype bits: 1 row, 2 BEFORE, 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE.
  -- 1a: match_rounds, one trigger for UPDATE and DELETE, no WHEN.
  SELECT t.tgtype, t.tgenabled, t.tgfoid, t.tgqual IS NOT NULL AS has_when INTO v_trig
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.match_rounds'::regclass
    AND t.tgname = 'audit_live_scoring_correction' AND NOT t.tgisinternal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trigger audit_live_scoring_correction is missing on match_rounds';
  END IF;
  IF v_trig.tgfoid <> v_func THEN RAISE EXCEPTION 'match_rounds trigger calls the wrong function'; END IF;
  IF v_trig.tgenabled <> 'O' THEN RAISE EXCEPTION 'match_rounds trigger is not enabled, got %', v_trig.tgenabled; END IF;
  IF (v_trig.tgtype & 1) = 0 THEN RAISE EXCEPTION 'match_rounds trigger is not row-level'; END IF;
  IF (v_trig.tgtype & 2) <> 0 THEN RAISE EXCEPTION 'match_rounds trigger is BEFORE, expected AFTER'; END IF;
  IF (v_trig.tgtype & 4) <> 0 THEN RAISE EXCEPTION 'match_rounds trigger fires on INSERT, it must not'; END IF;
  IF (v_trig.tgtype & 8) = 0 THEN RAISE EXCEPTION 'match_rounds trigger does not fire on DELETE'; END IF;
  IF (v_trig.tgtype & 16) = 0 THEN RAISE EXCEPTION 'match_rounds trigger does not fire on UPDATE'; END IF;
  IF (v_trig.tgtype & 32) <> 0 THEN RAISE EXCEPTION 'match_rounds trigger fires on TRUNCATE, it must not'; END IF;
  IF v_trig.has_when THEN RAISE EXCEPTION 'match_rounds trigger has a WHEN clause, it must not'; END IF;

  -- 1b: games UPDATE trigger, UPDATE only, with a WHEN clause.
  SELECT t.tgtype, t.tgenabled, t.tgfoid, t.tgqual IS NOT NULL AS has_when,
         pg_get_triggerdef(t.oid) AS def INTO v_trig
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.games'::regclass
    AND t.tgname = 'audit_live_scoring_correction_upd' AND NOT t.tgisinternal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trigger audit_live_scoring_correction_upd is missing on games';
  END IF;
  IF v_trig.tgfoid <> v_func THEN RAISE EXCEPTION 'games UPDATE trigger calls the wrong function'; END IF;
  IF v_trig.tgenabled <> 'O' THEN RAISE EXCEPTION 'games UPDATE trigger is not enabled, got %', v_trig.tgenabled; END IF;
  IF (v_trig.tgtype & 1) = 0 THEN RAISE EXCEPTION 'games UPDATE trigger is not row-level'; END IF;
  IF (v_trig.tgtype & 2) <> 0 THEN RAISE EXCEPTION 'games UPDATE trigger is BEFORE, expected AFTER'; END IF;
  IF (v_trig.tgtype & 4) <> 0 THEN RAISE EXCEPTION 'games UPDATE trigger fires on INSERT, it must not'; END IF;
  IF (v_trig.tgtype & 8) <> 0 THEN RAISE EXCEPTION 'games UPDATE trigger fires on DELETE, it must not'; END IF;
  IF (v_trig.tgtype & 16) = 0 THEN RAISE EXCEPTION 'games UPDATE trigger does not fire on UPDATE'; END IF;
  IF (v_trig.tgtype & 32) <> 0 THEN RAISE EXCEPTION 'games UPDATE trigger fires on TRUNCATE, it must not'; END IF;
  IF NOT v_trig.has_when OR v_trig.def NOT LIKE '%completed%' THEN
    RAISE EXCEPTION 'games UPDATE trigger has no WHEN on the completed status: %', v_trig.def;
  END IF;

  -- 1c: games DELETE trigger, DELETE only, no WHEN.
  SELECT t.tgtype, t.tgenabled, t.tgfoid, t.tgqual IS NOT NULL AS has_when INTO v_trig
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.games'::regclass
    AND t.tgname = 'audit_live_scoring_correction_del' AND NOT t.tgisinternal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trigger audit_live_scoring_correction_del is missing on games';
  END IF;
  IF v_trig.tgfoid <> v_func THEN RAISE EXCEPTION 'games DELETE trigger calls the wrong function'; END IF;
  IF v_trig.tgenabled <> 'O' THEN RAISE EXCEPTION 'games DELETE trigger is not enabled, got %', v_trig.tgenabled; END IF;
  IF (v_trig.tgtype & 1) = 0 THEN RAISE EXCEPTION 'games DELETE trigger is not row-level'; END IF;
  IF (v_trig.tgtype & 2) <> 0 THEN RAISE EXCEPTION 'games DELETE trigger is BEFORE, expected AFTER'; END IF;
  IF (v_trig.tgtype & 4) <> 0 THEN RAISE EXCEPTION 'games DELETE trigger fires on INSERT, it must not'; END IF;
  IF (v_trig.tgtype & 8) = 0 THEN RAISE EXCEPTION 'games DELETE trigger does not fire on DELETE'; END IF;
  IF (v_trig.tgtype & 16) <> 0 THEN RAISE EXCEPTION 'games DELETE trigger fires on UPDATE, it must not'; END IF;
  IF (v_trig.tgtype & 32) <> 0 THEN RAISE EXCEPTION 'games DELETE trigger fires on TRUNCATE, it must not'; END IF;
  IF v_trig.has_when THEN RAISE EXCEPTION 'games DELETE trigger has a WHEN clause, it must not'; END IF;

  -- The drift helper is clean on the migrated database.
  SELECT count(*) INTO v_issues FROM public.live_scoring_audit_coverage_drift();
  IF v_issues <> 0 THEN
    RAISE EXCEPTION 'live_scoring_audit_coverage_drift reports % issue(s) on a clean database: %',
      v_issues, (SELECT string_agg(issue, '; ') FROM public.live_scoring_audit_coverage_drift());
  END IF;

  -- And it notices each kind of damage. Every probe runs in a savepoint (the
  -- inner block) that a sentinel error rolls back.
  -- Probe 1: a dropped trigger.
  v_n := NULL;
  BEGIN
    DROP TRIGGER audit_live_scoring_correction_upd ON public.games;
    SELECT count(*) INTO v_n FROM public.live_scoring_audit_coverage_drift();
    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'the drift helper did not report a dropped games UPDATE trigger, got % issue(s)', v_n;
  END IF;

  -- Probe 2: a disabled trigger.
  v_n := NULL;
  BEGIN
    ALTER TABLE public.match_rounds DISABLE TRIGGER audit_live_scoring_correction;
    SELECT count(*) INTO v_n FROM public.live_scoring_audit_coverage_drift();
    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'the drift helper did not report a disabled trigger, got % issue(s)', v_n;
  END IF;

  -- Probe 3: a trigger widened to INSERT.
  v_n := NULL;
  BEGIN
    DROP TRIGGER audit_live_scoring_correction ON public.match_rounds;
    CREATE TRIGGER audit_live_scoring_correction
      AFTER INSERT OR UPDATE OR DELETE ON public.match_rounds
      FOR EACH ROW EXECUTE FUNCTION public.audit_live_scoring_correction();
    SELECT count(*) INTO v_n FROM public.live_scoring_audit_coverage_drift();
    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'the drift helper did not report an INSERT trigger, got % issue(s)', v_n;
  END IF;

  -- Probe 4: the games UPDATE trigger without its WHEN clause.
  v_n := NULL;
  BEGIN
    DROP TRIGGER audit_live_scoring_correction_upd ON public.games;
    CREATE TRIGGER audit_live_scoring_correction_upd
      AFTER UPDATE ON public.games
      FOR EACH ROW EXECUTE FUNCTION public.audit_live_scoring_correction();
    SELECT count(*) INTO v_n FROM public.live_scoring_audit_coverage_drift();
    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_n IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'the drift helper did not report a games UPDATE trigger without WHEN, got % issue(s)', v_n;
  END IF;

  -- Probe 5: the function gone. (The triggers go with it, so expect 4 rows:
  -- the function and the three triggers.)
  v_n := NULL;
  BEGIN
    DROP FUNCTION public.audit_live_scoring_correction() CASCADE;
    SELECT count(*) INTO v_n FROM public.live_scoring_audit_coverage_drift();
    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_n IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'the drift helper did not report a missing function and 3 missing triggers, got % issue(s)', v_n;
  END IF;

  -- The probes left everything as it was.
  SELECT count(*) INTO v_issues FROM public.live_scoring_audit_coverage_drift();
  IF v_issues <> 0 THEN
    RAISE EXCEPTION 'a drift probe was not rolled back, % issue(s) now', v_issues;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 2: an admin edits a round score -> one live_round_update row.
  -- Run as the admin under RLS ("Admin update rounds").
  -- ---------------------------------------------------------------------
  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.match_rounds SET team1_score = 7 WHERE id = v_round1_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_rows <> 1 THEN RAISE EXCEPTION 'the admin round edit did not apply, % rows', v_rows; END IF;
  IF pg_temp.live_n('live_round_update') <> 1 THEN
    RAISE EXCEPTION 'an admin score edit wrote % live_round_update rows, expected 1', pg_temp.live_n('live_round_update');
  END IF;
  IF pg_temp.live_n() <> 1 THEN
    RAISE EXCEPTION 'an admin score edit wrote % live_* rows in all, expected 1', pg_temp.live_n();
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'live_round_update' AND record_id = v_round1_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'no live_round_update row for round 1'; END IF;
  IF v_row.user_id IS DISTINCT FROM v_admin_id THEN
    RAISE EXCEPTION 'live_round_update names % instead of the admin', v_row.user_id;
  END IF;
  IF v_row.table_name <> 'match_rounds' THEN
    RAISE EXCEPTION 'live_round_update has table_name %', v_row.table_name;
  END IF;
  IF (v_row.old_values ->> 'team1_score')::int <> 5 OR (v_row.new_values ->> 'team1_score')::int <> 7 THEN
    RAISE EXCEPTION 'live_round_update snapshots are wrong: old % new %',
      v_row.old_values ->> 'team1_score', v_row.new_values ->> 'team1_score';
  END IF;
  IF v_row.old_values ->> 'match_id' <> v_match_id::text OR v_row.new_values ->> 'game_id' <> v_game1_id::text THEN
    RAISE EXCEPTION 'live_round_update snapshots do not hold the whole row: %', v_row.old_values;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 3: no-change saves write nothing; a real thrower-only change does.
  -- ---------------------------------------------------------------------
  -- 3a: the admin dialog re-sends the same scores.
  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.match_rounds SET team1_score = 7, team2_score = 0 WHERE id = v_round1_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the re-send did not apply, % rows', v_rows; END IF;
  IF pg_temp.live_n('live_round_update') <> 1 THEN
    RAISE EXCEPTION 're-sending the same scores wrote a row, % live_round_update rows now',
      pg_temp.live_n('live_round_update');
  END IF;

  -- 3b: a thrower-only change is a real change of the row.
  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.match_rounds SET team1_thrower_id = v_thrower_id WHERE id = v_round1_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the thrower edit did not apply, % rows', v_rows; END IF;
  IF pg_temp.live_n('live_round_update') <> 2 THEN
    RAISE EXCEPTION 'a thrower-only change wrote % rows in all, expected 2', pg_temp.live_n('live_round_update');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.security_audit_log
    WHERE action = 'live_round_update' AND record_id = v_round1_id
      AND old_values ->> 'team1_thrower_id' IS NULL
      AND new_values ->> 'team1_thrower_id' = v_thrower_id::text
  ) THEN
    RAISE EXCEPTION 'the thrower change row does not show the thrower in new_values';
  END IF;

  -- 3c: a games row that changes only updated_at is not a correction. Game 3 is
  -- completed, so the WHEN clause lets the trigger run; the function must still
  -- see "nothing but updated_at". The old stamp makes updated_at really change.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE id = v_game3_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games SET updated_at = updated_at WHERE id = v_game3_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  SELECT updated_at INTO v_stamp FROM public.games WHERE id = v_game3_id;
  IF v_rows <> 1 OR v_stamp IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'the updated_at-only update did not move updated_at, so the check below proves nothing';
  END IF;
  IF pg_temp.live_n('live_game_change') <> 0 THEN
    RAISE EXCEPTION 'an updated_at-only change of a completed game wrote a row';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 4: an admin deletes a round -> one live_round_delete row. Round 2 is
  -- in game 1, which is in progress, so the touch trigger also writes games
  -- updated_at: that write must NOT log (case 7 repeats this as normal flow).
  -- ---------------------------------------------------------------------
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.games SET updated_at = v_old WHERE id = v_game1_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  DELETE FROM public.match_rounds WHERE id = v_round2_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_rows <> 1 THEN RAISE EXCEPTION 'the admin could not delete the round, % rows', v_rows; END IF;
  IF (SELECT updated_at FROM public.games WHERE id = v_game1_id) IS NOT DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'the touch trigger did not run, so the games check below proves nothing';
  END IF;
  IF pg_temp.live_n('live_round_delete') <> 1 THEN
    RAISE EXCEPTION 'an admin round delete wrote % live_round_delete rows, expected 1',
      pg_temp.live_n('live_round_delete');
  END IF;
  IF pg_temp.live_n('live_game_change') <> 0 THEN
    RAISE EXCEPTION 'the touch trigger''s games write was logged';
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'live_round_delete' AND record_id = v_round2_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'no live_round_delete row for round 2'; END IF;
  IF v_row.user_id IS DISTINCT FROM v_admin_id THEN
    RAISE EXCEPTION 'live_round_delete names % instead of the admin', v_row.user_id;
  END IF;
  IF v_row.new_values IS NOT NULL THEN
    RAISE EXCEPTION 'live_round_delete holds new_values: %', v_row.new_values;
  END IF;
  IF (v_row.old_values ->> 'team2_score')::int <> 3
     OR (v_row.old_values ->> 'round_number')::int <> 2
     OR v_row.old_values ->> 'game_id' <> v_game1_id::text THEN
    RAISE EXCEPTION 'live_round_delete old_values is not the whole deleted row: %', v_row.old_values;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 5: a SCORER undoes the last round -> the delete works AND one row names
  -- the scorer. First the scorer inserts the round again (an insert logs
  -- nothing), then undoes it.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.live_n();
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'the role switch did not happen, current_user is %', current_user;
  END IF;
  INSERT INTO public.match_rounds (id, match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_round2_id, v_match_id, v_game1_id, 2, 0, 3, v_scorer_id);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the scorer could not insert a round, % rows', v_rows; END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'a scorer inserting a round wrote an audit row';
  END IF;

  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  DELETE FROM public.match_rounds WHERE id = v_round2_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_rows <> 1 THEN RAISE EXCEPTION 'the scorer could not undo the last round, deleted % rows', v_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.match_rounds WHERE id = v_round2_id) THEN
    RAISE EXCEPTION 'the undone round is still there';
  END IF;
  IF pg_temp.live_n('live_round_delete', v_scorer_id) <> 1 THEN
    RAISE EXCEPTION 'a scorer undo wrote % live_round_delete rows for the scorer, expected 1',
      pg_temp.live_n('live_round_delete', v_scorer_id);
  END IF;
  IF pg_temp.live_n('live_round_delete') <> 2 THEN
    RAISE EXCEPTION 'expected 2 live_round_delete rows in all (admin and scorer), got %',
      pg_temp.live_n('live_round_delete');
  END IF;
  IF (SELECT old_values ->> 'entered_by_user_id' FROM public.security_audit_log
      WHERE action = 'live_round_delete' AND user_id = v_scorer_id) IS DISTINCT FROM v_scorer_id::text THEN
    RAISE EXCEPTION 'the scorer undo row does not hold the deleted round';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 6: a SCORER reopens a completed game; an admin changes the winner of
  -- a completed game. Game 3 is completed (winner team 1).
  -- ---------------------------------------------------------------------
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games
  SET status = 'in_progress', winner_team_id = NULL, completed_at = NULL
  WHERE id = v_game3_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_rows <> 1 THEN RAISE EXCEPTION 'the scorer could not reopen the game, % rows', v_rows; END IF;
  IF (SELECT status FROM public.games WHERE id = v_game3_id) <> 'in_progress' THEN
    RAISE EXCEPTION 'the reopen did not apply';
  END IF;
  IF pg_temp.live_n('live_game_change', v_scorer_id) <> 1 THEN
    RAISE EXCEPTION 'a scorer reopen wrote % live_game_change rows for the scorer, expected 1',
      pg_temp.live_n('live_game_change', v_scorer_id);
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'live_game_change' AND record_id = v_game3_id;
  IF v_row.table_name <> 'games'
     OR v_row.old_values ->> 'status' <> 'completed'
     OR v_row.new_values ->> 'status' <> 'in_progress'
     OR v_row.old_values ->> 'winner_team_id' <> v_team1_id::text
     OR v_row.new_values ->> 'winner_team_id' IS NOT NULL THEN
    RAISE EXCEPTION 'the reopen row does not show completed -> in_progress: old % new %',
      v_row.old_values, v_row.new_values;
  END IF;

  -- The reopened game is in progress again. Reopening it again (it is not
  -- completed any more) writes nothing, and neither does an in-progress edit.
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games SET status = 'in_progress' WHERE id = v_game3_id;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF pg_temp.live_n('live_game_change') <> 1 THEN
    RAISE EXCEPTION 'an update of an in-progress game wrote a row';
  END IF;

  -- Normal flow, step 1: the scorer finishes game 3 again, in_progress ->
  -- completed, the way completeGame does. No row.
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games
  SET status = 'completed', winner_team_id = v_team1_id, team1_score = 21, team2_score = 10,
      completed_at = now()
  WHERE id = v_game3_id AND status = 'in_progress';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the scorer could not finish the game, % rows', v_rows; END IF;
  IF pg_temp.live_n('live_game_change') <> 1 THEN
    RAISE EXCEPTION 'finishing a game (in_progress -> completed) wrote a live_game_change row';
  END IF;

  -- 6b: an admin sets the winner of that completed game (setGameWinner).
  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games
  SET winner_team_id = v_team2_id, team1_score = 10, team2_score = 21,
      status = 'completed', completed_at = now()
  WHERE id = v_game3_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the admin could not set the winner, % rows', v_rows; END IF;
  IF pg_temp.live_n('live_game_change', v_admin_id) <> 1 THEN
    RAISE EXCEPTION 'an admin winner change wrote % rows for the admin, expected 1',
      pg_temp.live_n('live_game_change', v_admin_id);
  END IF;
  IF pg_temp.live_n('live_game_change') <> 2 THEN
    RAISE EXCEPTION 'expected 2 live_game_change rows in all, got %', pg_temp.live_n('live_game_change');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.security_audit_log
    WHERE action = 'live_game_change' AND user_id = v_admin_id
      AND old_values ->> 'winner_team_id' = v_team1_id::text
      AND new_values ->> 'winner_team_id' = v_team2_id::text
  ) THEN
    RAISE EXCEPTION 'the winner change row does not show team 1 -> team 2';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 7: NORMAL FLOW writes nothing. Game 2 (in progress, round 3):
  -- a scorer inserts rounds, an admin inserts a round, the scorer finishes the
  -- game. The touch trigger's games write was checked in case 4.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.live_n();
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_match_id, v_game2_id, 2, 6, 0, v_scorer_id),
         (v_match_id, v_game2_id, 3, 8, 0, v_scorer_id);
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_match_id, v_game2_id, 4, 3, 0, v_admin_id);
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  -- Finish with the same guarded write completeGame sends.
  SELECT updated_at INTO v_stamp FROM public.games WHERE id = v_game2_id;
  PERFORM auth.set_test_claims(v_scorer_id);
  SET LOCAL ROLE authenticated;
  UPDATE public.games
  SET status = 'completed', winner_team_id = v_team1_id, team1_score = 21, team2_score = 0,
      completed_at = now()
  WHERE id = v_game2_id AND status = 'in_progress' AND updated_at = v_stamp;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the normal finish did not apply, % rows', v_rows; END IF;
  IF (SELECT count(*) FROM public.match_rounds WHERE game_id = v_game2_id) <> 4 THEN
    RAISE EXCEPTION 'the normal-flow inserts did not all land';
  END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'the normal flow wrote % audit row(s), expected 0', pg_temp.live_n() - v_n;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 8: no auth.uid() (cron, service role, SQL editor) -> nothing is
  -- written, although the delete itself works. Round 4 (game 2, completed).
  -- ---------------------------------------------------------------------
  v_n := pg_temp.live_n();
  DELETE FROM public.match_rounds WHERE game_id = v_game2_id AND round_number = 4;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the owner delete did not apply, % rows', v_rows; END IF;
  UPDATE public.match_rounds SET team1_score = 9 WHERE game_id = v_game2_id AND round_number = 3;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'the owner update did not apply, % rows', v_rows; END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'a change with no auth.uid() wrote % audit row(s), expected 0', pg_temp.live_n() - v_n;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 9: FAILURE-SAFE. Make every audit insert fail, then show that an admin
  -- round edit and a scorer undo still succeed and write no audit row. The
  -- savepoint (inner block) rolls the constraint and the data changes back.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.live_n();
  v_n2 := NULL; v_n3 := NULL; v_score := NULL;
  BEGIN
    ALTER TABLE public.security_audit_log
      ADD CONSTRAINT zz_fail CHECK (false) NOT VALID;

    -- The failure is real: a direct audit write is refused.
    BEGIN
      INSERT INTO public.security_audit_log (action, table_name) VALUES ('live_probe', 'probe');
      RAISE EXCEPTION 'the failure constraint did not refuse a direct audit write';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Admin edit of round 1 (game 1, 7 -> 3).
    PERFORM auth.set_test_claims(v_admin_id);
    SET LOCAL ROLE authenticated;
    UPDATE public.match_rounds SET team1_score = 3 WHERE id = v_round1_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RESET ROLE;
    PERFORM auth.set_test_claims(NULL);
    IF v_rows <> 1 THEN RAISE EXCEPTION 'the admin edit failed when the audit failed, % rows', v_rows; END IF;
    SELECT team1_score INTO v_score FROM public.match_rounds WHERE id = v_round1_id;

    -- Scorer undo of the last round of game 2 (round 3).
    PERFORM auth.set_test_claims(v_scorer_id);
    SET LOCAL ROLE authenticated;
    DELETE FROM public.match_rounds WHERE id IN (
      SELECT id FROM public.match_rounds WHERE game_id = v_game2_id AND round_number = 3
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RESET ROLE;
    PERFORM auth.set_test_claims(NULL);
    IF v_rows <> 1 THEN RAISE EXCEPTION 'the scorer undo failed when the audit failed, % rows', v_rows; END IF;
    SELECT count(*) INTO v_n3 FROM public.match_rounds WHERE game_id = v_game2_id AND round_number = 3;
    v_n2 := pg_temp.live_n();

    RAISE EXCEPTION 'probe done' USING ERRCODE = 'ZZ001';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;
  IF v_score IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'the admin edit did not land when the audit failed, score is %', v_score;
  END IF;
  IF v_n3 IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'the scorer undo did not land when the audit failed, % rows left', v_n3;
  END IF;
  IF v_n2 IS DISTINCT FROM v_n THEN
    RAISE EXCEPTION 'audit rows appeared although the audit insert was failing: % before, % after', v_n, v_n2;
  END IF;
  -- The savepoint rolled everything back: constraint gone, edit and undo undone.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zz_fail'
      AND conrelid = 'public.security_audit_log'::regclass
  ) INTO v_has_constraint;
  IF v_has_constraint THEN RAISE EXCEPTION 'the failure constraint was not rolled back'; END IF;
  IF (SELECT team1_score FROM public.match_rounds WHERE id = v_round1_id) <> 7 THEN
    RAISE EXCEPTION 'the savepoint did not roll back the admin edit';
  END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'the audit count moved after the savepoint rollback';
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 10: deleting a match that holds games and rounds. Cascaded rows fire
  -- the AFTER trigger; the function skips them (parent already gone), so the
  -- match delete writes NO live_* row. Match 2: 2 games, 3 rounds. The delete
  -- is by an admin (a signed-in actor), so a skip that failed would log rows.
  -- ---------------------------------------------------------------------
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match2_id, v_team1_id, v_team2_id, v_season_id, 2, false);
  INSERT INTO public.games (id, match_id, game_number, status) VALUES
    (v_game4_id, v_match2_id, 1, 'in_progress');
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score)
  VALUES (v_game5_id, v_match2_id, 2, 'completed', v_team1_id, 21, 3);
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_match2_id, v_game4_id, 1, 3, 0),
    (v_match2_id, v_game4_id, 2, 0, 6),
    (v_match2_id, v_game5_id, 1, 9, 0);

  v_n := pg_temp.live_n();
  PERFORM auth.set_test_claims(v_admin_id);
  DELETE FROM public.matches WHERE id = v_match2_id;
  PERFORM auth.set_test_claims(NULL);

  IF EXISTS (SELECT 1 FROM public.games WHERE match_id = v_match2_id)
     OR EXISTS (SELECT 1 FROM public.match_rounds WHERE match_id = v_match2_id) THEN
    RAISE EXCEPTION 'the match delete left games or rounds behind';
  END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'a match delete wrote % live_* row(s) for its cascaded games and rounds, expected 0',
      pg_temp.live_n() - v_n;
  END IF;

  -- 10b: the same through the admin Scores bin function. Match 3: 1 game, 2 rounds.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_match3_id, v_team1_id, v_team2_id, v_season_id, 3, false);
  INSERT INTO public.games (id, match_id, game_number, status)
  VALUES (v_game6_id, v_match3_id, 1, 'in_progress');
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score) VALUES
    (v_match3_id, v_game6_id, 1, 3, 0),
    (v_match3_id, v_game6_id, 2, 0, 6);

  v_n := pg_temp.live_n();
  PERFORM auth.set_test_claims(v_admin_id);
  PERFORM public.delete_match_with_stats_reversal(v_match3_id);
  PERFORM auth.set_test_claims(NULL);
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_match3_id)
     OR EXISTS (SELECT 1 FROM public.games WHERE match_id = v_match3_id) THEN
    RAISE EXCEPTION 'delete_match_with_stats_reversal left the match or its games behind';
  END IF;
  IF pg_temp.live_n() <> v_n THEN
    RAISE EXCEPTION 'delete_match_with_stats_reversal wrote % live_* row(s), expected 0',
      pg_temp.live_n() - v_n;
  END IF;

  -- ---------------------------------------------------------------------
  -- Case 11: an admin deletes ONE game of a match that still exists -> one
  -- live_game_delete row, and none for the rounds that go with it. Game 1 holds
  -- round 1.
  -- ---------------------------------------------------------------------
  v_n := pg_temp.live_n();
  v_n2 := pg_temp.live_n('live_round_delete');
  PERFORM auth.set_test_claims(v_admin_id);
  SET LOCAL ROLE authenticated;
  DELETE FROM public.games WHERE id = v_game1_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM auth.set_test_claims(NULL);

  IF v_rows <> 1 THEN RAISE EXCEPTION 'the admin could not delete the game, % rows', v_rows; END IF;
  IF EXISTS (SELECT 1 FROM public.match_rounds WHERE game_id = v_game1_id) THEN
    RAISE EXCEPTION 'rounds survived the game delete';
  END IF;
  IF pg_temp.live_n('live_game_delete') <> 1 THEN
    RAISE EXCEPTION 'a game delete wrote % live_game_delete rows, expected 1', pg_temp.live_n('live_game_delete');
  END IF;
  IF pg_temp.live_n() <> v_n + 1 OR pg_temp.live_n('live_round_delete') <> v_n2 THEN
    RAISE EXCEPTION 'a game delete wrote more than its own row (rounds of the game were logged)';
  END IF;
  SELECT * INTO v_row FROM public.security_audit_log
  WHERE action = 'live_game_delete' AND record_id = v_game1_id;
  IF v_row.user_id IS DISTINCT FROM v_admin_id
     OR v_row.record_id IS DISTINCT FROM v_game1_id
     OR v_row.table_name <> 'games'
     OR v_row.new_values IS NOT NULL
     OR v_row.old_values ->> 'match_id' <> v_match_id::text THEN
    RAISE EXCEPTION 'the live_game_delete row is wrong: %', to_jsonb(v_row);
  END IF;

  -- The audit table kept all the history of this run and the drift helper is
  -- still clean.
  SELECT count(*) INTO v_issues FROM public.live_scoring_audit_coverage_drift();
  IF v_issues <> 0 THEN
    RAISE EXCEPTION 'live_scoring_audit_coverage_drift reports % issue(s) at the end', v_issues;
  END IF;

  RAISE NOTICE 'live_scoring_audit_triggers smoke test passed';
END $$;

ROLLBACK;
