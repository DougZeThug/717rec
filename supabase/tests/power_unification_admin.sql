\set ON_ERROR_STOP on

-- Smoke test for the power-unification admin controls
-- (20260810120000_power_unification_admin_controls.sql).
--
-- When the 20260809* unification migrations are present (backup tables exist),
-- this exercises the full applied → reverted → applied round trip against a
-- fixture whose old and new formulas provably disagree (a playoff bye: counted
-- as a win by the old v_team_season_agg, excluded by the canonical source).
-- When they are absent, the transition cases self-skip and only the guard
-- behavior (not_applied status, friendly errors, admin/anon gating) is tested.

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000e101';
  v_member_id uuid := '00000000-0000-0000-0000-00000000e102';
  v_season_id uuid := '00000000-0000-0000-0000-00000000e201';
  v_division_id uuid := '00000000-0000-0000-0000-00000000e202';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000e301';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000e302';
  v_match_id uuid := '00000000-0000-0000-0000-00000000e401';
  v_bracket_id uuid := '00000000-0000-0000-0000-00000000e402';
  v_bye_id uuid := '00000000-0000-0000-0000-00000000e403';
  v_backup_present boolean;
  v_status text;
  v_result text;
  v_match_wins integer;
  v_power numeric;
  v_backup_power numeric;
  v_cnt integer;
  v_err_text text;
