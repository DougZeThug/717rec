\set ON_ERROR_STOP on

-- Pins the head-to-head win / loss / game counts the app shows.
--
-- Two functions read the same history and both are live:
--   * get_head_to_head_records(p_team_id)  -> a thin wrapper over the view
--     v_head_to_head; one row per (team, opponent), from that team's side.
--     Read by HeadToHeadService (the team page's head-to-head list).
--   * get_batch_head_to_head(p_team_pairs) -> one row per requested pair.
--     Read by TeamCareerStatsService.
--
-- Both count three sources: regular-season matches, playoff matches and
-- matches_archive (past seasons). A completed match with no winner (a tie) is
-- counted by neither function, and an unfinished match is not counted even if
-- a stale winner is stamped on the row.
--
-- The fixture swaps sides on purpose (B is team1 in one of the A-B matches) so
-- that a count taken from the wrong side reads wrong. The numbers are worked
-- out by hand below.
--
--   A vs B   counted:  m1  regular, A wins 2-0
--                      m2  regular, B is team1 and wins 2-1
--                      po  playoff, A wins 2-1
--                      ar  archive, A wins 2-0
--            ignored:  m3  completed tie 1-1, no winner
--                      m4  not completed (stale winner A, 2-0)
--            A side:   played 4, wins 3 (m1, po, ar), losses 1 (m2),
--                      game wins 2+1+2+2 = 7, game losses 0+2+1+0 = 3,
--                      win pct 3 / 4 = 75.0
--            B side:   the same four matches mirrored: wins 1, losses 3,
--                      game wins 3, game losses 7, win pct 25.0
--   A vs C   one regular match, A wins 2-1: played 1, wins 1, game 2-1, 100.0

BEGIN;

DO $$
DECLARE
  v_season_id uuid := '00000000-0000-0000-0000-0000000fc001';
  v_division_id uuid := '00000000-0000-0000-0000-0000000fc002';
  v_team_a uuid := '00000000-0000-0000-0000-0000000fc0a1';
  v_team_b uuid := '00000000-0000-0000-0000-0000000fc0b1';
  v_team_c uuid := '00000000-0000-0000-0000-0000000fc0c1';
  v_m1_id uuid := '00000000-0000-0000-0000-0000000fc101';
  v_m2_id uuid := '00000000-0000-0000-0000-0000000fc102';
  v_tie_id uuid := '00000000-0000-0000-0000-0000000fc103';
  v_open_id uuid := '00000000-0000-0000-0000-0000000fc104';
  v_ac_id uuid := '00000000-0000-0000-0000-0000000fc105';
  v_playoff_id uuid := '00000000-0000-0000-0000-0000000fc106';
  v_archive_id uuid := '00000000-0000-0000-0000-0000000fc107';
  v_row_count integer;
  v_order uuid[];
  v_pairs jsonb;
  r record;
BEGIN
  DELETE FROM public.matches_archive WHERE id = v_archive_id;
  DELETE FROM public.playoff_matches WHERE id = v_playoff_id;
  DELETE FROM public.matches
   WHERE id IN (v_m1_id, v_m2_id, v_tie_id, v_open_id, v_ac_id);
  DELETE FROM public.teams WHERE id IN (v_team_a, v_team_b, v_team_c);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Head To Head Smoke Season', '2026-01-01', false);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Head To Head Smoke Division', 'Head To Head Smoke Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_a, 'Head To Head Alpha',   v_division_id, 0, 0, 0, 0),
    (v_team_b, 'Head To Head Bravo',   v_division_id, 0, 0, 0, 0),
    (v_team_c, 'Head To Head Charlie', v_division_id, 0, 0, 0, 0);

  -- The view needs a loser_id on every row it counts, so a decided match sets both.
  INSERT INTO public.matches
    (id, team1_id, team2_id, season_id, round_number, iscompleted, date,
     team1_game_wins, team2_game_wins, winner_id, loser_id)
  VALUES
    -- m1: A is named first and wins 2-0.
    (v_m1_id,   v_team_a, v_team_b, v_season_id, 1, true,  '2026-03-01', 2, 0, v_team_a, v_team_b),
    -- m2: sides swapped. B is named first and wins 2-1, so A took one game.
    (v_m2_id,   v_team_b, v_team_a, v_season_id, 2, true,  '2026-03-08', 2, 1, v_team_b, v_team_a),
    -- m3: completed tie, no winner and no loser. Not counted.
    (v_tie_id,  v_team_a, v_team_b, v_season_id, 3, true,  '2026-03-15', 1, 1, NULL,     NULL),
    -- m4: not completed. The stale winner makes sure only iscompleted keeps it out.
    (v_open_id, v_team_a, v_team_b, v_season_id, 4, false, '2026-03-22', 2, 0, v_team_a, v_team_b),
    -- A vs C: A wins 2-1.
    (v_ac_id,   v_team_a, v_team_c, v_season_id, 5, true,  '2026-03-29', 2, 1, v_team_a, v_team_c);

  -- Playoff scores are game wins and are numeric on this table.
  INSERT INTO public.playoff_matches
    (id, match_type, position, round, team1_id, team2_id, team1_score, team2_score,
     winner_id, loser_id, status)
  VALUES
    (v_playoff_id, 'winners', 1, 1, v_team_a, v_team_b, 2, 1, v_team_a, v_team_b, 'completed');

  -- A past season's copy of a match.
  INSERT INTO public.matches_archive
    (id, team1_id, team2_id, season_id, round_number, iscompleted, date,
     team1_game_wins, team2_game_wins, winner_id, loser_id)
  VALUES
    (v_archive_id, v_team_a, v_team_b, v_season_id, 1, true, '2025-09-01', 2, 0, v_team_a, v_team_b);

  -- ---------------------------------------------------------------------------
  -- get_head_to_head_records(team): A's own rows.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_row_count FROM public.get_head_to_head_records(v_team_a);
  IF v_row_count <> 2 THEN
    RAISE EXCEPTION 'get_head_to_head_records(A) returned % rows, expected 2 (B and C)', v_row_count;
  END IF;

  -- Ordered win % descending, so the clean sweep over C comes before B.
  SELECT array_agg(f.opponent_id ORDER BY f.n) INTO v_order
  FROM public.get_head_to_head_records(v_team_a) WITH ORDINALITY
       AS f(team_id, opponent_id, matches_played, wins, losses, game_wins, game_losses,
            win_pct, last_played_at, n);
  IF v_order IS DISTINCT FROM ARRAY[v_team_c, v_team_b] THEN
    RAISE EXCEPTION 'get_head_to_head_records(A) order was %, expected C (100.0) then B (75.0)', v_order;
  END IF;

  SELECT * INTO r FROM public.get_head_to_head_records(v_team_a) WHERE opponent_id = v_team_b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_head_to_head_records(A) has no row for B';
  END IF;
  IF (r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct)
     IS DISTINCT FROM (4, 3, 1, 7, 3, 75.0) THEN
    RAISE EXCEPTION 'A vs B (A side) read played % / wins % / losses % / game wins % / game losses % / win pct %, expected 4 / 3 / 1 / 7 / 3 / 75.0',
      r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct;
  END IF;

  SELECT * INTO r FROM public.get_head_to_head_records(v_team_a) WHERE opponent_id = v_team_c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_head_to_head_records(A) has no row for C';
  END IF;
  IF (r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct)
     IS DISTINCT FROM (1, 1, 0, 2, 1, 100.0) THEN
    RAISE EXCEPTION 'A vs C read played % / wins % / losses % / game wins % / game losses % / win pct %, expected 1 / 1 / 0 / 2 / 1 / 100.0',
      r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct;
  END IF;

  -- ---------------------------------------------------------------------------
  -- get_head_to_head_records(NULL): every team, so the mirrored rows appear too.
  -- Filtered to the fixture teams so other data in the database cannot matter.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_row_count
  FROM public.get_head_to_head_records(NULL)
  WHERE team_id IN (v_team_a, v_team_b, v_team_c)
    AND opponent_id IN (v_team_a, v_team_b, v_team_c);
  IF v_row_count <> 4 THEN
    RAISE EXCEPTION 'get_head_to_head_records(NULL) returned % fixture rows, expected 4 (A-B, A-C, B-A, C-A)', v_row_count;
  END IF;

  SELECT * INTO r FROM public.get_head_to_head_records(NULL)
   WHERE team_id = v_team_a AND opponent_id = v_team_b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_head_to_head_records(NULL) has no A-B row';
  END IF;
  IF (r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct)
     IS DISTINCT FROM (4, 3, 1, 7, 3, 75.0) THEN
    RAISE EXCEPTION 'A-B row (all teams) read % / % / % / % / % / %, expected 4 / 3 / 1 / 7 / 3 / 75.0',
      r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct;
  END IF;

  -- The same four matches from B's side.
  SELECT * INTO r FROM public.get_head_to_head_records(NULL)
   WHERE team_id = v_team_b AND opponent_id = v_team_a;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_head_to_head_records(NULL) has no B-A row';
  END IF;
  IF (r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct)
     IS DISTINCT FROM (4, 1, 3, 3, 7, 25.0) THEN
    RAISE EXCEPTION 'B-A row read % / % / % / % / % / %, expected 4 / 1 / 3 / 3 / 7 / 25.0',
      r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct;
  END IF;

  SELECT * INTO r FROM public.get_head_to_head_records(NULL)
   WHERE team_id = v_team_c AND opponent_id = v_team_a;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_head_to_head_records(NULL) has no C-A row';
  END IF;
  IF (r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct)
     IS DISTINCT FROM (1, 0, 1, 1, 2, 0.0) THEN
    RAISE EXCEPTION 'C-A row read % / % / % / % / % / %, expected 1 / 0 / 1 / 1 / 2 / 0.0',
      r.matches_played, r.wins, r.losses, r.game_wins, r.game_losses, r.win_pct;
  END IF;

  -- ---------------------------------------------------------------------------
  -- get_batch_head_to_head(pairs): one row per requested pair, from the first
  -- team's side. Same history, same numbers.
  -- ---------------------------------------------------------------------------
  v_pairs := jsonb_build_array(
    jsonb_build_object('team1', v_team_a, 'team2', v_team_b),
    jsonb_build_object('team1', v_team_b, 'team2', v_team_a),
    jsonb_build_object('team1', v_team_a, 'team2', v_team_c),
    jsonb_build_object('team1', v_team_b, 'team2', v_team_c),
    jsonb_build_object('team1', v_team_a, 'team2', v_team_a)
  );

  -- Four rows: the A-A self pair is dropped, and B-C has no history but still
  -- gets a row of zeros.
  SELECT count(*) INTO v_row_count FROM public.get_batch_head_to_head(v_pairs);
  IF v_row_count <> 4 THEN
    RAISE EXCEPTION 'get_batch_head_to_head returned % rows, expected 4 (the self pair returns none)', v_row_count;
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_batch_head_to_head(v_pairs)
             WHERE team1_id = v_team_a AND team2_id = v_team_a) THEN
    RAISE EXCEPTION 'get_batch_head_to_head returned a row for a team against itself';
  END IF;

  SELECT * INTO r FROM public.get_batch_head_to_head(v_pairs)
   WHERE team1_id = v_team_a AND team2_id = v_team_b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_batch_head_to_head has no A-B row';
  END IF;
  IF (r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins)
     IS DISTINCT FROM (3, 1, 4, 7, 3) THEN
    RAISE EXCEPTION 'batch A-B read wins % / % total % game wins % / %, expected wins 3 / 1 total 4 game wins 7 / 3',
      r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins;
  END IF;

  -- Asked the other way round, the same matches mirror.
  SELECT * INTO r FROM public.get_batch_head_to_head(v_pairs)
   WHERE team1_id = v_team_b AND team2_id = v_team_a;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_batch_head_to_head has no B-A row';
  END IF;
  IF (r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins)
     IS DISTINCT FROM (1, 3, 4, 3, 7) THEN
    RAISE EXCEPTION 'batch B-A read wins % / % total % game wins % / %, expected wins 1 / 3 total 4 game wins 3 / 7',
      r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins;
  END IF;

  SELECT * INTO r FROM public.get_batch_head_to_head(v_pairs)
   WHERE team1_id = v_team_a AND team2_id = v_team_c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_batch_head_to_head has no A-C row';
  END IF;
  IF (r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins)
     IS DISTINCT FROM (1, 0, 1, 2, 1) THEN
    RAISE EXCEPTION 'batch A-C read wins % / % total % game wins % / %, expected wins 1 / 0 total 1 game wins 2 / 1',
      r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins;
  END IF;

  -- Two teams that never met: a row, all zeros (not missing, not NULL).
  SELECT * INTO r FROM public.get_batch_head_to_head(v_pairs)
   WHERE team1_id = v_team_b AND team2_id = v_team_c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_batch_head_to_head has no B-C row; a pair with no history must still return zeros';
  END IF;
  IF (r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins)
     IS DISTINCT FROM (0, 0, 0, 0, 0) THEN
    RAISE EXCEPTION 'batch B-C read wins % / % total % game wins % / %, expected all zeros',
      r.team1_wins, r.team2_wins, r.total_matches, r.team1_game_wins, r.team2_game_wins;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'head-to-head records OK'; END $$;

ROLLBACK;
