-- Fix search_path for activate_season function
-- This function is NOT SECURITY DEFINER so risk is low, but setting search_path
-- is a best practice to prevent potential schema confusion attacks

CREATE OR REPLACE FUNCTION public.activate_season(season_id uuid)
RETURNS seasons
LANGUAGE plpgsql
SET search_path = 'pg_catalog', 'public'  -- Security hardening
AS $function$
DECLARE
  result seasons;
BEGIN
  -- Deactivate all seasons
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  -- Activate the target season
  UPDATE public.seasons
  SET is_active = true
  WHERE id = season_id AND is_archived = false
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Season not found or is archived';
  END IF;

  RETURN result;
END;
$function$;