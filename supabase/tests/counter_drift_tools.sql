\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a101';
  v_member_id uuid := '00000000-0000-0000-0000-00000000a102';
  v_outsider_id uuid := '00000000-0000-0000-0000-00000000a103';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b101';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b102';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c101';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c102';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d101';
  v_tie_id uuid := '00000000-0000-0000-0000-00000000d102';
  v_drift_rows integer;
  v_repaired integer;
  v_err_text text;
BEGIN
  -- Fixture reset
  DELETE FROM public.matches WHERE id IN (v_match_id, v_tie_id);
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id, v_outsider_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_member_id, v_outsider_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'drift-admin@example.test'),
    (v_member_id, 'drift-member@example.test'),
    (v_outsider_id, 'drift-outsider@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'drift_admin', 'Drift Admin', true),
    (v_member_id, 'drift_member', 'Drift Member', false),
    (v_outsider_id, 'drift_outsider', 'Drift Outsider', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active) VALUES (v_season_id, 'Drift Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division) VALUES (v_division_id, 'Drift Division', 'Drift Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Drift Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Drift Team 2', v_division_id, 0, 0, 0, 0);

  PERFORM auth.set_test_claims(v_admin_id);

  -- Case 1: approve a match, corrupt a counter directly → view reports drift.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, true, 2, 1);
  PERFORM public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 2, 1);

  SELECT COUNT(*) INTO v_drift_rows FROM public.v_counter_drift;
  IF v_drift_rows <> 0 THEN RAISE EXCEPTION 'view showed drift on a clean approve, got %', v_drift_rows; END IF;

  UPDATE public.teams SET wins = wins + 5 WHERE id = v_team1_id;  -- direct corruption
  SELECT COUNT(*) INTO v_drift_rows FROM public.v_counter_drift WHERE team_id = v_team1_id;
  IF v_drift_rows <> 1 THEN RAISE EXCEPTION 'view did not detect corruption, got % rows', v_drift_rows; END IF;

  -- Reconciliation repairs it, second call is a no-op.
  v_repaired := public.reconcile_team_counters();
  IF v_repaired < 1 THEN RAISE EXCEPTION 'reconcile did not repair drift, got %', v_repaired; END IF;
  SELECT COUNT(*) INTO v_drift_rows FROM public.v_counter_drift;
  IF v_drift_rows <> 0 THEN RAISE EXCEPTION 'drift remained after repair, got %', v_drift_rows; END IF;
  v_repaired := public.reconcile_team_counters();
  IF v_repaired <> 0 THEN RAISE EXCEPTION 'second reconcile was not idempotent, got %', v_repaired; END IF;

  -- Case 2: a completed tie (game scores recorded, no winner) must not read as drift.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_tie_id, v_team1_id, v_team2_id, v_season_id, 2, true, 1, 1);
  PERFORM public.approve_match_result(v_tie_id, v_team1_id, v_team2_id, 1, 1);
  PERFORM public.mark_match_as_tie(v_tie_id);

  SELECT COUNT(*) INTO v_drift_rows FROM public.v_counter_drift;
  IF v_drift_rows <> 0 THEN RAISE EXCEPTION 'completed tie read as drift, got % rows', v_drift_rows; END IF;
  v_repaired := public.reconcile_team_counters();
  IF v_repaired <> 0 THEN RAISE EXCEPTION 'reconcile touched rows after tie, got %', v_repaired; END IF;

  -- Case 3: authenticated non-admin gets 'Admin access required'.
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    PERFORM public.reconcile_team_counters();
    RAISE EXCEPTION 'reconcile allowed non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;

  -- Case 4: anon has EXECUTE revoked (permission denied).
  PERFORM auth.set_test_claims(NULL);
  SET LOCAL role anon;
  BEGIN
    PERFORM public.reconcile_team_counters();
    RAISE EXCEPTION 'reconcile was callable by anon';
  EXCEPTION WHEN insufficient_privilege THEN
    -- expected
    NULL;
  END;
  RESET role;

  RAISE NOTICE 'counter_drift_tools smoke test passed';
END $$;

ROLLBACK;