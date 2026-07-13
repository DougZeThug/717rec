CREATE OR REPLACE FUNCTION public.prevent_member_competitive_field_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass the guard entirely.
  IF public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin (approved member) updates: only allow presentational fields to change.
  IF NEW.wins IS DISTINCT FROM OLD.wins
     OR NEW.losses IS DISTINCT FROM OLD.losses
     OR NEW.game_wins IS DISTINCT FROM OLD.game_wins
     OR NEW.game_losses IS DISTINCT FROM OLD.game_losses
     OR NEW.seed IS DISTINCT FROM OLD.seed
     OR NEW.challonge_participant_id IS DISTINCT FROM OLD.challonge_participant_id
     OR NEW.division_id IS DISTINCT FROM OLD.division_id
     OR NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Only admins can modify competitive/authoritative team fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_member_competitive_field_updates ON public.teams;
CREATE TRIGGER trg_prevent_member_competitive_field_updates
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.prevent_member_competitive_field_updates();