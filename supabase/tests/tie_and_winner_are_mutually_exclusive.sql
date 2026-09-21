-- A match cannot end up with both a winner and a confirmed-tie stamp.
--
-- An admin can press "Alpha won" and "It was a tie" on the same unresolved match
-- before either write lands. Each write is guarded, so whichever arrives second
-- must be refused -- in BOTH orders. The winner-then-tie order was always
-- refused; the tie-then-winner order was not, and left a decisive win wearing a
-- tie stamp, which standings then counted as a win.
--
-- Run after applying migrations:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/tie_and_winner_are_mutually_exclusive.sql
\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-0000000ea001';
  v_season_id uuid := '00000000-0000-0000-0000-0000000eb001';
  v_division_id uuid := '00000000-0000-0000-0000-0000000eb002';
  v_team1_id uuid := '00000000-0000-0000-0000-0000000ec001';
  v_team2_id uuid := '00000000-0000-0000-0000-0000000ec002';
  v_match_id uuid := '00000000-0000-0000-0000-0000000ed001';
  v_applied boolean;
  v_winner uuid;
  v_stamped boolean;
  v_err text;
BEGIN
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.teams WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id = v_admin_id;
  DELETE FROM auth.users WHERE id = v_admin_id;

  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'tie-admin@example.test');
  -- Seed the admin as CI superuser, past the anti-escalation trigger.
  PERFORM set_config('session_replication_role', 'replica', true);
  -- A trigger already creates the profile from auth.users, so upsert.
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'tieadmin', 'Tie Admin', true)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
  VALUES (v_season_id, 'Tie Guard Season', '2026-01-01', true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Tie Guard Division', 'Tie Guard Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Tie Guard Alpha', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Tie Guard Bravo', v_division_id, 0, 0, 0, 0);

  PERFORM auth.set_test_claims(v_admin_id);

  -- ---------------------------------------------------------------------------
  -- Order 1: tie first, then the winner. This is the order that used to corrupt.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.matches (id, season_id, team1_id, team2_id, date, round_number,
                              iscompleted, team1_game_wins, team2_game_wins, metadata)
  VALUES (v_match_id, v_season_id, v_team1_id, v_team2_id, now(), 1, true, 1, 1,
          jsonb_build_object('tie_confirmed_at', now(), 'tie_confirmed_by', v_admin_id));

  BEGIN
    v_applied := public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 1, 1);
    RAISE EXCEPTION 'approve_match_result accepted a winner on a confirmed tie (returned %)', v_applied;
  EXCEPTION
    WHEN others THEN
      v_err := SQLERRM;
      IF v_err NOT LIKE '%already recorded as a tie%' THEN
        RAISE EXCEPTION 'expected a tie refusal, got: %', v_err;
      END IF;
  END;

  SELECT winner_id, metadata->>'tie_confirmed_at' IS NOT NULL
    INTO v_winner, v_stamped
    FROM public.matches WHERE id = v_match_id;

  IF v_winner IS NOT NULL THEN
    RAISE EXCEPTION 'a winner was written onto a confirmed tie: %', v_winner;
  END IF;
  IF NOT v_stamped THEN
    RAISE EXCEPTION 'the tie stamp was lost';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Order 2: winner first, then the tie. This order was already refused; pin it.
  -- ---------------------------------------------------------------------------
  UPDATE public.matches
  SET winner_id = NULL, loser_id = NULL, metadata = '{}'::jsonb
  WHERE id = v_match_id;

  v_applied := public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 1, 1);
  IF NOT v_applied THEN
    RAISE EXCEPTION 'approve_match_result refused a clean, undecided match';
  END IF;

  -- The tie write the client sends, with its guard, must now match no row.
  UPDATE public.matches
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tie_confirmed_at', now())
  WHERE id = v_match_id AND winner_id IS NULL;

  SELECT metadata->>'tie_confirmed_at' IS NOT NULL INTO v_stamped
    FROM public.matches WHERE id = v_match_id;

  IF v_stamped THEN
    RAISE EXCEPTION 'a tie stamp was written onto a decided match';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Reopening clears the stamp, so a tie really can be corrected to a win.
  -- ---------------------------------------------------------------------------
  UPDATE public.matches
  SET winner_id = NULL, loser_id = NULL, iscompleted = true,
      metadata = jsonb_build_object('tie_confirmed_at', now(), 'tie_confirmed_by', v_admin_id)
  WHERE id = v_match_id;

  -- What reopen_live_match does to the stamps.
  UPDATE public.matches
  SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'tie_confirmed_at' - 'tie_confirmed_by')
  WHERE id = v_match_id;

  v_applied := public.approve_match_result(v_match_id, v_team1_id, v_team2_id, 1, 1);
  IF NOT v_applied THEN
    RAISE EXCEPTION 'a reopened tie could not then be given a winner';
  END IF;

  RAISE NOTICE 'tie_and_winner_are_mutually_exclusive: OK';
END $$;

ROLLBACK;
