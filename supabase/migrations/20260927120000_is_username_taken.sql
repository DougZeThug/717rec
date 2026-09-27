-- A yes/no answer to "is this name taken?", for the profile form's live check.
--
-- The form used to ask by reading profiles directly: select the row whose
-- username matches. The "Read profiles" policy lets a player see only their own
-- row, so for anyone but an admin that read came back empty whoever owned the
-- name, and the form said "Name is available". The save then hit
-- profiles_username_unique and failed with a generic error.
--
-- This function runs as its owner, so it sees every row, and it returns only a
-- boolean -- never a row, an id or another name. The match is exact, the same
-- as the unique constraint, so the answer agrees with what a save will do. The
-- caller's own row is skipped, so a player's current name never reads as taken.
--
-- Signed-in users may ask; visitors may not. Usernames are already shown to
-- signed-in players on the message board, so a yes/no reveals nothing new.
-- anon is revoked by name as well as through PUBLIC: on the live project the
-- default privileges grant it EXECUTE directly on every new function.

CREATE OR REPLACE FUNCTION public.is_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = p_username
      AND id IS DISTINCT FROM auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_username_taken(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO authenticated;
