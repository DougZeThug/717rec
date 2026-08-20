\set ON_ERROR_STOP on

-- Smoke test for the power score weight sandbox
-- (20260820120000_power_score_weight_sandbox.sql).
--
-- Covers: the seeded 40/45/15 baseline, formula parity on fixture triples
-- shared with src/utils/powerScore/__tests__/weights.test.ts, validation and
-- admin/anon gating, a full apply -> reassert -> revert round trip against an
-- ARCHIVED season (the whole point of the control is that it may rewrite
-- frozen history), and the admin_recompute_season_power() career fix.
--
-- Everything runs inside one rolled-back transaction, so it is safe against
-- any database — including one whose admin has already picked custom weights
-- (the test normalizes to 40/45/15 first, inside the rollback).

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000f101';
  v_member_id uuid := '00000000-0000-0000-0000-00000000f102';
  v_season_id uuid := '00000000-0000-0000-0000-00000000f201';
  v_division_id uuid := '00000000-0000-0000-0000-00000000f202';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000f301';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000f302';
  v_match_id uuid := '00000000-0000-0000-0000-00000000f401';
  v_latest public.power_score_weight_history%ROWTYPE;
  v_result jsonb;
  v_history_cnt integer;
  v_history_cnt_after integer;
  v_cnt integer;
  v_val numeric;
  v_power_before numeric;
  v_career_before numeric;
  v_power numeric;
  v_career numeric;
  v_err_text text;
  v_call text;
