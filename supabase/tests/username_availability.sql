\set ON_ERROR_STOP on
-- Smoke test for public.is_username_taken(text).
--
-- The profile form's "Name is available" check used to read profiles directly.
-- RLS lets a player see only their own row, so a name another player owned
-- read as free. The function answers from past RLS with a bare boolean. These
-- assertions pin that: RLS still hides the row, the function still sees it,
-- the caller's own name does not read as taken, case matters the way it does
-- for profiles_username_unique, and only signed-in users may ask.
BEGIN;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.is_username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not be able to call is_username_taken(text)';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.is_username_taken(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated is missing EXECUTE on is_username_taken(text)';
  END IF;
END $$;
DO $$
DECLARE
  v_owner_id  uuid := '00000000-0000-0000-0000-00000000c0a1';
  v_player_id uuid := '00000000-0000-0000-0000-00000000c0a2';
BEGIN
  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.profiles WHERE id IN (v_owner_id, v_player_id);
  DELETE FROM auth.users      WHERE id IN (v_owner_id, v_player_id);
  INSERT INTO auth.users (id, email) VALUES
    (v_owner_id,  'namecheck-owner@example.test'),
    (v_player_id, 'namecheck-player@example.test');
  -- The signup trigger has already named both profiles after their email, so
  -- the upsert has to overwrite the username, not only the other columns.
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_owner_id,  'NameCheckTaken',  'Name Check Owner',  false),
    (v_player_id, 'NameCheckPlayer', 'Name Check Player', false)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);
  -- Everything below runs as this player, an ordinary member.
  PERFORM auth.set_test_claims(v_player_id);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_visible integer;
BEGIN
  -- What the form used to do: read the row. RLS hides another player's row.
  SELECT count(*) INTO v_visible FROM public.profiles WHERE username = 'NameCheckTaken';
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'expected RLS to hide another player''s profile, saw % rows', v_visible;
  END IF;
  IF NOT public.is_username_taken('NameCheckTaken') THEN
    RAISE EXCEPTION 'a name another player owns must read as taken';
  END IF;
  IF public.is_username_taken('NameCheckPlayer') THEN
    RAISE EXCEPTION 'the caller''s own name must not read as taken';
  END IF;
  IF public.is_username_taken('NameCheckNobody') THEN
    RAISE EXCEPTION 'a name nobody owns must not read as taken';
  END IF;
  IF public.is_username_taken('namechecktaken') THEN
    RAISE EXCEPTION 'the check must be exact, like profiles_username_unique';
  END IF;
  RAISE NOTICE 'username_availability smoke test passed';
END $$;
RESET ROLE;
ROLLBACK;