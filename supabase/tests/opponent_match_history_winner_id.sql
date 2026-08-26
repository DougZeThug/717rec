\set ON_ERROR_STOP on

-- Regression guard: get_opponent_match_history must identify the winner by id.
--
-- The function used to return names only, so the team page's head-to-head
-- dialog had to decide W/L by comparing winner_name against the opponent's
-- name. public.teams.name has no unique constraint, so when two teams share a
-- name that comparison is true for BOTH outcomes and every non-tie reads as a
-- loss. Migration 20260826190000 added team1_id, team2_id and winner_id.
--
-- The whole point is exercised with two teams deliberately given the SAME name:
-- winner_name cannot tell the two results apart, winner_id must.

BEGIN;

DO $$
DECLARE
  v_season_id uuid := '00000000-0000-0000-0000-0000000fd001';
  v_division_id uuid := '00000000-0000-0000-0000-0000000fd002';
  v_team_a uuid := '00000000-0000-0000-0000-0000000fd0a1';
  v_team_b uuid := '00000000-0000-0000-0000-0000000fd0b1';
  v_win_id uuid := '00000000-0000-0000-0000-0000000fd101';
  v_loss_id uuid := '00000000-0000-0000-0000-0000000fd102';
  v_tie_id uuid := '00000000-0000-0000-0000-0000000fd103';
  v_shared_name text := 'Duplicate Name FC';
  v_row_count integer;
  r record;
BEGIN
  DELETE FROM public.matches WHERE id IN (v_win_id, v_loss_id, v_tie_id);
  DELETE FROM public.teams WHERE id IN (v_team_a, v_team_b);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Winner Id Smoke Season', '2026-01-01', false);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Winner Id Smoke Division', 'Winner Id Smoke Division');

  -- Two distinct teams, one name. This is legal: teams.name has no unique index.
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_a, v_shared_name, v_division_id, 0, 0, 0, 0),
    (v_team_b, v_shared_name, v_division_id, 0, 0, 0, 0);

  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted, date,
     team1_game_wins, team2_game_wins, winner_id)
  VALUES
    -- A is named first and wins.
    (v_win_id,  v_team_a, v_team_b, v_season_id, 1, true, '2026-03-01', 2, 0, v_team_a),
    -- A is named first and loses.
    (v_loss_id, v_team_a, v_team_b, v_season_id, 2, true, '2026-03-02', 0, 2, v_team_b),
    -- Completed with no winner.
    (v_tie_id,  v_team_a, v_team_b, v_season_id, 3, true, '2026-03-03', 1, 1, NULL);

  SELECT count(*) INTO v_row_count
  FROM public.get_opponent_match_history(v_team_a, v_team_b)
  WHERE id IN (v_win_id, v_loss_id, v_tie_id);
  IF v_row_count <> 3 THEN
    RAISE EXCEPTION 'expected 3 rows back for the pair, got %', v_row_count;
  END IF;

  -- The win.
  SELECT * INTO r FROM public.get_opponent_match_history(v_team_a, v_team_b) WHERE id = v_win_id;
  IF r.winner_id IS DISTINCT FROM v_team_a THEN
    RAISE EXCEPTION 'winner_id for the win was %, expected team A (%)', r.winner_id, v_team_a;
  END IF;
  IF r.team1_id IS DISTINCT FROM v_team_a OR r.team2_id IS DISTINCT FROM v_team_b THEN
    RAISE EXCEPTION 'team ids for the win were %/%, expected %/%',
      r.team1_id, r.team2_id, v_team_a, v_team_b;
  END IF;

  -- The loss.
  SELECT * INTO r FROM public.get_opponent_match_history(v_team_a, v_team_b) WHERE id = v_loss_id;
  IF r.winner_id IS DISTINCT FROM v_team_b THEN
    RAISE EXCEPTION 'winner_id for the loss was %, expected team B (%)', r.winner_id, v_team_b;
  END IF;

  -- The tie: no winner, and not some unrelated id.
  SELECT * INTO r FROM public.get_opponent_match_history(v_team_a, v_team_b) WHERE id = v_tie_id;
  IF r.winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'winner_id for the tie was %, expected NULL', r.winner_id;
  END IF;
  IF r.winner_name IS NOT NULL THEN
    RAISE EXCEPTION 'winner_name for the tie was %, expected NULL', r.winner_name;
  END IF;

  -- The reason ids are needed at all: names cannot separate the win from the
  -- loss. If this stops holding the fixture has drifted and the guard below is
  -- no longer testing what it claims to.
  IF (SELECT winner_name FROM public.get_opponent_match_history(v_team_a, v_team_b) WHERE id = v_win_id)
     IS DISTINCT FROM
     (SELECT winner_name FROM public.get_opponent_match_history(v_team_a, v_team_b) WHERE id = v_loss_id)
  THEN
    RAISE EXCEPTION 'the two same-name teams produced different winner_name values; fixture no longer covers the ambiguity';
  END IF;

  -- Reading from the opponent's side must mirror the result.
  SELECT * INTO r FROM public.get_opponent_match_history(v_team_b, v_team_a) WHERE id = v_win_id;
  IF r.winner_id IS DISTINCT FROM v_team_a THEN
    RAISE EXCEPTION 'winner_id seen from team B was %, expected team A (%)', r.winner_id, v_team_a;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'get_opponent_match_history winner_id OK'; END $$;

ROLLBACK;
