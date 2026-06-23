
-- 1. score_submissions length limits (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_submissions_submitter_name_length') THEN
    ALTER TABLE public.score_submissions ADD CONSTRAINT score_submissions_submitter_name_length CHECK (submitter_name IS NULL OR char_length(submitter_name) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_submissions_submitter_team_length') THEN
    ALTER TABLE public.score_submissions ADD CONSTRAINT score_submissions_submitter_team_length CHECK (submitter_team IS NULL OR char_length(submitter_team) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_submissions_message_length') THEN
    ALTER TABLE public.score_submissions ADD CONSTRAINT score_submissions_message_length CHECK (message IS NULL OR char_length(message) <= 2000);
  END IF;
END $$;

-- 2. Spoof-prevention trigger
CREATE OR REPLACE FUNCTION public.enforce_message_author_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_username text;
  v_team_id uuid;
  v_team_name text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = NEW.user_id;

  SELECT tm.team_id, t.name
    INTO v_team_id, v_team_name
    FROM public.team_memberships tm
    JOIN public.teams t ON t.id = tm.team_id
   WHERE tm.user_id = NEW.user_id
   LIMIT 1;

  NEW.username := COALESCE(v_username, 'Anonymous');
  IF TG_TABLE_NAME = 'messages' THEN
    NEW.team_id := v_team_id;
  END IF;
  NEW.team_name := v_team_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_messages_author_identity ON public.messages;
CREATE TRIGGER enforce_messages_author_identity
  BEFORE INSERT OR UPDATE OF username, team_name, team_id ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_author_identity();

DROP TRIGGER IF EXISTS enforce_match_comments_author_identity ON public.match_comments;
CREATE TRIGGER enforce_match_comments_author_identity
  BEFORE INSERT OR UPDATE OF username, team_name ON public.match_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_author_identity();

-- 3. rate_limit_events admin-only SELECT
DROP POLICY IF EXISTS "Admins can view rate limit events" ON public.rate_limit_events;
CREATE POLICY "Admins can view rate limit events"
  ON public.rate_limit_events
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

-- 4. team-logos storage INSERT policy for admins
DROP POLICY IF EXISTS "Admins can upload team-logos" ON storage.objects;
CREATE POLICY "Admins can upload team-logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-logos' AND public.current_user_is_admin());
