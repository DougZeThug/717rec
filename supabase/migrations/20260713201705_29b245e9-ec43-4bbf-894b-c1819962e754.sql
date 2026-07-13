-- PR-06: Add missing user foreign keys; drop dead debug_match_updates table.
-- Idempotent: each ADD CONSTRAINT is guarded by pg_constraint lookup.
-- Delete semantics per user_id column:
--   messages          -> SET NULL   (column already nullable; inline username preserves rendering)
--   match_comments    -> CASCADE    (column NOT NULL; avoid a schema-widening alter in this PR)
--   match_reactions   -> CASCADE
--   message_reactions -> CASCADE
--   team_memberships  -> CASCADE
--   contact_requests  -> SET NULL   (keep the inquiry, detach the account)

DO $$
DECLARE
  v_count bigint;
BEGIN
  -- ---------- messages.user_id -> auth.users(id) ON DELETE SET NULL ----------
  UPDATE public.messages
     SET user_id = NULL
   WHERE user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = messages.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] messages orphan user_id nulled: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- ---------- match_comments.user_id -> auth.users(id) ON DELETE CASCADE -----
  DELETE FROM public.match_comments c
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] match_comments orphan rows deleted: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.match_comments
      ADD CONSTRAINT match_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- ---------- match_reactions.user_id -> auth.users(id) ON DELETE CASCADE ----
  DELETE FROM public.match_reactions r
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] match_reactions orphan rows deleted: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_reactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.match_reactions
      ADD CONSTRAINT match_reactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- ---------- message_reactions.user_id -> auth.users(id) ON DELETE CASCADE --
  DELETE FROM public.message_reactions r
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] message_reactions orphan rows deleted: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_reactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.message_reactions
      ADD CONSTRAINT message_reactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- ---------- team_memberships.user_id -> auth.users(id) ON DELETE CASCADE --
  DELETE FROM public.team_memberships m
   WHERE m.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] team_memberships orphan rows deleted: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_memberships_user_id_fkey'
  ) THEN
    ALTER TABLE public.team_memberships
      ADD CONSTRAINT team_memberships_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- ---------- contact_requests.user_id -> auth.users(id) ON DELETE SET NULL --
  UPDATE public.contact_requests
     SET user_id = NULL
   WHERE user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = contact_requests.user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[PR-06] contact_requests orphan user_id nulled: %', v_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.contact_requests
      ADD CONSTRAINT contact_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop dead debug table (no references in src/ or supabase/functions/).
DROP TABLE IF EXISTS public.debug_match_updates;