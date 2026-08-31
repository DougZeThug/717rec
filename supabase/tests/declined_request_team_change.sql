\set ON_ERROR_STOP on

-- Smoke test for the declined-request exception in
-- prevent_team_membership_reassignment().
--
-- Keeping a refused join request (20260830170000) made the UPDATE path
-- reachable for the first time: idx_one_membership_per_user is a TOTAL unique
-- index on user_id, so the refused row is the person's only slot and asking a
-- different team has to move it. The trigger refused every non-admin change to
-- team_id, so "declined by team A, ask team B" failed with 42501 while asking
-- team A again worked -- which is what made it easy to miss.
--
-- These assertions pin both halves: a declined row may be re-aimed, and every
-- other lock the trigger holds is still held.

BEGIN;

DO $$
DECLARE
  v_member_id  uuid := '00000000-0000-0000-0000-0000000000f1';
  v_other_id   uuid := '00000000-0000-0000-0000-0000000000f2';
  v_division   uuid := '00000000-0000-0000-0000-0000000000f3';
  v_team_a     uuid := '00000000-0000-0000-0000-0000000000f4';
  v_team_b     uuid := '00000000-0000-0000-0000-0000000000f5';
  v_membership uuid := '00000000-0000-0000-0000-0000000000f6';
  v_team       uuid;
BEGIN
  -- Fixture reset (harmless on a clean CI database; helps local reruns)
  DELETE FROM public.team_memberships WHERE user_id IN (v_member_id, v_other_id);
  DELETE FROM public.teams     WHERE id IN (v_team_a, v_team_b);
  DELETE FROM public.divisions WHERE id = v_division;
  DELETE FROM public.profiles  WHERE id IN (v_member_id, v_other_id);
  DELETE FROM auth.users       WHERE id IN (v_member_id, v_other_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_member_id, 'declined-member@example.test'),
    (v_other_id,  'declined-other@example.test');

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_member_id, 'declined_member', 'Declined Member', false),
    (v_other_id,  'declined_other',  'Declined Other',  false)
  ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.divisions (id, name, display_division, division_weight)
  VALUES (v_division, 'Declined Division', 'Competitive', 0.5);

  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team_a, 'Declined Team A', v_division, 0, 0, 0, 0),
    (v_team_b, 'Declined Team B', v_division, 0, 0, 0, 0);

  -- A pending request to team A, refused by an admin.
  INSERT INTO public.team_memberships (id, user_id, team_id, is_approved, rejected_at)
  VALUES (v_membership, v_member_id, v_team_a, false, now());

  PERFORM auth.set_test_claims(v_member_id);

  -- 1. Asking a DIFFERENT team must work. This is the case that raised 42501.
  BEGIN
    UPDATE public.team_memberships
       SET team_id = v_team_b, rejected_at = NULL, rejected_by = NULL, joined_at = now()
     WHERE user_id = v_member_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'a declined person should be able to ask another team, got: %', SQLERRM;
  END;

  SELECT team_id INTO v_team FROM public.team_memberships WHERE id = v_membership;
  IF v_team IS DISTINCT FROM v_team_b THEN
    RAISE EXCEPTION 'the new team did not persist, got %', v_team;
  END IF;

  -- 2. The row is a pending request again, not still declined.
  IF EXISTS (
    SELECT 1 FROM public.team_memberships
     WHERE id = v_membership AND (rejected_at IS NOT NULL OR is_approved <> false)
  ) THEN
    RAISE EXCEPTION 'asking again did not clear the refusal';
  END IF;

  -- 3. Now that it is pending again, team_id must be locked once more.
  BEGIN
    UPDATE public.team_memberships SET team_id = v_team_a WHERE id = v_membership;
    RAISE EXCEPTION 'a pending request was allowed to change team_id';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- 4. Nor may a non-admin approve themselves, declined row or not.
  UPDATE public.team_memberships SET rejected_at = now() WHERE id = v_membership;
  BEGIN
    UPDATE public.team_memberships SET is_approved = true WHERE id = v_membership;
    RAISE EXCEPTION 'a non-admin was allowed to approve their own membership';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- 5. Nor hand the row to somebody else.
  BEGIN
    UPDATE public.team_memberships SET user_id = v_other_id WHERE id = v_membership;
    RAISE EXCEPTION 'a non-admin was allowed to change user_id';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  -- 6. An approved membership stays immovable: the exception is for declined
  --    requests only, and being on a team is not one.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.team_memberships
     SET is_approved = true, rejected_at = NULL, team_id = v_team_b
   WHERE id = v_membership;
  PERFORM set_config('session_replication_role', 'origin', true);

  BEGIN
    UPDATE public.team_memberships SET team_id = v_team_a WHERE id = v_membership;
    RAISE EXCEPTION 'an approved member was allowed to change team_id';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected
  END;

  PERFORM auth.set_test_claims(NULL);
  RAISE NOTICE 'declined_request_team_change smoke test passed';
END $$;

ROLLBACK;
