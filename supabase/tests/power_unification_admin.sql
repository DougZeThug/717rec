-- Smoke test for the power-unification admin controls (20260810120000).
--
-- Covers: status detection, admin gating, anon EXECUTE revocation, and the
-- revert/reapply round-trip actually flipping the stored formula.
--
-- The formula assertion works off a division_weight of 0.5: the winner of a
-- 2-0 sweep scores 0.775 under the old formula (plain win rate) and 0.500
-- under the canonical one (division-weighted win rate), so the stored
-- team_season_stats.power_score tells us unambiguously which formula is live.
--
-- Self-skips when the pre-unification backup tables are absent, i.e. when the
-- 20260809 unification migrations are not part of this replay.

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a201';
  v_member_id uuid := '00000000-0000-0000-0000-00000000a202';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b201';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b202';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c201';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c202';
  v_match_id uuid := '00000000-0000-0000-0000-00000000d201';
  v_status text;
  v_result text;
  v_power numeric;
  v_count bigint;
  v_err_text text;
BEGIN
  IF to_regclass('public.team_season_stats_pre_unification') IS NULL THEN
    RAISE NOTICE 'power_unification_admin: backup tables absent (unification migrations not in this replay); skipping';
    RETURN;
  END IF;

  -- Fixture reset
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_member_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'powermig-admin@example.test'),
    (v_member_id, 'powermig-member@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'powermig_admin', 'Power Migration Admin', true),
    (v_member_id, 'powermig_member', 'Power Migration Member', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Power Migration Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division, division_weight)
  VALUES (v_division_id, 'Power Migration Division', 'Power Migration Division', 0.5);
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Power Migration Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Power Migration Team 2', v_division_id, 0, 0, 0, 0);

  PERFORM auth.set_test_claims(v_admin_id);

  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, true, 2, 0);
  PERFORM public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 2, 0);
  PERFORM public.upsert_team_season_stats();

  -- Case 1: full replay leaves the unification applied, and the stored power
  -- score is the canonical one (division-weighted: 0.5*40 + 0.5*45 + 0.5*15 = 50).
  SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
  IF v_status <> 'applied' THEN
    RAISE EXCEPTION 'expected status applied after replay, got %', v_status;
  END IF;

  SELECT tss.power_score INTO v_power FROM public.team_season_stats tss
  WHERE tss.season_id = v_season_id AND tss.team_id = v_team1_id;
  IF v_power IS NULL OR ABS(v_power - 0.5) > 1e-9 THEN
    RAISE EXCEPTION 'expected canonical power 0.5 for the winner while applied, got %', v_power;
  END IF;

  -- Backup readers respond without error (the backup was captured on an empty
  -- replay database, so only the shape is asserted, not the contents).
  SELECT COUNT(*) INTO v_count FROM public.admin_get_pre_unification_season_stats();
  SELECT COUNT(*) INTO v_count FROM public.admin_get_pre_unification_team_power();

  -- Case 2: authenticated non-admin is rejected.
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    PERFORM public.admin_revert_power_score_unification();
    RAISE EXCEPTION 'revert allowed non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;

  -- Case 3: anon has EXECUTE revoked.
  PERFORM auth.set_test_claims(NULL);
  SET LOCAL role anon;
  BEGIN
    PERFORM public.admin_power_unification_status();
    RAISE EXCEPTION 'status was callable by anon';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET role;

  -- Case 4: revert flips the views and the stored formula
  -- (old formula: 0.40*1.0 + 0.45*0.5 + 0.15*1.0 = 0.775 for the winner).
  PERFORM auth.set_test_claims(v_admin_id);
  v_result := public.admin_revert_power_score_unification();
  IF v_result <> 'reverted' THEN
    RAISE EXCEPTION 'expected revert to return reverted, got %', v_result;
  END IF;

  SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
  IF v_status <> 'reverted' THEN
    RAISE EXCEPTION 'expected status reverted after revert, got %', v_status;
  END IF;
  IF pg_get_viewdef('public.v_team_season_agg'::regclass) ILIKE '%power_score_100%' THEN
    RAISE EXCEPTION 'v_team_season_agg still uses power_score_100 after revert';
  END IF;

  SELECT tss.power_score INTO v_power FROM public.team_season_stats tss
  WHERE tss.season_id = v_season_id AND tss.team_id = v_team1_id;
  IF v_power IS NULL OR ABS(v_power - 0.775) > 1e-9 THEN
    RAISE EXCEPTION 'expected old-formula power 0.775 for the winner after revert, got %', v_power;
  END IF;

  -- Case 5: revert is idempotent.
  v_result := public.admin_revert_power_score_unification();
  IF v_result <> 'already_reverted' THEN
    RAISE EXCEPTION 'expected second revert to return already_reverted, got %', v_result;
  END IF;

  -- Case 6: reapply restores the canonical formula.
  v_result := public.admin_reapply_power_score_unification();
  IF v_result <> 'applied' THEN
    RAISE EXCEPTION 'expected reapply to return applied, got %', v_result;
  END IF;

  SELECT s.status INTO v_status FROM public.admin_power_unification_status() s;
  IF v_status <> 'applied' THEN
    RAISE EXCEPTION 'expected status applied after reapply, got %', v_status;
  END IF;

  SELECT tss.power_score INTO v_power FROM public.team_season_stats tss
  WHERE tss.season_id = v_season_id AND tss.team_id = v_team1_id;
  IF v_power IS NULL OR ABS(v_power - 0.5) > 1e-9 THEN
    RAISE EXCEPTION 'expected canonical power 0.5 for the winner after reapply, got %', v_power;
  END IF;

  -- Case 7: reapply is idempotent.
  v_result := public.admin_reapply_power_score_unification();
  IF v_result <> 'already_applied' THEN
    RAISE EXCEPTION 'expected second reapply to return already_applied, got %', v_result;
  END IF;

  RAISE NOTICE 'power_unification_admin smoke test passed';
END $$;

ROLLBACK;
