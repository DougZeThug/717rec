-- Fix prevent_member_competitive_field_updates(): it references a column that
-- does not exist.
--
-- 20260713195636 guards public.teams against non-admin edits to competitive
-- fields. One of the fields it checks is NEW.is_hidden -- but teams has no
-- is_hidden column, and no migration ever added one. plpgsql does not resolve
-- record field references until the body executes, so CREATE OR REPLACE
-- FUNCTION accepted it and the trigger has been dormant ever since.
--
-- It is not harmless. Admins take the early-return branch on line 9 and never
-- reach the check, so nobody noticed -- but any UPDATE on teams by an approved
-- non-admin member raises:
--
--   ERROR: record "new" has no field "is_hidden"
--
-- which fails the whole statement rather than the intended permission error.
--
-- The fix is to drop the reference, NOT to add the column. A boolean is_hidden
-- would become a second source of truth for "hidden", competing with the Hidden
-- division that the standings filters, the MCP tools and the power-score
-- resolution all key on -- and every one of those checks would then have to
-- consider both. Nothing else in the codebase references is_hidden: it appears
-- exactly once, on the line being deleted.
--
-- Every other field check is preserved verbatim.

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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Only admins can modify competitive/authoritative team fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_member_competitive_field_updates() IS
  'Blocks non-admin edits to competitive fields on public.teams. Presentational '
  'fields (name, logo, image, players, spotify_url) remain editable by approved '
  'members.';
