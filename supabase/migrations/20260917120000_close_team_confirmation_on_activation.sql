-- Activating a season always starts with team confirmation closed.
--
-- `seasons.confirmation_open` gates the "Confirm your team" card that every
-- signed-in member of an approved team sees on the home page. The card shows
-- when a season is both active and has the flag set.
--
-- Nothing ever cleared the flag. `setSeasonConfirmationOpen` is its only
-- writer, and no lifecycle function -- activate, archive, partial archive or
-- finalize -- referenced the column at all. The admin switch that sets it is
-- rendered only beside the active season's badge, so once a season stopped
-- being active with confirmation still open, an admin could neither see the
-- flag nor turn it off. Re-activating that season later put the card back in
-- front of the whole league with nobody having asked for it, and the only way
-- to prevent that was to edit the row directly in SQL.
--
-- Both activation paths now close confirmation: the bulk deactivate clears the
-- season being switched away from, and the activation itself starts the
-- incoming season closed. Activation is the only way the card can appear, so
-- clearing it here shuts the door however the season was deactivated.
--
-- The archive, partial-archive and finalize functions are deliberately left
-- alone. They only ever deactivate, and a season that is not active cannot show
-- the card; if one is activated again later it comes back through a function
-- below. Editing those four much larger functions would buy nothing and risk
-- more.
--
-- An admin who wants confirmation open still opens it, exactly as before --
-- this changes the starting state, not the control.
--
-- Both functions are CREATE OR REPLACE and safe to run more than once. Neither
-- body changes in any other way.

CREATE OR REPLACE FUNCTION public.activate_season(season_id uuid)
RETURNS seasons
LANGUAGE plpgsql
SET search_path = 'pg_catalog', 'public'  -- Security hardening
AS $function$
DECLARE
  result seasons;
BEGIN
  -- Deactivate all seasons, and close any confirmation left open on them.
  UPDATE public.seasons
  SET is_active = false, confirmation_open = false
  WHERE is_active = true;

  -- Activate the target season, with confirmation closed until an admin opens it.
  UPDATE public.seasons
  SET is_active = true, confirmation_open = false
  WHERE id = season_id AND is_archived = false
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Season not found or is archived';
  END IF;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_season_with_partial_archive(p_new_season_id uuid)
RETURNS public.seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_old_id uuid;
  v_result public.seasons;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT id INTO v_old_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  IF v_old_id IS NOT NULL AND v_old_id != p_new_season_id THEN
    PERFORM public.partial_archive_season(v_old_id);
    -- partial_archive_season only clears is_active, so close the outgoing
    -- season's confirmation here.
    UPDATE public.seasons
    SET confirmation_open = false
    WHERE id = v_old_id;
  END IF;

  UPDATE public.seasons
  SET is_active = true, confirmation_open = false, updated_at = now()
  WHERE id = p_new_season_id AND is_archived = false
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Target season not found or already archived';
  END IF;

  RETURN v_result;
END;
$$;
