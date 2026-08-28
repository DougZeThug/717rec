\set ON_ERROR_STOP on

-- B-32 coverage: every path that results a match must award the same badges.
--
-- Kept in its own file rather than added to score_stats_business_logic.sql: the
-- streak checks need several extra completed matches for one team, and that file
-- asserts exact team_season_stats counters that extra matches would invalidate.

BEGIN;

DO $$
DECLARE
  v_admin_id    uuid := '00000000-0000-0000-0000-0000000ba001';
  v_season_id   uuid := '00000000-0000-0000-0000-0000000bb001';
  v_division_id uuid := '00000000-0000-0000-0000-0000000bb002';
  v_team1_id    uuid := '00000000-0000-0000-0000-0000000bc001';
  v_team2_id    uuid := '00000000-0000-0000-0000-0000000bc002';
  v_live_match  uuid := '00000000-0000-0000-0000-0000000bd004';
  v_open_match  uuid := '00000000-0000-0000-0000-0000000bd005';
  v_result      jsonb;
  v_count       integer;
  i             integer;
BEGIN
  DELETE FROM public.team_badge_events WHERE team_id IN (v_team1_id, v_team2_id);
  DELETE FROM public.games WHERE match_id::text LIKE '00000000-0000-0000-0000-0000000bd%';
  DELETE FROM public.matches WHERE id::text LIKE '00000000-0000-0000-0000-0000000bd%';
  DELETE FROM public.team_season_stats WHERE season_id = v_season_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id = v_admin_id;
  DELETE FROM auth.users WHERE id = v_admin_id;

  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'badge-admin@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'badgeadmin', 'Badge Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true;
  PERFORM set_config('session_replication_role', 'origin', true);

  -- The badge checks resolve "the active season" with LIMIT 1, and the migration
  -- set seeds one of its own, so make this fixture's season the only active one.
  -- The surrounding transaction is rolled back, so nothing leaks.
  UPDATE public.seasons SET is_active = false WHERE is_active = true;
  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Badge Smoke Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Badge Smoke Division', 'Badge Smoke Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Badge Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Badge Team 2', v_division_id, 0, 0, 0, 0);

  PERFORM auth.set_test_claims(v_admin_id);

  -- Three completed wins for team 1. A fourth makes a hot streak (threshold 4).
  FOR i IN 1..3 LOOP
    INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number,
                                iscompleted, winner_id, loser_id,
                                team1_game_wins, team2_game_wins, date)
    VALUES (('00000000-0000-0000-0000-0000000bd00' || i)::uuid,
            v_team1_id, v_team2_id, v_season_id, i, true, v_team1_id, v_team2_id,
            2, 0, ('2026-01-0' || i)::date);
  END LOOP;

  -- No badge yet: three wins is under the threshold.
  SELECT count(*) INTO v_count FROM public.team_badge_events
   WHERE team_id = v_team1_id AND badge_type = 'hot_streak' AND is_active;
  IF v_count <> 0 THEN RAISE EXCEPTION 'hot_streak awarded before the fourth win'; END IF;

  -- The live-scoring path: a decided but unfinalised match, scored round by round.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number,
                              iscompleted, team1_score, team2_score, date)
  VALUES (v_live_match, v_team1_id, v_team2_id, v_season_id, 4, false, 0, 0, '2026-01-04');
  INSERT INTO public.games (id, match_id, game_number, status, winner_team_id, team1_score, team2_score) VALUES
    ('00000000-0000-0000-0000-0000000be001', v_live_match, 1, 'completed', v_team1_id, 21, 10),
    ('00000000-0000-0000-0000-0000000be002', v_live_match, 2, 'completed', v_team1_id, 21, 15);

  v_result := public.finalize_live_match(v_live_match);
  IF (v_result->>'applied')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'finalize_live_match did not apply: %', v_result;
  END IF;

  -- B-32 proper. Before the fix this finds nothing: the live path awarded no
  -- badges at all, while the same result reported as a score awarded these.
  SELECT count(*) INTO v_count FROM public.team_badge_events
   WHERE team_id = v_team1_id AND badge_type = 'hot_streak' AND is_active;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'live finalise did not award hot_streak to the winner (found %)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.team_badge_events
   WHERE team_id = v_team2_id AND badge_type = 'cold_streak' AND is_active;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'live finalise did not award cold_streak to the loser (found %)', v_count;
  END IF;

  -- The badge is stamped with the season it was earned in.
  SELECT count(*) INTO v_count FROM public.team_badge_events
   WHERE team_id = v_team1_id AND badge_type = 'hot_streak' AND season_id = v_season_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'hot_streak not scoped to the active season'; END IF;

  -- Every check dispatches. The rulebook resolves the team-scoped checks through
  -- EXECUTE format(...), so a mistyped function name would be swallowed by the
  -- per-check trap and become a silent no-op. checks_run is what catches that:
  -- 15 for a decided match (6 per team, plus 2 winner-scoped, plus king slayer).
  v_result := public.process_all_match_badges(v_live_match);
  IF (v_result->>'checks_run')::integer <> 15 THEN
    RAISE EXCEPTION 'expected 15 checks on a decided match, got % -- errors: %',
      v_result->>'checks_run', v_result->'errors';
  END IF;
  IF jsonb_array_length(v_result->'errors') <> 0 THEN
    RAISE EXCEPTION 'badge checks reported errors: %', v_result->'errors';
  END IF;

  -- A tie is a completed match with no winner. The three winner-scoped checks are
  -- skipped; the twelve team-scoped ones still run, because a tie changes them.
  PERFORM public.mark_match_as_tie(v_live_match);
  v_result := public.process_all_match_badges(v_live_match);
  IF (v_result->>'processed')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'tie was not processed: %', v_result;
  END IF;
  IF (v_result->>'winner_scoped')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'tie ran the winner-scoped checks: %', v_result;
  END IF;
  IF (v_result->>'checks_run')::integer <> 12 THEN
    RAISE EXCEPTION 'expected 12 checks on a tie, got % -- errors: %',
      v_result->>'checks_run', v_result->'errors';
  END IF;

  -- A match with no result yet: report, do not raise.
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
  VALUES (v_open_match, v_team1_id, v_team2_id, v_season_id, 5, false);
  v_result := public.process_all_match_badges(v_open_match);
  IF (v_result->>'processed')::boolean IS DISTINCT FROM false
     OR v_result->>'reason' <> 'match_not_completed' THEN
    RAISE EXCEPTION 'unfinished match not reported correctly: %', v_result;
  END IF;

  -- An unknown match id must not raise: raising would abort the caller's
  -- transaction and undo a result that was correctly saved.
  v_result := public.process_all_match_badges('00000000-0000-0000-0000-0000000bdfff'::uuid);
  IF (v_result->>'processed')::boolean IS DISTINCT FROM false
     OR v_result->>'reason' <> 'match_not_found' THEN
    RAISE EXCEPTION 'unknown match id not reported correctly: %', v_result;
  END IF;

  RAISE NOTICE 'match badge processing smoke test passed';
END;
$$;

ROLLBACK;
