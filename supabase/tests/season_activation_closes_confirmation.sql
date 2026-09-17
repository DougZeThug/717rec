\set ON_ERROR_STOP on

-- Regression guard: activating a season must never re-open team confirmation.
--
-- public.seasons.confirmation_open gates the "Confirm your team" card shown to
-- every signed-in member of an approved team. Its only writer is the admin
-- switch, and that switch is rendered only beside the ACTIVE season. No
-- lifecycle function referenced the column at all, so a season deactivated with
-- confirmation still open kept the flag, out of the admin's reach, and showed
-- the card to the whole league again the moment it was re-activated.
--
-- Migration 20260917120000 closes confirmation in both activation paths.

BEGIN;

DO $$
DECLARE
  v_old_id uuid := '00000000-0000-0000-0000-00000000cf01';
  v_new_id uuid := '00000000-0000-0000-0000-00000000cf02';
  v_confirmation_open boolean;
BEGIN
  DELETE FROM public.seasons WHERE id IN (v_old_id, v_new_id);
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived, confirmation_open)
  VALUES
    (v_old_id, 'Confirmation Orphan Season', '2026-01-01', true, false, true),
    (v_new_id, 'Confirmation Next Season', '2026-04-01', false, false, false);

  -- Switching away from the season that had confirmation open must close it, so
  -- it cannot sit out of reach waiting to be re-activated.
  PERFORM public.activate_season(v_new_id);

  SELECT confirmation_open INTO v_confirmation_open
  FROM public.seasons WHERE id = v_old_id;
  IF v_confirmation_open THEN
    RAISE EXCEPTION
      'activate_season left confirmation open on the season it deactivated';
  END IF;

  -- And re-activating that same season must not bring the card back on its own.
  UPDATE public.seasons SET confirmation_open = true WHERE id = v_old_id;
  PERFORM public.activate_season(v_old_id);

  SELECT confirmation_open INTO v_confirmation_open
  FROM public.seasons WHERE id = v_old_id;
  IF v_confirmation_open THEN
    RAISE EXCEPTION
      'activate_season re-activated a season with team confirmation still open';
  END IF;

  -- The activation still did its job.
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = v_old_id AND is_active = true) THEN
    RAISE EXCEPTION 'activate_season did not activate the target season';
  END IF;
  IF EXISTS (SELECT 1 FROM public.seasons WHERE id = v_new_id AND is_active = true) THEN
    RAISE EXCEPTION 'activate_season did not deactivate the previously running season';
  END IF;

  -- An admin opening confirmation on the active season still works: this
  -- migration changes the starting state, not the control.
  UPDATE public.seasons SET confirmation_open = true WHERE id = v_old_id;
  SELECT confirmation_open INTO v_confirmation_open
  FROM public.seasons WHERE id = v_old_id;
  IF NOT v_confirmation_open THEN
    RAISE EXCEPTION 'confirmation could no longer be opened on the active season';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'season activation closes confirmation OK'; END $$;

ROLLBACK;
