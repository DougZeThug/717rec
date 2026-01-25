CREATE OR REPLACE FUNCTION activate_season(season_id uuid)
RETURNS seasons AS $$
DECLARE
  result seasons;
BEGIN
  -- Deactivate all seasons
  UPDATE seasons SET is_active = false WHERE is_active = true;

  -- Activate the target season
  UPDATE seasons
  SET is_active = true
  WHERE id = season_id AND is_archived = false
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Season not found or is archived';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;