BEGIN
  v_backup_present := to_regclass('public.team_season_stats_pre_unification') IS NOT NULL;

  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.playoff_matches WHERE id = v_bye_id;
  DELETE FROM public.brackets WHERE id = v_bracket_id;
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_member_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'power-admin@example.test'),
    (v_member_id, 'power-member@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'power_admin', 'Power Admin', true),
    (v_member_id, 'power_member', 'Power Member', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  PERFORM auth.set_test_claims(v_admin_id);

  IF NOT v_backup_present THEN
    -- Pre-unification database: the controls install but report not_applied
    -- and refuse to run.
    SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
    IF v_status <> 'not_applied' THEN
      RAISE EXCEPTION 'expected not_applied without the unification, got %', v_status;
    END IF;

    BEGIN
      PERFORM public.admin_revert_power_score_unification();
      RAISE EXCEPTION 'revert ran on a database without the unification';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
      IF v_err_text NOT LIKE '%nothing to revert%' THEN RAISE; END IF;
    END;

    BEGIN
      PERFORM public.admin_reapply_power_score_unification();
      RAISE EXCEPTION 'reapply ran on a database without the unification migrations';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
      IF v_err_text NOT LIKE '%not been applied%' THEN RAISE; END IF;
    END;

    RAISE NOTICE 'power_unification_admin: transition cases skipped (unification backup not present yet)';
  ELSE
    -- Full replay: unification is in place.
    SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
    IF v_status <> 'applied' THEN
      RAISE EXCEPTION 'expected applied after full migration replay, got %', v_status;
    END IF;

    SELECT public.admin_reapply_power_score_unification() INTO v_result;
    IF v_result <> 'already_applied' THEN
      RAISE EXCEPTION 'reapply on an applied database should be a no-op, got %', v_result;
    END IF;

    -- Fixture: one completed regular match (team1 beats team2 2-1) plus a
    -- playoff BYE win for team1. The old v_team_season_agg counts the bye as a
    -- match win; the canonical source excludes it, so the two formulas give
    -- provably different numbers for team1.
    INSERT INTO public.seasons (id, name, start_date, is_active)
    VALUES (v_season_id, 'Power Unification Season', '2026-01-01', true);
    INSERT INTO public.divisions (id, name, display_division, division_weight)
    VALUES (v_division_id, 'Power Division', 'Power Division', 1.0);
    INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
      (v_team1_id, 'PU Team 1', v_division_id, 0, 0, 0, 0),
      (v_team2_id, 'PU Team 2', v_division_id, 0, 0, 0, 0);
    INSERT INTO public.matches
      (id, team1_id, team2_id, season_id, round_number, iscompleted,
       team1_game_wins, team2_game_wins, winner_id, loser_id)
    VALUES
      (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, true, 2, 1, v_team1_id, v_team2_id);
    INSERT INTO public.brackets (id, title, season_id, division_id)
    VALUES (v_bracket_id, 'PU Bracket', v_season_id, v_division_id);
    INSERT INTO public.playoff_matches
      (id, bracket_id, team1_id, team2_id, team1_score, team2_score,
       winner_id, "position", round, status)
    VALUES
      (v_bye_id, v_bracket_id, v_team1_id, NULL, 1, 0, v_team1_id, 1, 1, 'completed');

    PERFORM public.upsert_team_season_stats();

    -- Canonical state: bye excluded → 1-0; weighted win 1.0, sos 1.0,
    -- weighted game win 2/3 → (40 + 45 + 10)/100 = 0.95.
    SELECT ts.match_wins, ts.power_score INTO v_match_wins, v_power
    FROM public.team_season_stats ts
    WHERE ts.season_id = v_season_id AND ts.team_id = v_team1_id;
    IF v_match_wins <> 1 THEN
      RAISE EXCEPTION 'canonical stats should exclude the bye (1 win), got %', v_match_wins;
    END IF;
    IF abs(v_power - 0.95) > 1e-6 THEN
      RAISE EXCEPTION 'canonical power score should be 0.95, got %', v_power;
    END IF;

    -- Backup rows for team1, holding the OLD formula values computed by hand:
    -- bye counted → 2-0, games 3-1; sos = avg(1.0, 0.85) = 0.925;
    -- 0.40*1.0 + 0.45*0.925 + 0.15*0.75 = 0.92875.
    INSERT INTO public.team_season_stats_pre_unification
      (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
       division_name, playoff_rank, power_score, sos, champion, runner_up,
       recorded_at, backed_up_at)
    VALUES
      (v_season_id, v_team1_id, 2, 0, 3, 1,
       'Power Division', NULL, 0.92875, 0.925, NULL, false, now(), now());
    INSERT INTO public.team_details_power_pre_unification
      (team_id, power_score, wins, losses, game_wins, game_losses,
       win_percentage, game_win_percentage, backed_up_at)
    VALUES
      (v_team1_id, 92.875, 2, 0, 3, 1, 1.0, 0.75, now());

    -- The backup readers surface those rows (they are RLS-locked otherwise).
    SELECT count(*) INTO v_cnt
    FROM public.admin_get_pre_unification_season_stats() r
    WHERE r.team_id = v_team1_id AND r.season_name = 'Power Unification Season';
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'season backup reader did not return the fixture row, got % rows', v_cnt;
    END IF;
    SELECT count(*) INTO v_cnt
    FROM public.admin_get_pre_unification_team_power() r
    WHERE r.team_id = v_team1_id;
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'team power backup reader did not return the fixture row, got % rows', v_cnt;
    END IF;

    -- Revert: old view definitions restored, stats re-derived under the old
    -- formula → the bye counts again and team1 matches its backup row.
    SELECT public.admin_revert_power_score_unification() INTO v_result;
    IF v_result <> 'reverted' THEN
      RAISE EXCEPTION 'revert should return reverted, got %', v_result;
    END IF;
    SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
    IF v_status <> 'reverted' THEN
      RAISE EXCEPTION 'status should be reverted after revert, got %', v_status;
    END IF;

    SELECT ts.match_wins, ts.power_score INTO v_match_wins, v_power
    FROM public.team_season_stats ts
    WHERE ts.season_id = v_season_id AND ts.team_id = v_team1_id;
    SELECT b.power_score INTO v_backup_power
    FROM public.team_season_stats_pre_unification b
    WHERE b.season_id = v_season_id AND b.team_id = v_team1_id;
    IF v_match_wins <> 2 THEN
      RAISE EXCEPTION 'reverted stats should count the bye (2 wins), got %', v_match_wins;
    END IF;
    IF abs(v_power - v_backup_power) > 1e-6 THEN
      RAISE EXCEPTION 'reverted power score % does not match backup %', v_power, v_backup_power;
    END IF;

    SELECT public.admin_revert_power_score_unification() INTO v_result;
    IF v_result <> 'already_reverted' THEN
      RAISE EXCEPTION 'second revert should be a no-op, got %', v_result;
    END IF;

    -- Re-apply: canonical definitions and numbers come back.
    SELECT public.admin_reapply_power_score_unification() INTO v_result;
    IF v_result <> 'applied' THEN
      RAISE EXCEPTION 'reapply should return applied, got %', v_result;
    END IF;
    SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
    IF v_status <> 'applied' THEN
      RAISE EXCEPTION 'status should be applied after reapply, got %', v_status;
    END IF;
    SELECT ts.match_wins, ts.power_score INTO v_match_wins, v_power
    FROM public.team_season_stats ts
    WHERE ts.season_id = v_season_id AND ts.team_id = v_team1_id;
    IF v_match_wins <> 1 OR abs(v_power - 0.95) > 1e-6 THEN
      RAISE EXCEPTION 'reapplied stats wrong: % wins, power %', v_match_wins, v_power;
    END IF;
  END IF;

  -- Authenticated non-admin is rejected by every control.
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    PERFORM * FROM public.admin_power_unification_status();
    RAISE EXCEPTION 'status was callable by a non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_revert_power_score_unification();
    RAISE EXCEPTION 'revert was callable by a non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;

  -- anon has EXECUTE revoked outright.
  PERFORM auth.set_test_claims(NULL);
  SET LOCAL role anon;
  BEGIN
    PERFORM * FROM public.admin_power_unification_status();
    RAISE EXCEPTION 'status was callable by anon';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;
  RESET role;

  RAISE NOTICE 'power_unification_admin smoke test passed';
END $$;

ROLLBACK;
