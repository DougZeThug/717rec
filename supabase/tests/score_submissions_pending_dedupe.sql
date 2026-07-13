\set ON_ERROR_STOP on

-- PR-05: verify the partial unique index on score_submissions blocks
-- byte-identical pending duplicates per match, and does NOT block a
-- re-submission once the prior row is approved or rejected.

BEGIN;

DO $$
DECLARE
  v_season_id uuid   := '00000000-0000-0000-0000-0000000dd001';
  v_division_id uuid := '00000000-0000-0000-0000-0000000dd002';
  v_team1_id uuid    := '00000000-0000-0000-0000-0000000dd003';
  v_team2_id uuid    := '00000000-0000-0000-0000-0000000dd004';
  v_match_id uuid    := '00000000-0000-0000-0000-0000000dd005';
  v_admin_id uuid    := '00000000-0000-0000-0000-0000000dd006';
  v_sub_id uuid;
  v_err text;
  v_index_exists boolean;
BEGIN
  -- 0) Index must exist after replay.
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'score_submissions_pending_dedupe'
  ) INTO v_index_exists;
  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'score_submissions_pending_dedupe index is missing';
  END IF;

  -- Clean any prior fixtures.
  DELETE FROM public.score_submissions WHERE match_id = v_match_id;
  DELETE FROM public.matches           WHERE id = v_match_id;
  DELETE FROM public.teams             WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions         WHERE id = v_division_id;
  DELETE FROM public.seasons           WHERE id = v_season_id;
  DELETE FROM public.profiles          WHERE id = v_admin_id;
  DELETE FROM auth.users               WHERE id = v_admin_id;

  -- Minimal fixtures (score_submissions.match_id -> matches; keep FKs happy).
  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'dedupe-admin@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
    VALUES (v_admin_id, 'dedupe_admin', 'Dedupe Admin', true)
    ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);
  INSERT INTO public.seasons (id, name, start_date, is_active)
    VALUES (v_season_id, 'Dedupe Season', '2026-01-01', false);
  INSERT INTO public.divisions (id, name, display_division)
    VALUES (v_division_id, 'Dedupe Division', 'Dedupe Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Dedupe Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Dedupe Team 2', v_division_id, 0, 0, 0, 0);
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
    VALUES (v_match_id, v_team1_id, v_team2_id, v_season_id, 1, false);

  -- 1) First pending row inserts fine.
  INSERT INTO public.score_submissions (match_id, submitter_name, message, status)
  VALUES (v_match_id, 'Alice', 'Alpha beat Beta 21-17', 'pending')
  RETURNING id INTO v_sub_id;

  -- 2) Byte-identical second pending row must be rejected by the partial unique index.
  BEGIN
    INSERT INTO public.score_submissions (match_id, submitter_name, message, status)
    VALUES (v_match_id, 'Alice', 'Alpha beat Beta 21-17', 'pending');
    RAISE EXCEPTION 'expected unique_violation on duplicate pending score_submission';
  EXCEPTION WHEN unique_violation THEN
    -- expected
    NULL;
  END;

  -- 3) After approving the original, an identical message may be re-submitted
  --    (partial index only covers status = 'pending').
  UPDATE public.score_submissions SET status = 'approved' WHERE id = v_sub_id;
  INSERT INTO public.score_submissions (match_id, submitter_name, message, status)
  VALUES (v_match_id, 'Alice', 'Alpha beat Beta 21-17', 'pending');

  RAISE NOTICE '[PR-05] score_submissions_pending_dedupe smoke passed';
END $$;

ROLLBACK;