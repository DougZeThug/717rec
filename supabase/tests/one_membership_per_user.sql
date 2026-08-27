\set ON_ERROR_STOP on

-- B-07: verify the total unique index on team_memberships.user_id blocks a
-- second membership row, pending or beside an approved one, and still lets a
-- user leave and rejoin.
--
-- Two BEFORE UPDATE triggers guard this table
-- (trg_prevent_team_membership_reassignment, validate_membership_approval_trigger)
-- and both read current_user_is_admin(), which is false under psql because
-- auth.uid() is NULL. Approving is an admin action, so this file reaches it the
-- way the other SQL tests do, with session_replication_role = 'replica'.

BEGIN;

DO $$
DECLARE
  v_division_id uuid := '00000000-0000-0000-0000-0000000bb001';
  v_team1_id uuid    := '00000000-0000-0000-0000-0000000bb002';
  v_team2_id uuid    := '00000000-0000-0000-0000-0000000bb003';
  v_user_id uuid     := '00000000-0000-0000-0000-0000000bb004';
  v_admin_id uuid    := '00000000-0000-0000-0000-0000000bb005';
  v_membership_id uuid;
  v_index_exists boolean;
  v_old_index_exists boolean;
BEGIN
  -- 0) The total index must exist after replay, and the partial one must be gone.
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_one_membership_per_user'
  ) INTO v_index_exists;
  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'idx_one_membership_per_user index is missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_one_approved_membership_per_user'
  ) INTO v_old_index_exists;
  IF v_old_index_exists THEN
    RAISE EXCEPTION 'approved-only index idx_one_approved_membership_per_user was not dropped';
  END IF;

  -- Clean any prior fixtures.
  DELETE FROM public.team_memberships WHERE user_id IN (v_user_id, v_admin_id);
  DELETE FROM public.teams            WHERE id IN (v_team1_id, v_team2_id);
  DELETE FROM public.divisions        WHERE id = v_division_id;
  DELETE FROM public.profiles         WHERE id IN (v_user_id, v_admin_id);
  DELETE FROM auth.users              WHERE id IN (v_user_id, v_admin_id);

  -- Minimal fixtures (team_memberships -> auth.users, teams).
  INSERT INTO auth.users (id, email) VALUES
    (v_user_id, 'membership-dupe@example.test'),
    (v_admin_id, 'membership-admin@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_user_id, 'membership_dupe', 'Membership Dupe', false),
    (v_admin_id, 'membership_admin', 'Membership Admin', true)
    ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);
  INSERT INTO public.divisions (id, name, display_division)
    VALUES (v_division_id, 'Membership Division', 'Membership Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Membership Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Membership Team 2', v_division_id, 0, 0, 0, 0);

  -- 1) The first membership request inserts fine.
  INSERT INTO public.team_memberships (user_id, team_id, is_approved)
  VALUES (v_user_id, v_team1_id, false)
  RETURNING id INTO v_membership_id;

  -- 2) A second PENDING row is what the partial index used to allow, and it is
  --    the row that made fetchTeamMembership throw and took away every ability.
  BEGIN
    INSERT INTO public.team_memberships (user_id, team_id, is_approved)
    VALUES (v_user_id, v_team2_id, false);
    RAISE EXCEPTION 'expected unique_violation on a second pending team_membership';
  EXCEPTION WHEN unique_violation THEN
    NULL; -- expected
  END;

  -- 3) A second row is still refused once the first one is approved.
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.team_memberships
  SET is_approved = true, approved_by = v_admin_id, approved_at = now()
  WHERE id = v_membership_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  BEGIN
    INSERT INTO public.team_memberships (user_id, team_id, is_approved)
    VALUES (v_user_id, v_team2_id, false);
    RAISE EXCEPTION 'expected unique_violation on a pending row beside an approved one';
  EXCEPTION WHEN unique_violation THEN
    NULL; -- expected
  END;

  -- 4) Leaving and rejoining still works, so the index cannot strand a member.
  --    This is the only route to another team for a non-admin: the reassignment
  --    trigger refuses a team_id change on an existing row.
  DELETE FROM public.team_memberships WHERE user_id = v_user_id;
  INSERT INTO public.team_memberships (user_id, team_id, is_approved)
  VALUES (v_user_id, v_team2_id, false);

  -- 5) Exactly one row remains for this user, so maybeSingle() cannot throw.
  IF (SELECT count(*) FROM public.team_memberships WHERE user_id = v_user_id) <> 1 THEN
    RAISE EXCEPTION 'expected exactly one membership row per user';
  END IF;

  RAISE NOTICE '[B-07] one_membership_per_user smoke passed';
