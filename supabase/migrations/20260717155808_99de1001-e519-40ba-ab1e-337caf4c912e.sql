
CREATE OR REPLACE FUNCTION public.enforce_message_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_username text;
  v_team_id uuid;
  v_team_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NEW.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;

  SELECT COALESCE(p.username, p.full_name, 'User')
    INTO v_username
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_username IS NULL THEN
    v_username := 'User';
  END IF;

  NEW.username := v_username;

  IF TG_TABLE_NAME = 'messages' THEN
    IF NEW.team_id IS NOT NULL THEN
      SELECT t.id, t.name
        INTO v_team_id, v_team_name
      FROM public.team_memberships tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = v_uid
        AND tm.team_id = NEW.team_id
        AND tm.is_approved = true
      LIMIT 1;

      IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'You are not an approved member of the specified team';
      END IF;

      NEW.team_name := v_team_name;
    ELSE
      NEW.team_name := NULL;
    END IF;
  ELSE
    IF NEW.team_name IS NOT NULL THEN
      SELECT t.name
        INTO v_team_name
      FROM public.team_memberships tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = v_uid
        AND tm.is_approved = true
        AND t.name = NEW.team_name
      LIMIT 1;

      IF v_team_name IS NULL THEN
        NEW.team_name := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_messages_identity ON public.messages;
CREATE TRIGGER trg_enforce_messages_identity
BEFORE INSERT OR UPDATE OF username, team_name, team_id, user_id
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_identity();

DROP TRIGGER IF EXISTS trg_enforce_match_comments_identity ON public.match_comments;
CREATE TRIGGER trg_enforce_match_comments_identity
BEFORE INSERT OR UPDATE OF username, team_name, user_id
ON public.match_comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_identity();
