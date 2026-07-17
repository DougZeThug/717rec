\set ON_ERROR_STOP on

-- PR-06: verify user-reference foreign keys, chosen delete semantics, and
-- that debug_match_updates is gone.

BEGIN;

DO $$
DECLARE
  v_user_id   uuid := '00000000-0000-0000-0000-0000000ff001';
  v_admin_id  uuid := '00000000-0000-0000-0000-0000000ff002';
  v_team_id   uuid := '00000000-0000-0000-0000-0000000ff003';
  v_div_id    uuid := '00000000-0000-0000-0000-0000000ff004';
  v_season_id uuid := '00000000-0000-0000-0000-0000000ff005';
  v_match_id  uuid := '00000000-0000-0000-0000-0000000ff006';
  v_msg_id    uuid;
  v_present   boolean;
BEGIN
  -- 0) debug_match_updates must be gone.
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace
                             AND relname = 'debug_match_updates'
  ) THEN
    RAISE EXCEPTION 'debug_match_updates should have been dropped';
  END IF;

  -- 1) All six FKs exist against auth.users(id) with the intended delete action.
  PERFORM 1;
  FOR v_present IN
    SELECT (
      SELECT confdeltype FROM pg_constraint
       WHERE conname = c.conname
    ) = c.expected
    FROM (VALUES
      ('messages_user_id_fkey',          'n'),  -- SET NULL
      ('match_comments_user_id_fkey',    'c'),  -- CASCADE
      ('match_reactions_user_id_fkey',   'c'),
      ('message_reactions_user_id_fkey', 'c'),
      ('team_memberships_user_id_fkey',  'c'),
      ('contact_requests_user_id_fkey',  'n')
    ) AS c(conname, expected)
  LOOP
    IF NOT v_present THEN
      RAISE EXCEPTION 'One of the PR-06 FKs is missing or has the wrong ON DELETE action';
    END IF;
  END LOOP;

  -- 2) Seed fixtures.
  DELETE FROM public.matches WHERE id = v_match_id;
  DELETE FROM public.teams   WHERE id = v_team_id;
  DELETE FROM public.divisions WHERE id = v_div_id;
  DELETE FROM public.seasons WHERE id = v_season_id;
  DELETE FROM public.profiles WHERE id IN (v_user_id, v_admin_id);
  DELETE FROM auth.users WHERE id IN (v_user_id, v_admin_id);

  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'fk-admin@example.test'),
    (v_user_id,  'fk-user@example.test');
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin) VALUES
    (v_admin_id, 'fk_admin', 'FK Admin', true),
    (v_user_id,  'fk_user',  'FK User',  false)
  ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active)
    VALUES (v_season_id, 'FK Season', '2026-01-01', false);
  INSERT INTO public.divisions (id, name, display_division)
    VALUES (v_div_id, 'FK Div', 'FK Div');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses)
    VALUES (v_team_id, 'FK Team', v_div_id, 0, 0, 0, 0);
  INSERT INTO public.matches (id, team1_id, team2_id, season_id, round_number, iscompleted)
    VALUES (v_match_id, v_team_id, v_team_id, v_season_id, 1, false);

  -- The message identity triggers require auth.uid() to match inserted user_id.
  -- Simulate the same JWT claim context that PostgREST supplies in production.
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Rows in every affected table for v_user_id.
  INSERT INTO public.messages (user_id, username, content, category)
    VALUES (v_user_id, 'fk_user', 'hello', 'general')
    RETURNING id INTO v_msg_id;
  INSERT INTO public.match_comments (match_id, user_id, username, content)
    VALUES (v_match_id, v_user_id, 'fk_user', 'nice');
  INSERT INTO public.match_reactions (match_id, user_id, emoji)
    VALUES (v_match_id, v_user_id, 'like');
  INSERT INTO public.message_reactions (message_id, user_id, emoji)
    VALUES (v_msg_id, v_user_id, 'like');
  INSERT INTO public.team_memberships (team_id, user_id, is_approved)
    VALUES (v_team_id, v_user_id, false);
  INSERT INTO public.contact_requests (
    user_id, submitter_name, submitter_contact, request_type, message
  )
    VALUES (v_user_id, 'FK User', 'fk-user@example.test', 'general', 'hi');

  -- 3) A bogus user_id now fails with FK violation on a CASCADE-side table.
  BEGIN
    INSERT INTO public.match_reactions (match_id, user_id, emoji)
    VALUES (v_match_id, '00000000-0000-0000-0000-0000000ffdea', 'like');
    RAISE EXCEPTION 'expected foreign_key_violation for bogus user_id';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL; -- expected
  END;

  -- 4) Delete the user; assert per-column semantics.
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  -- CASCADE side: rows gone.
  IF EXISTS (SELECT 1 FROM public.match_comments   WHERE match_id = v_match_id) THEN
    RAISE EXCEPTION 'match_comments should have been cascade-deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.match_reactions  WHERE match_id = v_match_id) THEN
    RAISE EXCEPTION 'match_reactions should have been cascade-deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.message_reactions WHERE message_id = v_msg_id) THEN
    RAISE EXCEPTION 'message_reactions should have been cascade-deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_memberships WHERE team_id = v_team_id) THEN
    RAISE EXCEPTION 'team_memberships should have been cascade-deleted';
  END IF;

  -- SET NULL side: rows kept, user_id nulled.
  IF NOT EXISTS (
    SELECT 1 FROM public.messages WHERE id = v_msg_id AND user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'messages.user_id should have been set to NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.contact_requests
     WHERE submitter_contact = 'fk-user@example.test' AND user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'contact_requests.user_id should have been set to NULL';
  END IF;

  RAISE NOTICE '[PR-06] user_fk_hardening smoke passed';
END $$;

ROLLBACK;