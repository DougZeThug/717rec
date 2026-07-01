-- Admin audit trigger coverage smoke test.
-- Run after applying migrations:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/admin_audit_triggers.sql
-- Exits non-zero if the audit trigger is missing from any expected table.
\set ON_ERROR_STOP on
DO $$
DECLARE
  n int;
  details text;
BEGIN
  SELECT count(*), string_agg(issue, '; ')
    INTO n, details
    FROM public.admin_audit_coverage_drift();

  IF n > 0 THEN
    RAISE EXCEPTION 'admin audit coverage drift detected (% issue(s)): %', n, details;
  END IF;

  RAISE NOTICE 'admin audit triggers OK: all expected tables are covered.';
END $$;
