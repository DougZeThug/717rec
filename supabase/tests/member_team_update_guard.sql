\set ON_ERROR_STOP on

-- Smoke test for prevent_member_competitive_field_updates() on public.teams.
--
-- The guard used to check NEW.is_hidden, a column that does not exist on teams.
-- plpgsql resolves record fields at execution time, so the function created
-- cleanly and only failed when a non-admin actually updated a team -- with
-- 'record "new" has no field "is_hidden"' instead of the intended permission
-- error. Admins never hit it, because they return early.
--
-- These assertions pin both halves: presentational edits go through, and
-- competitive edits are still refused.

BEGIN;

DO $$
DECLARE
  v_member_id   uuid := '00000000-0000-0000-0000-0000000000e1';
  v_admin_id    uuid := '00000000-0000-0000-0000-0000000000e2';
  v_division_a  uuid := '00000000-0000-0000-0000-0000000000e3';
  v_division_b  uuid := '00000000-0000-0000-0000-0000000000e4';
  v_team_id     uuid := '00000000-0000-0000-0000-0000000000e5';
  v_name        text;
  v_div         uuid;
BEGIN
  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.teams     WHERE id = v_team_id;
  DELETE FROM public.divisions WHERE id IN (v_division_a, v_division_b);
  DELETE FROM public.profiles  WHERE id IN (v_member_id, v_admin_id);
  DELETE FROM auth.users       WHERE id IN (v_member_id, v_admin_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_member_id, 'guard-member@example.test'),
    (v_admin_id,  'guard-admin@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_member_id, 'guard_member', 'Guard Member', false),
    (v_admin_id,  'guard_admin',  'Guard Admin',  true)
  ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.divisions (id, name, display_division, division_weight) VALUES
    (v_division_a, 'Guard Division A', 'Competitive', 0.9),
    (v_division_b, 'Guard Division B', 'Recreational', 0.4);

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses)
  VALUES (v_team_id, 'Guard Team Before', v_division_a, 0, 0, 0, 0);

  -- 1. A non-admin renaming their own team must succeed. This is the case that
  --    raised 'record "new" has no field "is_hidden"'.
  PERFORM auth.set_test_claims(v_member_id);
  BEGIN
    UPDATE public.teams SET name = 'Guard Team After' WHERE id = v_team_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'a non-admin rename should be allowed, got: %', SQLERRM;
  END;

  SELECT name INTO v_name FROM public.teams WHERE id = v_team_id;
  IF v_name <> 'Guard Team After' THEN
    RAISE EXCEPTION 'rename did not persist, got %', v_name;
  END IF;

  -- 2. A non-admin must still not be able to move divisions.
  BEGIN
    UPDATE public.teams SET division_id = v_division_b WHERE id = v_team_id;
    RAISE EXCEPTION 'a non-admin was allowed to change division_id';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- 3. Nor the win/loss counters.
  BEGIN
    UPDATE public.teams SET wins = wins + 1 WHERE id = v_team_id;
    RAISE EXCEPTION 'a non-admin was allowed to change wins';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- 4. An admin can do both.
  PERFORM auth.set_test_claims(v_admin_id);
  UPDATE public.teams SET division_id = v_division_b, wins = 3 WHERE id = v_team_id;

  SELECT division_id INTO v_div FROM public.teams WHERE id = v_team_id;
  IF v_div IS DISTINCT FROM v_division_b THEN
    RAISE EXCEPTION 'admin division change did not persist';
  END IF;

  PERFORM auth.set_test_claims(NULL);
  RAISE NOTICE 'member_team_update_guard smoke test passed';
END $$;

ROLLBACK;
