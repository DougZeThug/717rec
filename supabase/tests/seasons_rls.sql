-- Seasons RLS smoke test.
-- Run after applying migrations:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql
-- Exits non-zero if any canonical seasons policy is missing.
\set ON_ERROR_STOP on
DO $$
DECLARE
  n int;
  details text;
BEGIN
  SELECT count(*), string_agg(issue, '; ')
    INTO n, details
    FROM public.seasons_rls_drift();

  IF n > 0 THEN
    RAISE EXCEPTION 'seasons RLS drift detected (% issue(s)): %', n, details;
  END IF;

  RAISE NOTICE 'seasons RLS OK: all canonical policies present.';
END $$;