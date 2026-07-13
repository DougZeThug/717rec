\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000a001';
  v_member_id uuid := '00000000-0000-0000-0000-00000000a002';
  v_pending_member_id uuid := '00000000-0000-0000-0000-00000000a003';
  v_outsider_id uuid := '00000000-0000-0000-0000-00000000a004';
  v_season_id uuid := '00000000-0000-0000-0000-00000000b001';
  v_division_id uuid := '00000000-0000-0000-0000-00000000b002';
  v_team1_id uuid := '00000000-0000-0000-0000-00000000c001';
  v_team2_id uuid := '00000000-0000-0000-0000-00000000c002';
  v_match_id uuid;
  v_result_bool boolean;
  v_result_json jsonb;
  v_err_text text;
  r record;
BEGIN
  DELETE FROM public.match_rounds WHERE match_id::text LIKE '00000000-0000-0000-0000-00000000d%';
  DELETE FROM public.games WHERE match_id::text LIKE '00000000-0000-0000-0000-00000000d%';
  DELETE FROM public.matches WHERE id::text LIKE '00000000-0000-0000-0000-00000000d%';
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.team_memberships WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id, v_pending_member_id, v_outsider_id);
  DELETE FROM auth.users WHERE id IN (v_admin_id, v_member_id, v_pending_member_id, v_outsider_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'admin@example.test'), (v_member_id, 'member@example.test'),
    (v_pending_member_id, 'pending@example.test'), (v_outsider_id, 'outsider@example.test');
  -- Seed an initial admin fixture as CI superuser without tripping the production
  -- anti-escalation trigger that normally requires an existing admin caller.
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'admin', 'Admin', true), (v_member_id, 'member', 'Approved Member', false),
    (v_pending_member_id, 'pending', 'Pending Member', false), (v_outsider_id, 'outsider', 'Outsider', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);
  INSERT INTO public.seasons (id, name, start_date, is_active) VALUES (v_season_id, 'Smoke Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division) VALUES (v_division_id, 'Smoke Division', 'Smoke Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Smoke Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Smoke Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.team_memberships (team_id, user_id, is_approved, approved_by, approved_at) VALUES
    (v_team1_id, v_member_id, true, v_admin_id, now()),
    (v_team1_id, v_pending_member_id, false, NULL, NULL);

  PERFORM auth.set_test_claims(v_admin_id);

  -- approve_match_result: first application mutates stats, repeat is idempotent, season stats refresh.
  v_match_id := '00000000-0000-0000-0000-00000000d001';
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, true, 2, 1);
  v_result_bool := public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 2, 1);
  IF v_result_bool IS DISTINCT FROM true THEN RAISE EXCEPTION 'approve_match_result first call did not return true'; END IF;
  SELECT wins, losses, game_wins, game_losses INTO r FROM public.teams WHERE id = v_team1_id;
  IF (r.wins, r.losses, r.game_wins, r.game_losses) IS DISTINCT FROM (1, 0, 2, 1) THEN RAISE EXCEPTION 'winner stats after approve were %', r; END IF;
  SELECT wins, losses, game_wins, game_losses INTO r FROM public.teams WHERE id = v_team2_id;
  IF (r.wins, r.losses, r.game_wins, r.game_losses) IS DISTINCT FROM (0, 1, 1, 2) THEN RAISE EXCEPTION 'loser stats after approve were %', r; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_season_stats WHERE season_id = v_season_id AND team_id = v_team1_id AND match_wins = 1 AND game_wins = 2) THEN
    RAISE EXCEPTION 'approve_match_result did not refresh team_season_stats';
  END IF;
  v_result_bool := public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 2, 1);
  IF v_result_bool IS DISTINCT FROM false THEN RAISE EXCEPTION 'approve_match_result repeat did not return false'; END IF;

  -- mark_match_as_tie: reverses stats, clears winner/loser, refreshes stats, repeat false.
  v_result_bool := public.mark_match_as_tie(v_match_id);
  IF v_result_bool IS DISTINCT FROM true THEN RAISE EXCEPTION 'mark_match_as_tie did not return true'; END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_match_id AND (winner_id IS NOT NULL OR loser_id IS NOT NULL)) THEN RAISE EXCEPTION 'mark_match_as_tie did not clear winner/loser'; END IF;
  IF EXISTS (SELECT 1 FROM public.teams WHERE id IN (v_team1_id, v_team2_id) AND (wins <> 0 OR losses <> 0 OR game_wins <> 0 OR game_losses <> 0)) THEN RAISE EXCEPTION 'mark_match_as_tie did not reverse team stats'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_season_stats WHERE season_id = v_season_id AND team_id = v_team1_id AND match_wins = 0 AND match_losses = 0) THEN RAISE EXCEPTION 'mark_match_as_tie did not refresh season stats'; END IF;
  v_result_bool := public.mark_match_as_tie(v_match_id);
  IF v_result_bool IS DISTINCT FROM false THEN RAISE EXCEPTION 'mark_match_as_tie repeat did not return false'; END IF;
  UPDATE public.matches SET iscompleted = false WHERE id = v_match_id;

  -- update/reverse stats: null/zero game wins are safe and reverse never underflows.
  PERFORM public.update_team_stats(v_team1_id, v_team2_id, NULL, 0);
  PERFORM public.reverse_team_stats(v_team1_id, v_team2_id, 99, 99);
  IF EXISTS (SELECT 1 FROM public.teams WHERE id IN (v_team1_id, v_team2_id) AND (wins < 0 OR losses < 0 OR game_wins < 0 OR game_losses < 0)) THEN RAISE EXCEPTION 'reverse_team_stats underflowed'; END IF;
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    PERFORM public.update_team_stats(v_team1_id, v_team2_id, 0, 0);
    RAISE EXCEPTION 'update_team_stats allowed non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.reverse_team_stats(v_team1_id, v_team2_id, 0, 0);
    RAISE EXCEPTION 'reverse_team_stats allowed non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;

  -- user_can_score_match: admin/approved members can score open matches; others and completed matches cannot.
  PERFORM auth.set_test_claims(v_admin_id);
  IF public.user_can_score_match(v_match_id) IS DISTINCT FROM true THEN RAISE EXCEPTION 'admin cannot score open match'; END IF;
  PERFORM auth.set_test_claims(v_member_id);
  IF public.user_can_score_match(v_match_id) IS DISTINCT FROM true THEN RAISE EXCEPTION 'approved member cannot score open match'; END IF;
  PERFORM auth.set_test_claims(v_pending_member_id);
  IF public.user_can_score_match(v_match_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'unapproved member can score'; END IF;
  PERFORM auth.set_test_claims(v_outsider_id);
  IF public.user_can_score_match(v_match_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'non-member can score'; END IF;
  UPDATE public.matches SET iscompleted = true WHERE id = v_match_id;
  PERFORM auth.set_test_claims(v_member_id);
  IF public.user_can_score_match(v_match_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'approved member can score completed match'; END IF;
  UPDATE public.matches SET iscompleted = false WHERE id = v_match_id;

  -- finalize_live_match: requires authorization, refuses undecided, applies once, updates scores/stats.
  v_match_id := '00000000-0000-0000-0000-00000000d002';
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted, team1_score, team2_score)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 2, false, 0, 0);
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score) VALUES
    ('00000000-0000-0000-0000-00000000e001', v_match_id, 1, 'completed', v_team1_id, 21, 10),
    ('00000000-0000-0000-0000-00000000e002', v_match_id, 2, 'completed', v_team1_id, 21, 15);
  INSERT INTO public.match_rounds (match_id, game_id, round_number, team1_score, team2_score, entered_by_user_id)
  VALUES (v_match_id, '00000000-0000-0000-0000-00000000e001', 1, 12, 0, v_member_id);
  PERFORM auth.set_test_claims(v_outsider_id);
  BEGIN
    PERFORM public.finalize_live_match(v_match_id);
    RAISE EXCEPTION 'finalize_live_match allowed non-member';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Not authorized to finalize this match' THEN RAISE; END IF;
  END;
  PERFORM auth.set_test_claims(v_admin_id);
  v_result_json := public.finalize_live_match(v_match_id);
  IF v_result_json->>'applied' <> 'true' THEN RAISE EXCEPTION 'finalize_live_match did not apply: %', v_result_json; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_match_id AND iscompleted = true AND winner_id = v_team1_id AND loser_id = v_team2_id AND team1_score = 1 AND team2_score = 0 AND team1_game_wins = 2 AND team2_game_wins = 0) THEN RAISE EXCEPTION 'finalize_live_match did not set completion fields'; END IF;
  v_result_json := public.finalize_live_match(v_match_id);
  IF v_result_json->>'applied' <> 'false' THEN RAISE EXCEPTION 'finalize_live_match repeat was not idempotent: %', v_result_json; END IF;

  -- reopen_live_match: admin-only, reverses stats, clears completion fields, already-open false.
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    PERFORM public.reopen_live_match(v_match_id);
    RAISE EXCEPTION 'reopen_live_match allowed non-admin';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text <> 'Admin access required' THEN RAISE; END IF;
  END;
  PERFORM auth.set_test_claims(v_admin_id);
  v_result_bool := public.reopen_live_match(v_match_id);
  IF v_result_bool IS DISTINCT FROM true THEN RAISE EXCEPTION 'reopen_live_match did not return true'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_match_id AND iscompleted = false AND winner_id IS NULL AND loser_id IS NULL AND team1_score = 0 AND team2_score = 0) THEN RAISE EXCEPTION 'reopen_live_match did not clear completion fields'; END IF;
  v_result_bool := public.reopen_live_match(v_match_id);
  IF v_result_bool IS DISTINCT FROM false THEN RAISE EXCEPTION 'reopen_live_match already-open did not return false'; END IF;

  -- undecided finalize refusal.
  v_match_id := '00000000-0000-0000-0000-00000000d003';
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted) VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 3, false);
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id) VALUES ('00000000-0000-0000-0000-00000000e003', v_match_id, 1, 'completed', v_team1_id);
  BEGIN
    PERFORM public.finalize_live_match(v_match_id);
    RAISE EXCEPTION 'finalize_live_match allowed undecided match';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE 'Match is not decided yet%' THEN RAISE; END IF;
  END;

  -- delete_match_with_stats_reversal: deletes exactly one completed match, reverses stats, reports JSON, missing match errors.
  v_match_id := '00000000-0000-0000-0000-00000000d004';
  UPDATE public.teams SET wins = 1, losses = 0, game_wins = 2, game_losses = 1 WHERE id = v_team1_id;
  UPDATE public.teams SET wins = 0, losses = 1, game_wins = 1, game_losses = 2 WHERE id = v_team2_id;
  INSERT INTO public.matches (id, team1_id, team2_id, winner_id, loser_id, season_id, round_number, iscompleted, team1_game_wins, team2_game_wins)
  VALUES (v_match_id, v_team1_id, v_team2_id, v_team1_id, v_team2_id, v_season_id, 4, true, 2, 1);
  v_result_json := public.delete_match_with_stats_reversal(v_match_id);
  IF v_result_json->>'success' <> 'true' OR v_result_json->>'stats_reversed' <> 'true' THEN RAISE EXCEPTION 'delete_match_with_stats_reversal returned %', v_result_json; END IF;
  IF EXISTS (SELECT 1 FROM public.matches WHERE id = v_match_id) THEN RAISE EXCEPTION 'delete_match_with_stats_reversal did not delete match'; END IF;
  IF EXISTS (SELECT 1 FROM public.teams WHERE id IN (v_team1_id, v_team2_id) AND (wins <> 0 OR losses <> 0 OR game_wins <> 0 OR game_losses <> 0)) THEN RAISE EXCEPTION 'delete_match_with_stats_reversal did not reverse stats'; END IF;
  BEGIN
    PERFORM public.delete_match_with_stats_reversal(v_match_id);
    RAISE EXCEPTION 'delete_match_with_stats_reversal allowed missing match';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT;
    IF v_err_text NOT LIKE 'Match not found:%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'score_stats_business_logic smoke test passed';
END $$;

ROLLBACK;
