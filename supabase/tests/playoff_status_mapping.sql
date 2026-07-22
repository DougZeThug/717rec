\set ON_ERROR_STOP on

-- PR-13 smoke test: match -> playoff_matches status mapping.
-- Verifies:
--   * map_bm_status_to_playoff_status covers every brackets-manager status
--     (0 Locked, 1 Waiting, 2 Ready, 3 Running, 4 Completed, 5 Archived).
--   * The INSERT sync trigger stores the mapped status (not hardcoded
--     'pending') — matters for BYE matches the library inserts already won.
--   * The UPDATE sync trigger tracks a match stepping 1 -> 2 -> 3 -> 4 -> 5.

BEGIN;

SET LOCAL client_min_messages = warning;

DO $$
DECLARE
  v_bracket_id uuid := gen_random_uuid();
  v_stage_id   integer;
  v_group_id   integer;
  v_round_id   integer;
  v_match_ids  integer[] := '{}';
  v_step_match integer;
  v_status     text;
  -- Statuses 0..6: 6 (GameCancelled) is a match_game-only status that should
  -- never appear on match rows; the mapping clamps it to 'archived'.
  v_expected   text[] := ARRAY['pending', 'pending', 'in_progress', 'in_progress', 'completed', 'archived', 'archived'];
  v_bm_status  integer;
BEGIN
  -- Direct mapping-function assertions (incl. defensive > 5 clamp).
  ASSERT public.map_bm_status_to_playoff_status(0) = 'pending';
  ASSERT public.map_bm_status_to_playoff_status(1) = 'pending';
  ASSERT public.map_bm_status_to_playoff_status(2) = 'in_progress';
  ASSERT public.map_bm_status_to_playoff_status(3) = 'in_progress';
  ASSERT public.map_bm_status_to_playoff_status(4) = 'completed';
  ASSERT public.map_bm_status_to_playoff_status(5) = 'archived';
  ASSERT public.map_bm_status_to_playoff_status(6) = 'archived';

  -- Fixture: bracket -> stage -> group -> round (no teams needed; the
  -- status mapping is independent of team links).
  INSERT INTO public.brackets (id, title, format, state, uses_brackets_manager)
    VALUES (v_bracket_id, 'PR-13 status mapping test', 'Single Elimination', 'pending', true);
  INSERT INTO public.stage (tournament_id, name, type, number)
    VALUES (v_bracket_id, 'Main', 'single_elimination', 1)
    RETURNING id INTO v_stage_id;
  INSERT INTO public.group (stage_id, number, name)
    VALUES (v_stage_id, 1, 'Bracket')
    RETURNING id INTO v_group_id;
  INSERT INTO public.round (stage_id, group_id, number, name)
    VALUES (v_stage_id, v_group_id, 1, 'Round 1')
    RETURNING id INTO v_round_id;

  -- INSERT trigger: one match per brackets-manager status 0..6. The shell
  -- row in playoff_matches must carry the mapped status from the start.
  FOR v_bm_status IN 0..6 LOOP
    INSERT INTO public.match (stage_id, group_id, round_id, number, status)
      VALUES (v_stage_id, v_group_id, v_round_id, v_bm_status + 1, v_bm_status)
      RETURNING id INTO v_step_match;
    v_match_ids := v_match_ids || v_step_match;

    SELECT pm.status INTO v_status
      FROM public.playoff_matches pm WHERE pm.match_id = v_step_match;
    ASSERT v_status = v_expected[v_bm_status + 1],
      format('insert trigger: bm status %s expected %s, got %s',
             v_bm_status, v_expected[v_bm_status + 1], v_status);
  END LOOP;

  -- UPDATE trigger: step one match through the lifecycle.
  v_step_match := v_match_ids[1];
  FOR v_bm_status IN 1..6 LOOP
    UPDATE public.match SET status = v_bm_status WHERE id = v_step_match;

    SELECT pm.status INTO v_status
      FROM public.playoff_matches pm WHERE pm.match_id = v_step_match;
    ASSERT v_status = v_expected[v_bm_status + 1],
      format('update trigger: bm status %s expected %s, got %s',
             v_bm_status, v_expected[v_bm_status + 1], v_status);
  END LOOP;

  RAISE NOTICE 'PR-13 playoff_status_mapping smoke test passed';
END;
$$;

ROLLBACK;
