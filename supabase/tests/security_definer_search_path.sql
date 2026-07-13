\set ON_ERROR_STOP on

-- Enforce that every SECURITY DEFINER function in the public schema has an
-- explicit search_path pinned via SET search_path=... on the function itself.
-- This defends definer-rights functions against search-path hijacking and is
-- both a Supabase linter recommendation and this repo's own hardening standard.
DO $$
DECLARE
  offenders text;
BEGIN
  SELECT string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    INTO offenders
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
      )
    );

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY DEFINER function(s) missing pinned search_path: %', offenders;
  END IF;

  RAISE NOTICE 'All SECURITY DEFINER functions in public have a pinned search_path.';
END $$;