\set ON_ERROR_STOP on

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blind_draw_signups TO anon, authenticated;
GRANT SELECT, UPDATE ON public.blind_draw_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blind_draw_signup_count(date) TO anon, authenticated;

DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-00000000ba01';
  v_event_date date := '2026-08-15';
  v_signup_id uuid;
  v_count integer;
BEGIN
  DELETE FROM public.blind_draw_signups WHERE event_date = v_event_date OR first_name LIKE 'SmokeBlind%';
  DELETE FROM public.profiles WHERE id = v_admin_id;
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'blind-admin', 'Blind Draw Admin', true);
  PERFORM set_config('session_replication_role', 'origin', true);
END $$;

SET LOCAL ROLE anon;
INSERT INTO public.blind_draw_signups (event_date, first_name, last_initial)
VALUES ('2026-08-15', 'SmokeBlind Public', 'P');
DO $$
DECLARE v_visible integer;
BEGIN
  SELECT count(*) INTO v_visible FROM public.blind_draw_signups WHERE event_date = '2026-08-15';
  IF v_visible <> 0 THEN RAISE EXCEPTION 'anon should not be able to view blind draw signups'; END IF;
  IF public.get_blind_draw_signup_count('2026-08-15') <> 1 THEN RAISE EXCEPTION 'public signup count did not include anon signup'; END IF;
  BEGIN
    DELETE FROM public.blind_draw_signups WHERE event_date = '2026-08-15';
    IF FOUND THEN RAISE EXCEPTION 'anon should not delete blind draw signups'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.blind_draw_settings SET signup_confirmation_message = 'anon drift';
    IF FOUND THEN RAISE EXCEPTION 'anon should not update blind draw settings'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$ BEGIN PERFORM auth.set_test_claims('00000000-0000-0000-0000-00000000ba01'::uuid); END $$;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_event_date date := '2026-08-15';
  v_signup_id uuid;
  v_count integer;
  v_settings_id uuid;
BEGIN
  SELECT id INTO v_signup_id FROM public.blind_draw_signups WHERE event_date = v_event_date AND first_name = 'SmokeBlind Public' LIMIT 1;
  IF v_signup_id IS NULL THEN RAISE EXCEPTION 'admin cannot see public blind draw signup'; END IF;

  INSERT INTO public.blind_draw_signups (event_date, first_name, last_initial)
  VALUES (v_event_date, 'SmokeBlind Admin', 'A');
  SELECT public.get_blind_draw_signup_count(v_event_date) INTO v_count;
  IF v_count <> 2 THEN RAISE EXCEPTION 'blind draw signup count expected 2, got %', v_count; END IF;

  DELETE FROM public.blind_draw_signups WHERE id = v_signup_id;
  SELECT public.get_blind_draw_signup_count(v_event_date) INTO v_count;
  IF v_count <> 1 THEN RAISE EXCEPTION 'admin delete did not reduce signup count, got %', v_count; END IF;

  SELECT id INTO v_settings_id FROM public.blind_draw_settings LIMIT 1;
  UPDATE public.blind_draw_settings SET signup_confirmation_message = 'Smoke blind draw confirmation' WHERE id = v_settings_id;
  IF NOT EXISTS (SELECT 1 FROM public.blind_draw_settings WHERE id = v_settings_id AND signup_confirmation_message = 'Smoke blind draw confirmation') THEN
    RAISE EXCEPTION 'admin settings update did not persist';
  END IF;

  DELETE FROM public.blind_draw_signups WHERE id <> '00000000-0000-0000-0000-000000000000';
  SELECT public.get_blind_draw_signup_count(v_event_date) INTO v_count;
  IF v_count <> 0 THEN RAISE EXCEPTION 'clear-signups behavior left % signup(s)', v_count; END IF;
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'blind draw workflow OK'; END $$;

ROLLBACK;