BEGIN
  -- ── Fixture reset (harmless on a clean CI database; helps local reruns) ──
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_member_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'weights-admin@example.test'),
    (v_member_id, 'weights-member@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'weights_admin', 'Weights Admin', true),
    (v_member_id, 'weights_member', 'Weights Member', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  -- ── 1. The migration seeded a baseline row ──────────────────────────────
  SELECT count(*) INTO v_history_cnt FROM public.power_score_weight_history;
  IF v_history_cnt < 1 THEN
    RAISE EXCEPTION 'power_score_weight_history should be seeded, found no rows';
  END IF;

  SELECT * INTO v_latest
  FROM public.power_score_weight_history ORDER BY id DESC LIMIT 1;

  IF v_history_cnt = 1
     AND (v_latest.win_weight, v_latest.sos_weight, v_latest.game_weight)
         IS DISTINCT FROM (40::numeric, 45::numeric, 15::numeric) THEN
    RAISE EXCEPTION 'fresh replay should seed 40/45/15, got %/%/%',
      v_latest.win_weight, v_latest.sos_weight, v_latest.game_weight;
  END IF;

  -- Normalize to the 40/45/15 baseline (inside this rolled-back transaction)
  -- so the arithmetic below is deterministic on any database.
  IF (v_latest.win_weight, v_latest.sos_weight, v_latest.game_weight)
     IS DISTINCT FROM (40::numeric, 45::numeric, 15::numeric) THEN
    INSERT INTO public.power_score_weight_history (win_weight, sos_weight, game_weight, note)
    VALUES (40, 45, 15, 'smoke test baseline normalization');
    PERFORM public.power_score_weights_regenerate(40, 45, 15);
  END IF;
  SELECT count(*) INTO v_history_cnt FROM public.power_score_weight_history;

  -- ── 2. Formula parity on the fixture triples shared with weights.test.ts ─
  -- (inputs 0-1: weighted_win_pct, sos, weighted_game_win_pct; output 0-100)
  IF abs(public.power_score_100(0.75, 0.9, 0.7) - 81.0) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100(0.75,0.9,0.7) should be 81, got %',
      public.power_score_100(0.75, 0.9, 0.7);
  END IF;
  IF abs(public.power_score_100(0, 0.5, 0) - 22.5) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100(0,0.5,0) should be 22.5, got %',
      public.power_score_100(0, 0.5, 0);
  END IF;
  -- COALESCE rules: NULL win/game read as 0, NULL sos reads as 0.5.
  IF abs(public.power_score_100(NULL, NULL, NULL) - 22.5) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100(NULL,NULL,NULL) should be 22.5, got %',
      public.power_score_100(NULL, NULL, NULL);
  END IF;
  -- Career: above the 0.30 performance floor the two variants agree...
  IF abs(public.power_score_100_career(0.75, 0.9, 0.7) - 81.0) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100_career(0.75,0.9,0.7) should be 81, got %',
      public.power_score_100_career(0.75, 0.9, 0.7);
  END IF;
  -- ...at exactly the floor nothing changes...
  IF abs(public.power_score_100_career(0.3, 0.85, 0.3) - 54.75) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100_career(0.3,0.85,0.3) should be 54.75, got %',
      public.power_score_100_career(0.3, 0.85, 0.3);
  END IF;
  -- ...and below it the SOS points scale linearly (perf 0.15 -> half credit).
  IF abs(public.power_score_100_career(0.15, 0.85, 0.15) - 27.375) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100_career(0.15,0.85,0.15) should be 27.375, got %',
      public.power_score_100_career(0.15, 0.85, 0.15);
  END IF;

  -- ── 3. Fixture: one completed match, then the season is ARCHIVED ────────
  -- team1 beats team2 2-1 at division weight 1.0. team2's components:
  -- weighted_win_pct 0, sos 1.0, weighted_game_win_pct 1/3.
  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Weight Sandbox Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division, division_weight)
  VALUES (v_division_id, 'Weight Division', 'Weight Division', 1.0);
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'WS Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'WS Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted,
     team1_game_wins, team2_game_wins, winner_id, loser_id)
  VALUES
    (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, true, 2, 1, v_team1_id, v_team2_id);

  PERFORM public.upsert_team_season_stats();
  UPDATE public.seasons SET is_archived = true, is_active = false WHERE id = v_season_id;

  SELECT ts.power_score, ts.career_power_score INTO v_power_before, v_career_before
  FROM public.team_season_stats ts
  WHERE ts.season_id = v_season_id AND ts.team_id = v_team2_id;

  -- Under 40/45/15: power = (0*40 + (1/3)*15 + 1.0*45)/100 = 0.50;
  -- career = (5 + 45*min(1, (5/55)/0.30))/100 = 0.1863636...
  IF v_power_before IS NULL OR abs(v_power_before - 0.5) > 1e-6 THEN
    RAISE EXCEPTION 'baseline power for team2 should be 0.50, got %', v_power_before;
  END IF;
  IF v_career_before IS NULL OR abs(v_career_before - 0.1863636364) > 1e-6 THEN
    RAISE EXCEPTION 'baseline career power for team2 should be ~0.18636, got %', v_career_before;
  END IF;

  -- ── 4. Validation rejects bad triples with friendly messages ────────────
  PERFORM auth.set_test_claims(v_admin_id);

  BEGIN
    PERFORM public.admin_set_power_score_weights(30, 60, 20);
    RAISE EXCEPTION 'a triple summing to 110 was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE '%add up to 100%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_set_power_score_weights(-10, 95, 15);
    RAISE EXCEPTION 'a negative weight was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE '%cannot be negative%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_set_power_score_weights(0, 100, 0);
    RAISE EXCEPTION 'a 0/100/0 triple was accepted (career formula would divide by zero)';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE '%cannot both be zero%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_set_power_score_weights(NULL, 45, 15);
    RAISE EXCEPTION 'a NULL weight was accepted';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE '%required%' THEN RAISE; END IF;
  END;

  -- The table CHECK backs the RPC validation up against direct writes.
  BEGIN
    INSERT INTO public.power_score_weight_history (win_weight, sos_weight, game_weight)
    VALUES (10, 10, 10);
    RAISE EXCEPTION 'the sum-100 CHECK constraint did not fire';
  EXCEPTION WHEN check_violation THEN
    NULL; -- expected
  END;

  SELECT count(*) INTO v_cnt FROM public.power_score_weight_history;
  IF v_cnt <> v_history_cnt THEN
    RAISE EXCEPTION 'rejected saves must not add history rows (% -> %)', v_history_cnt, v_cnt;
  END IF;

  -- ── 5. Apply 50/35/15: history row + ARCHIVED season rescored ───────────
  SELECT public.admin_set_power_score_weights(50, 35, 15, 'smoke test') INTO v_result;
  IF v_result ->> 'status' <> 'applied' THEN
    RAISE EXCEPTION 'apply should return status applied, got %', v_result;
  END IF;

  SELECT count(*) INTO v_cnt FROM public.power_score_weight_history;
  IF v_cnt <> v_history_cnt + 1 THEN
    RAISE EXCEPTION 'apply should add exactly one history row (% -> %)', v_history_cnt, v_cnt;
  END IF;
  SELECT * INTO v_latest
  FROM public.power_score_weight_history ORDER BY id DESC LIMIT 1;
  IF (v_latest.win_weight, v_latest.sos_weight, v_latest.game_weight)
     IS DISTINCT FROM (50::numeric, 35::numeric, 15::numeric)
     OR v_latest.applied_by IS DISTINCT FROM v_admin_id
     OR v_latest.note IS DISTINCT FROM 'smoke test' THEN
    RAISE EXCEPTION 'apply recorded the wrong history row: %/%/% by % (%)',
      v_latest.win_weight, v_latest.sos_weight, v_latest.game_weight,
      v_latest.applied_by, v_latest.note;
  END IF;

  -- get_power_score_weights(): newest first, current then previous.
  SELECT count(*) INTO v_cnt FROM public.get_power_score_weights();
  IF v_cnt <> 2 THEN
    RAISE EXCEPTION 'get_power_score_weights should return 2 rows, got %', v_cnt;
  END IF;
  SELECT w.win_weight INTO v_val
  FROM public.get_power_score_weights() w ORDER BY w.id DESC LIMIT 1;
  IF v_val IS DISTINCT FROM 50::numeric THEN
    RAISE EXCEPTION 'get_power_score_weights first row should be the live 50/35/15, got win %', v_val;
  END IF;

  -- The regenerated formula answers with the new weights...
  IF abs(public.power_score_100(1, 1, 1) - 100.0) > 1e-9 THEN
    RAISE EXCEPTION 'power_score_100(1,1,1) should stay 100 under any triple';
  END IF;
  IF abs(public.power_score_100(0, 1.0, 1.0/3.0) - 40.0) > 1e-6 THEN
    RAISE EXCEPTION 'power_score_100(0,1,1/3) should be 40 under 50/35/15, got %',
      public.power_score_100(0, 1.0, 1.0/3.0);
  END IF;

  -- ...and the ARCHIVED season's stored numbers moved with it, both columns.
  SELECT ts.power_score, ts.career_power_score INTO v_power, v_career
  FROM public.team_season_stats ts
  WHERE ts.season_id = v_season_id AND ts.team_id = v_team2_id;
  IF abs(v_power - 0.4) > 1e-6 THEN
    RAISE EXCEPTION 'archived power should be rescored to 0.40, got %', v_power;
  END IF;
  -- career = (5 + 35*min(1, (5/65)/0.30))/100 = 0.1397435897...
  IF abs(v_career - 0.1397435897) > 1e-6 THEN
    RAISE EXCEPTION 'archived career power should be rescored to ~0.13974, got %', v_career;
  END IF;
  -- An all-win team at weight 1.0 lands on 0.95 under both triples (the 10
  -- points just moved between two terms it maxes out) — a handy invariant.
  SELECT ts.power_score INTO v_val
  FROM public.team_season_stats ts
  WHERE ts.season_id = v_season_id AND ts.team_id = v_team1_id;
  IF abs(v_val - 0.95) > 1e-6 THEN
    RAISE EXCEPTION 'team1 power should be 0.95 under 50/35/15 too, got %', v_val;
  END IF;

  -- ── 6. Applying the identical triple reasserts without history noise ────
  SELECT count(*) INTO v_history_cnt FROM public.power_score_weight_history;
  SELECT public.admin_set_power_score_weights(50, 35, 15, 'again') INTO v_result;
  IF v_result ->> 'status' <> 'reasserted' THEN
    RAISE EXCEPTION 'identical re-apply should return reasserted, got %', v_result;
  END IF;
  SELECT count(*) INTO v_cnt FROM public.power_score_weight_history;
  IF v_cnt <> v_history_cnt THEN
    RAISE EXCEPTION 'reassert must not add a history row (% -> %)', v_history_cnt, v_cnt;
  END IF;

  -- ── 7. Revert: back to 40/45/15, stored rows byte-match the snapshot ────
  SELECT public.admin_revert_power_score_weights() INTO v_result;
  IF v_result ->> 'status' <> 'reverted'
     OR (v_result ->> 'win_weight')::numeric IS DISTINCT FROM 40::numeric THEN
    RAISE EXCEPTION 'revert should restore 40/45/15, got %', v_result;
  END IF;
  SELECT count(*) INTO v_cnt FROM public.power_score_weight_history;
  IF v_cnt <> v_history_cnt + 1 THEN
    RAISE EXCEPTION 'revert should append one history row (audit trail), % -> %',
      v_history_cnt, v_cnt;
  END IF;

  SELECT ts.power_score, ts.career_power_score INTO v_power, v_career
  FROM public.team_season_stats ts
  WHERE ts.season_id = v_season_id AND ts.team_id = v_team2_id;
  IF v_power IS DISTINCT FROM v_power_before
     OR v_career IS DISTINCT FROM v_career_before THEN
    RAISE EXCEPTION 'revert should reproduce the pre-change values exactly (% / % vs % / %)',
      v_power, v_career, v_power_before, v_career_before;
  END IF;

  -- ── 8. admin_recompute_season_power() now repairs career too ────────────
  UPDATE public.team_season_stats
  SET career_power_score = NULL
  WHERE season_id = v_season_id;

  SELECT public.admin_recompute_season_power(v_season_id) INTO v_cnt;
  IF v_cnt < 2 THEN
    RAISE EXCEPTION 'recompute should touch both fixture rows, got %', v_cnt;
  END IF;
  SELECT ts.career_power_score INTO v_career
  FROM public.team_season_stats ts
  WHERE ts.season_id = v_season_id AND ts.team_id = v_team2_id;
  IF v_career IS DISTINCT FROM v_career_before THEN
    RAISE EXCEPTION 'recompute should repopulate career_power_score (got %, want %)',
      v_career, v_career_before;
  END IF;

  -- ── 9. Audit coverage: trigger attached, drift guard clean ──────────────
  SELECT count(*) INTO v_cnt FROM public.admin_audit_coverage_drift();
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'admin_audit_coverage_drift() reported % issue(s)', v_cnt;
  END IF;

  -- ── 10. Gating: member gets the friendly gate, anon gets no EXECUTE ─────
  PERFORM auth.set_test_claims(v_member_id);
  FOREACH v_call IN ARRAY ARRAY[
    'SELECT public.admin_set_power_score_weights(40, 45, 15)',
    'SELECT public.admin_revert_power_score_weights()'
  ] LOOP
    BEGIN
      EXECUTE v_call;
      RAISE EXCEPTION '"%" was callable by a non-admin', v_call;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
      IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
    END;
  END LOOP;

  -- The reader stays open to everyone.
  PERFORM auth.set_test_claims(NULL);
  SET LOCAL role anon;
  SELECT count(*) INTO v_cnt FROM public.get_power_score_weights();
  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'anon should be able to read the live weights';
  END IF;
  -- The writers and the private helper do not.
  FOREACH v_call IN ARRAY ARRAY[
    'SELECT public.admin_set_power_score_weights(40, 45, 15)',
    'SELECT public.admin_revert_power_score_weights()',
    'SELECT public.power_score_weights_regenerate(40, 45, 15)'
  ] LOOP
    BEGIN
      EXECUTE v_call;
      RAISE EXCEPTION '"%" was callable by anon', v_call;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- expected
    END;
  END LOOP;
  RESET role;

  -- The regenerate helper is private even for logged-in users: the RLS role
  -- is what the API executes as, and it holds no EXECUTE on it.
  SET LOCAL role authenticated;
  BEGIN
    PERFORM public.power_score_weights_regenerate(40, 45, 15);
    RAISE EXCEPTION 'power_score_weights_regenerate was callable by authenticated';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;
  RESET role;

  RAISE NOTICE 'power_score_weight_sandbox smoke test passed';
END $$;

ROLLBACK;
