\set ON_ERROR_STOP on

-- Regression guard: creating a season must never leave two active seasons.
--
-- public.seasons.is_active used to default to true while
-- trg_ensure_single_active_season fired on UPDATE only, so inserting a season
-- while another was active left TWO active rows and
-- SeasonQueryService.fetchActiveSeason threw "Data integrity violation".
-- Migration 20260826120000 changed the column default to false.

BEGIN;

DO $$
DECLARE
  v_running_id uuid := '00000000-0000-0000-0000-00000000af01';
  v_created_id uuid;
  v_active_count integer;
  v_new_is_active boolean;
BEGIN
  -- FIRST, before touching anything: the database as the migrations left it must
  -- not already hold more than one active season. The normalisation below would
  -- otherwise hide exactly the fault this migration repairs.
  SELECT count(*) INTO v_active_count FROM public.seasons WHERE is_active;
  IF v_active_count > 1 THEN
    RAISE EXCEPTION
      'the migrated database holds % active seasons; the repair in 20260826120000 did not run or did not cover this case',
      v_active_count;
  END IF;

  DELETE FROM public.seasons WHERE id = v_running_id;
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived)
  VALUES (v_running_id, 'Inactive-Default Running Season', '2026-01-01', true, false);

  -- Exactly what the app sends minus the explicit flag: name and dates only, so
  -- is_active comes from the column default.
  INSERT INTO public.seasons (name, start_date)
  VALUES ('Inactive-Default New Season', '2026-04-01')
  RETURNING id, is_active INTO v_created_id, v_new_is_active;

  IF v_new_is_active THEN
    RAISE EXCEPTION
      'a season created without an explicit is_active came out active; the column default is still true';
  END IF;

  SELECT count(*) INTO v_active_count FROM public.seasons WHERE is_active;
  IF v_active_count <> 1 THEN
    RAISE EXCEPTION
      'creating a season left % active seasons, expected 1', v_active_count;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_running_id AND is_active = true) THEN
    RAISE EXCEPTION 'creating a season deactivated the season that was already running';
  END IF;

  -- The Activate path still works and still hands over atomically.
  PERFORM public.activate_season(v_created_id);

  SELECT count(*) INTO v_active_count FROM public.seasons WHERE is_active;
  IF v_active_count <> 1 THEN
    RAISE EXCEPTION 'activate_season left % active seasons, expected 1', v_active_count;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_created_id AND is_active = true) THEN
    RAISE EXCEPTION 'activate_season did not activate the newly created season';
  END IF;
  IF EXISTS (SELECT 1 FROM public.seasons WHERE id = v_running_id AND is_active = true) THEN
    RAISE EXCEPTION 'activate_season did not deactivate the previously running season';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'seasons created inactive OK'; END $$;

ROLLBACK;
