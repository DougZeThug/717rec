-- PR-06 smoke test: server-side finalization of playoff bracket standings.
-- Verifies:
--   * A completed 4-team single-elimination bracket produces the expected
--     placements when the completion trigger fires.
--   * The function is idempotent (running it a second time yields the same rows).
--   * The public RPC rejects non-admin callers, while the trigger path still
--     works for the same bracket transition.
--
-- Hand-computed reference for the seeded bracket below:
--   Semifinals:
--     Match 1:  Alpha  (2) def. Delta (0)
--     Match 2:  Bravo  (2) def. Charlie (1)
--   Final:
--     Match 3:  Alpha  (2) def. Bravo (1)
--   Expected placements (rank() ordering):
--     1  Alpha   (won last match at highest depth)
--     2  Bravo   (lost final)
--     3  Charlie (lost semi) — tied with
--     3  Delta   (lost semi)
--   Expected records (no BYEs here, every match played):
--     Alpha   2-0 (4-1 games)
--     Bravo   1-1 (3-3 games)
--     Charlie 0-1 (1-2 games)
--     Delta   0-1 (0-2 games)
--
-- A second block below covers a double-elimination bracket whose grand-final
-- reset match is materialized but never played, and a third covers a
-- participant whose only match is a BYE.

BEGIN;

-- Isolated schema for the test
SET LOCAL client_min_messages = warning;

DO $$
DECLARE
  v_bracket_id uuid := gen_random_uuid();
  v_stage_id   integer;
  v_group_id   integer;
  v_round1_id  integer;
  v_round2_id  integer;
  v_team_alpha uuid;
  v_team_bravo uuid;
  v_team_char  uuid;
  v_team_delta uuid;
  v_p_alpha    integer;
  v_p_bravo    integer;
  v_p_char     integer;
  v_p_delta    integer;
  v_written    integer;
  v_placement  integer;
  v_w          integer;
  v_l          integer;
  v_gw         integer;
  v_gl         integer;