END $$;

-- The migration's de-dupe is its destructive half, and team_memberships is empty
-- on a replayed database, so nothing above exercises it. Drop the index, build
-- the duplicate state a live database may be carrying, and prove the de-dupe
-- keeps the row fetchTeamMembership would have read. The file rolls back, so the
-- index is restored either way.
DO $$
DECLARE
  v_division_id uuid := '00000000-0000-0000-0000-0000000bb011';
  v_team1_id uuid    := '00000000-0000-0000-0000-0000000bb012';
  v_team2_id uuid    := '00000000-0000-0000-0000-0000000bb013';
  v_team3_id uuid    := '00000000-0000-0000-0000-0000000bb014';
  v_user_id uuid     := '00000000-0000-0000-0000-0000000bb015';
  v_kept_team_id uuid;
  v_kept_count integer;
  v_orphan_count integer;
BEGIN
  EXECUTE 'DROP INDEX public.idx_one_membership_per_user';

  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'membership-dedupe@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
    VALUES (v_user_id, 'membership_dedupe', 'Membership Dedupe', false)
    ON CONFLICT (id) DO NOTHING;
  PERFORM set_config('session_replication_role', 'origin', true);
  INSERT INTO public.divisions (id, name, display_division)
    VALUES (v_division_id, 'Dedupe Division', 'Dedupe Division');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Dedupe Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Dedupe Team 2', v_division_id, 0, 0, 0, 0),
    (v_team3_id, 'Dedupe Team 3', v_division_id, 0, 0, 0, 0);

  -- An older pending row, the approved row, and a newer pending row. The
  -- approved one must win even though it is not the oldest.
  INSERT INTO public.team_memberships (user_id, team_id, is_approved, joined_at) VALUES
    (v_user_id, v_team1_id, false, '2026-01-01T00:00:00Z'),
    (v_user_id, v_team2_id, true,  '2026-02-01T00:00:00Z'),
    (v_user_id, v_team3_id, false, '2026-03-01T00:00:00Z');

  -- A row with no user_id is an orphan, not a duplicate, and must survive.
  INSERT INTO public.team_memberships (user_id, team_id, is_approved)
    VALUES (NULL, v_team1_id, false);

  -- Same statement as the migration.
  DELETE FROM public.team_memberships tm
  USING (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id
        ORDER BY is_approved DESC, joined_at ASC NULLS LAST, id ASC
      ) AS rn
    FROM public.team_memberships
    WHERE user_id IS NOT NULL
  ) ranked
  WHERE tm.id = ranked.id
    AND ranked.rn > 1;

  SELECT count(*) INTO v_kept_count
  FROM public.team_memberships WHERE user_id = v_user_id;

  IF v_kept_count <> 1 THEN
    RAISE EXCEPTION 'de-dupe left % rows for one user, expected 1', v_kept_count;
  END IF;

  SELECT team_id INTO v_kept_team_id
  FROM public.team_memberships WHERE user_id = v_user_id;
  IF v_kept_team_id <> v_team2_id THEN
    RAISE EXCEPTION 'de-dupe kept the wrong row: expected the approved membership';
  END IF;

  SELECT count(*) INTO v_orphan_count
  FROM public.team_memberships WHERE user_id IS NULL AND team_id = v_team1_id;
  IF v_orphan_count <> 1 THEN
    RAISE EXCEPTION 'de-dupe removed a NULL user_id row, which is not a duplicate';
  END IF;

  -- With one row per user the index builds, which is the order the migration
  -- relies on.
  EXECUTE 'CREATE UNIQUE INDEX idx_one_membership_per_user '
       || 'ON public.team_memberships (user_id)';

  RAISE NOTICE '[B-07] one_membership_per_user de-dupe smoke passed';
END $$;

ROLLBACK;
