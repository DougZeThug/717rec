-- Weekly recap edition smoke test.
-- Run after applying migrations:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/recap_editions.sql
--
-- Proves the two rules the feature depends on:
--   1. Versions are append-only, so a published recap cannot be rewritten.
--   2. Version numbers are assigned by the database, not the client.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_season_id uuid;
  v_edition_id uuid;
  v_v1 uuid;
  v_v2 uuid;
  v_version int;
  v_count int;
BEGIN
  INSERT INTO public.seasons (name, start_date, is_active)
  VALUES ('Recap Smoke Season', '2026-09-04', false)
  RETURNING id INTO v_season_id;

  INSERT INTO public.recap_editions (season_id, week_number, season_slug, season_name)
  VALUES (v_season_id, 6, 'recap-smoke-season', 'Recap Smoke Season')
  RETURNING id INTO v_edition_id;

  -- 1. The trigger numbers versions, so the client never has to.
  INSERT INTO public.recap_edition_versions (edition_id, facts, caption)
  VALUES (v_edition_id, '{"factsSchemaVersion":1}'::jsonb, 'first draft')
  RETURNING id, version INTO v_v1, v_version;

  IF v_version <> 1 THEN
    RAISE EXCEPTION 'first version should be 1, got %', v_version;
  END IF;

  INSERT INTO public.recap_edition_versions (edition_id, facts, caption)
  VALUES (v_edition_id, '{"factsSchemaVersion":1}'::jsonb, 'corrected')
  RETURNING id, version INTO v_v2, v_version;

  IF v_version <> 2 THEN
    RAISE EXCEPTION 'second version should be 2, got %', v_version;
  END IF;

  -- 2. Publishing points the edition at one version.
  UPDATE public.recap_editions
     SET status = 'published',
         published_version_id = v_v2,
         published_at = now(),
         first_published_at = COALESCE(first_published_at, now())
   WHERE id = v_edition_id;

  -- 3. A published edition must carry its version. The CHECK enforces it.
  BEGIN
    UPDATE public.recap_editions
       SET published_version_id = NULL
     WHERE id = v_edition_id;
    RAISE EXCEPTION 'a published edition was allowed to drop its version pointer';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- 4. The correction did not destroy the original.
  SELECT count(*) INTO v_count
    FROM public.recap_edition_versions
   WHERE edition_id = v_edition_id;

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'expected both versions to survive, found %', v_count;
  END IF;

  -- 5. Neither anon nor authenticated may rewrite or delete a version. This is
  --    what makes "a correction is a new version" a rule rather than a habit.
  IF has_table_privilege('authenticated', 'public.recap_edition_versions', 'UPDATE') THEN
    RAISE EXCEPTION 'recap_edition_versions must not be updatable by authenticated';
  END IF;
  IF has_table_privilege('authenticated', 'public.recap_edition_versions', 'DELETE') THEN
    RAISE EXCEPTION 'recap_edition_versions must not be deletable by authenticated';
  END IF;
  IF has_table_privilege('anon', 'public.recap_edition_versions', 'INSERT') THEN
    RAISE EXCEPTION 'recap_edition_versions must not be insertable by anon';
  END IF;

  -- 6. One edition per season week, so a public address is never ambiguous.
  BEGIN
    INSERT INTO public.recap_editions (season_id, week_number, season_slug, season_name)
    VALUES (v_season_id, 6, 'recap-smoke-season', 'Recap Smoke Season');
    RAISE EXCEPTION 'a second edition for the same season week was allowed';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'recap_editions: OK';
END $$;

ROLLBACK;