BEGIN
  -- Fixture: teams (minimal columns; team rows exist for FK targets)
  INSERT INTO public.teams (name) VALUES ('T-Alpha')   RETURNING id INTO v_team_alpha;
  INSERT INTO public.teams (name) VALUES ('T-Bravo')   RETURNING id INTO v_team_bravo;
  INSERT INTO public.teams (name) VALUES ('T-Charlie') RETURNING id INTO v_team_char;
  INSERT INTO public.teams (name) VALUES ('T-Delta')   RETURNING id INTO v_team_delta;

  -- Bracket: created NOT yet completed, so the trigger doesn't preemptively fire.
  INSERT INTO public.brackets (id, title, format, state, uses_brackets_manager)
    VALUES (v_bracket_id, 'PR-06 test bracket', 'Single Elimination', 'running', true);

  -- Stage / group / rounds
  INSERT INTO public.stage (tournament_id, name, type, number)
    VALUES (v_bracket_id, 'Main', 'single_elimination', 1)
    RETURNING id INTO v_stage_id;
  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 1, 'Winner Bracket')
    RETURNING id INTO v_group_id;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_group_id, 1, 'Semi')
    RETURNING id INTO v_round1_id;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_group_id, 2, 'Final')
    RETURNING id INTO v_round2_id;

  -- Participants map to teams
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Alpha',   v_team_alpha) RETURNING id INTO v_p_alpha;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Bravo',   v_team_bravo) RETURNING id INTO v_p_bravo;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Charlie', v_team_char)  RETURNING id INTO v_p_char;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Delta',   v_team_delta) RETURNING id INTO v_p_delta;

  -- Semifinals (completed)
  INSERT INTO public.match
    (stage_id, group_id, round_id, number, status,
     opponent1_id, opponent2_id, opponent1_score, opponent2_score,
     opponent1_result, opponent2_result)
  VALUES
    (v_stage_id, v_group_id, v_round1_id, 1, 4,
     v_p_alpha, v_p_delta, 2, 0, 'win', 'loss'),
    (v_stage_id, v_group_id, v_round1_id, 2, 4,
     v_p_bravo, v_p_char,  2, 1, 'win', 'loss'),
    (v_stage_id, v_group_id, v_round2_id, 3, 4,
     v_p_alpha, v_p_bravo, 2, 1, 'win', 'loss');

  -- Trigger the finalization via the state transition path.
  UPDATE public.brackets SET state = 'completed' WHERE id = v_bracket_id;

  -- Placement checks
  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_alpha;
  ASSERT v_placement = 1, format('Alpha expected placement 1, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_bravo;
  ASSERT v_placement = 2, format('Bravo expected placement 2, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_char;
  ASSERT v_placement = 3, format('Charlie expected placement 3, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_delta;
  ASSERT v_placement = 3, format('Delta expected placement 3, got %s', v_placement);

  -- Record checks: wins/losses count match wins; game_wins/game_losses sum the
  -- brackets-manager match scores (games won within each best-of series).
  -- ASSERT fails on NULL as well as false, so these also catch a regression
  -- where the columns are simply never populated.
  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_alpha;
  ASSERT (v_w, v_l, v_gw, v_gl) = (2, 0, 4, 1),
    format('Alpha expected 2-0 (4-1 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_bravo;
  ASSERT (v_w, v_l, v_gw, v_gl) = (1, 1, 3, 3),
    format('Bravo expected 1-1 (3-3 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_char;
  ASSERT (v_w, v_l, v_gw, v_gl) = (0, 1, 1, 2),
    format('Charlie expected 0-1 (1-2 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_team_delta;
  ASSERT (v_w, v_l, v_gw, v_gl) = (0, 1, 0, 2),
    format('Delta expected 0-1 (0-2 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  -- Idempotency: manual re-run via inner helper (mirrors trigger) — same rows.
  v_written := public._do_finalize_bracket_standings(v_bracket_id);
  ASSERT v_written = 4, format('Expected 4 rows on re-run, got %s', v_written);

  SELECT count(*) INTO v_written FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id;
  ASSERT v_written = 4, format('Expected exactly 4 total rows, got %s', v_written);

  RAISE NOTICE 'PR-06 finalize_bracket_standings smoke test passed';
END;
$$;

-- Double-elimination regression: brackets-manager always materializes the
-- grand-final RESET match (group 3, round 2). When the winners-bracket
-- champion wins grand final #1 the reset is never played, so the row sits in
-- the database with both opponents set but NULL scores/results — while still
-- satisfying the status >= 4 "resolved" guard. Before the fix both finalists'
-- deepest match was that unplayed row (won = false) and rank() tied them BOTH
-- at placement 1. The reset must also contribute nothing to any record.
--
--   WB R1  m1: Echo    2 - 0 Golf
--   WB R1  m2: Foxtrot 2 - 1 Hotel
--   WB R2  m3: Echo    2 - 1 Foxtrot     (Foxtrot drops to the losers bracket)
--   LB R1  m4: Golf    0 - 2 Hotel
--   LB R2  m5: Hotel   1 - 2 Foxtrot     (losers final)
--   GF R1  m6: Echo    2 - 0 Foxtrot     (grand final)
--   GF R2  m7: Echo      -   Foxtrot     RESET, never played (NULL scores)
--
--   Expected: 1 Echo (3-0, 6-1 games), 2 Foxtrot (2-2, 5-6 games),
--             3 Hotel (1-2, 4-4 games), 4 Golf (0-2, 0-4 games)
DO $$
DECLARE
  v_bracket_id uuid := gen_random_uuid();
  v_stage_id   integer;
  v_g_wb       integer;
  v_g_lb       integer;
  v_g_gf       integer;
  v_r_wb1      integer;
  v_r_wb2      integer;
  v_r_lb1      integer;
  v_r_lb2      integer;
  v_r_gf1      integer;
  v_r_gf2      integer;
  v_t_echo     uuid;
  v_t_fox      uuid;
  v_t_golf     uuid;
  v_t_hotel    uuid;
  v_p_echo     integer;
  v_p_fox      integer;
  v_p_golf     integer;
  v_p_hotel    integer;
  v_placement  integer;
  v_count      integer;
  v_w          integer;
  v_l          integer;
  v_gw         integer;
  v_gl         integer;
BEGIN
  INSERT INTO public.teams (name) VALUES ('T-Echo')    RETURNING id INTO v_t_echo;
  INSERT INTO public.teams (name) VALUES ('T-Foxtrot') RETURNING id INTO v_t_fox;
  INSERT INTO public.teams (name) VALUES ('T-Golf')    RETURNING id INTO v_t_golf;
  INSERT INTO public.teams (name) VALUES ('T-Hotel')   RETURNING id INTO v_t_hotel;

  INSERT INTO public.brackets (id, title, format, state, uses_brackets_manager)
    VALUES (v_bracket_id, 'DE reset-match test bracket', 'Double Elimination', 'running', true);

  INSERT INTO public.stage (tournament_id, name, type, number)
    VALUES (v_bracket_id, 'Main', 'double_elimination', 1)
    RETURNING id INTO v_stage_id;

  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 1, 'Winner Bracket') RETURNING id INTO v_g_wb;
  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 2, 'Loser Bracket')  RETURNING id INTO v_g_lb;
  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 3, 'Grand Final')    RETURNING id INTO v_g_gf;

  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_wb, 1, 'WB Round 1') RETURNING id INTO v_r_wb1;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_wb, 2, 'WB Final') RETURNING id INTO v_r_wb2;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_lb, 1, 'LB Round 1') RETURNING id INTO v_r_lb1;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_lb, 2, 'LB Final') RETURNING id INTO v_r_lb2;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_gf, 1, 'Grand Final') RETURNING id INTO v_r_gf1;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_g_gf, 2, 'Grand Final Reset') RETURNING id INTO v_r_gf2;

  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Echo', v_t_echo)    RETURNING id INTO v_p_echo;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Foxtrot', v_t_fox)  RETURNING id INTO v_p_fox;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Golf', v_t_golf)    RETURNING id INTO v_p_golf;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Hotel', v_t_hotel)  RETURNING id INTO v_p_hotel;

  INSERT INTO public.match
    (stage_id, group_id, round_id, number, status,
     opponent1_id, opponent2_id, opponent1_score, opponent2_score,
     opponent1_result, opponent2_result)
  VALUES
    (v_stage_id, v_g_wb, v_r_wb1, 1, 4, v_p_echo,  v_p_golf,  2, 0, 'win',  'loss'),
    (v_stage_id, v_g_wb, v_r_wb1, 2, 4, v_p_fox,   v_p_hotel, 2, 1, 'win',  'loss'),
    (v_stage_id, v_g_wb, v_r_wb2, 3, 4, v_p_echo,  v_p_fox,   2, 1, 'win',  'loss'),
    (v_stage_id, v_g_lb, v_r_lb1, 4, 4, v_p_golf,  v_p_hotel, 0, 2, 'loss', 'win'),
    (v_stage_id, v_g_lb, v_r_lb2, 5, 4, v_p_hotel, v_p_fox,   1, 2, 'loss', 'win'),
    (v_stage_id, v_g_gf, v_r_gf1, 6, 4, v_p_echo,  v_p_fox,   2, 0, 'win',  'loss'),
    -- The reset: materialized, "resolved" per the status guard, never played.
    (v_stage_id, v_g_gf, v_r_gf2, 7, 4, v_p_echo,  v_p_fox,   NULL, NULL, NULL, NULL);

  UPDATE public.brackets SET state = 'completed' WHERE id = v_bracket_id;

  -- Placements must be distinct 1..4 — no tie at 1 from the unplayed reset.
  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_echo;
  ASSERT v_placement = 1, format('Echo expected placement 1, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_fox;
  ASSERT v_placement = 2, format('Foxtrot expected placement 2, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_hotel;
  ASSERT v_placement = 3, format('Hotel expected placement 3, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_golf;
  ASSERT v_placement = 4, format('Golf expected placement 4, got %s', v_placement);

  SELECT count(*) INTO v_count FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND placement = 1;
  ASSERT v_count = 1, format('Expected exactly one team at placement 1, got %s', v_count);

  -- Records must exclude the unplayed reset match entirely.
  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_echo;
  ASSERT (v_w, v_l, v_gw, v_gl) = (3, 0, 6, 1),
    format('Echo expected 3-0 (6-1 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_fox;
  ASSERT (v_w, v_l, v_gw, v_gl) = (2, 2, 5, 6),
    format('Foxtrot expected 2-2 (5-6 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_hotel;
  ASSERT (v_w, v_l, v_gw, v_gl) = (1, 2, 4, 4),
    format('Hotel expected 1-2 (4-4 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_golf;
  ASSERT (v_w, v_l, v_gw, v_gl) = (0, 2, 0, 4),
    format('Golf expected 0-2 (0-4 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  -- Idempotency: re-running must overwrite, not accumulate.
  PERFORM public._do_finalize_bracket_standings(v_bracket_id);

  SELECT wins, losses, game_wins, game_losses INTO v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_echo;
  ASSERT (v_w, v_l, v_gw, v_gl) = (3, 0, 6, 1),
    format('Echo record drifted on re-run: %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  SELECT count(*) INTO v_count FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id;
  ASSERT v_count = 4, format('Expected exactly 4 DE record rows, got %s', v_count);

  RAISE NOTICE 'DE unplayed-reset placement + record smoke test passed';
END;
$$;

-- BYE-only participant: depth now comes from PLAYED matches, so a participant
-- who never played one must still land in the standings (last place, 0-0)
-- rather than dropping out of the results entirely.
--
--   R1 m1: Juliet 2 - 1 Kilo
--   R1 m2: India  vs BYE            (opponent2 NULL)
--   R2 m3: India  vs Juliet         never played (NULL scores)
--
--   Expected: 1 Juliet (1-0, 2-1 games), 2 Kilo (0-1, 1-2 games),
--             3 India  (0-0, 0-0 games)
DO $$
DECLARE
  v_bracket_id uuid := gen_random_uuid();
  v_stage_id   integer;
  v_group_id   integer;
  v_round1_id  integer;
  v_round2_id  integer;
  v_t_india    uuid;
  v_t_juliet   uuid;
  v_t_kilo     uuid;
  v_p_india    integer;
  v_p_juliet   integer;
  v_p_kilo     integer;
  v_placement  integer;
  v_count      integer;
  v_w          integer;
  v_l          integer;
  v_gw         integer;
  v_gl         integer;
BEGIN
  INSERT INTO public.teams (name) VALUES ('T-India')  RETURNING id INTO v_t_india;
  INSERT INTO public.teams (name) VALUES ('T-Juliet') RETURNING id INTO v_t_juliet;
  INSERT INTO public.teams (name) VALUES ('T-Kilo')   RETURNING id INTO v_t_kilo;

  INSERT INTO public.brackets (id, title, format, state, uses_brackets_manager)
    VALUES (v_bracket_id, 'BYE-only participant test bracket', 'Single Elimination', 'running', true);

  INSERT INTO public.stage (tournament_id, name, type, number)
    VALUES (v_bracket_id, 'Main', 'single_elimination', 1)
    RETURNING id INTO v_stage_id;
  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 1, 'Winner Bracket') RETURNING id INTO v_group_id;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_group_id, 1, 'Round 1') RETURNING id INTO v_round1_id;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_group_id, 2, 'Final') RETURNING id INTO v_round2_id;

  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'India', v_t_india)   RETURNING id INTO v_p_india;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Juliet', v_t_juliet) RETURNING id INTO v_p_juliet;
  INSERT INTO public.participant (tournament_id, name, team_id)
    VALUES (v_bracket_id, 'Kilo', v_t_kilo)     RETURNING id INTO v_p_kilo;

  INSERT INTO public.match
    (stage_id, group_id, round_id, number, status,
     opponent1_id, opponent2_id, opponent1_score, opponent2_score,
     opponent1_result, opponent2_result)
  VALUES
    (v_stage_id, v_group_id, v_round1_id, 1, 4, v_p_juliet, v_p_kilo, 2, 1, 'win', 'loss'),
    -- BYE: no opponent, no scores. Must not count as a win.
    (v_stage_id, v_group_id, v_round1_id, 2, 4, v_p_india, NULL, NULL, NULL, 'win', NULL),
    -- Final was never contested.
    (v_stage_id, v_group_id, v_round2_id, 3, 4, v_p_india, v_p_juliet, NULL, NULL, NULL, NULL);

  UPDATE public.brackets SET state = 'completed' WHERE id = v_bracket_id;

  SELECT count(*) INTO v_count FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id;
  ASSERT v_count = 3, format('Expected 3 record rows including the BYE-only team, got %s', v_count);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_juliet;
  ASSERT v_placement = 1, format('Juliet expected placement 1, got %s', v_placement);

  SELECT placement INTO v_placement FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_kilo;
  ASSERT v_placement = 2, format('Kilo expected placement 2, got %s', v_placement);

  SELECT placement, wins, losses, game_wins, game_losses
    INTO v_placement, v_w, v_l, v_gw, v_gl
    FROM public.playoff_team_records
   WHERE bracket_id = v_bracket_id AND team_id = v_t_india;
  ASSERT v_placement = 3, format('India expected placement 3, got %s', v_placement);
  ASSERT (v_w, v_l, v_gw, v_gl) = (0, 0, 0, 0),
    format('India (BYE only) expected 0-0 (0-0 games), got %s-%s (%s-%s)', v_w, v_l, v_gw, v_gl);

  RAISE NOTICE 'BYE-only participant smoke test passed';
END;
$$;

ROLLBACK;