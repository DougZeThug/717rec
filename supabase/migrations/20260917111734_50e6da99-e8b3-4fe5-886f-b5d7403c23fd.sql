CREATE OR REPLACE FUNCTION public.activate_season(season_id uuid)
RETURNS seasons
LANGUAGE plpgsql
SET search_path = 'pg_catalog', 'public'
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