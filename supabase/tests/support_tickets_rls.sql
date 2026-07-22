-- PR-07: support_tickets RLS smoke test.
-- Run after applying migrations:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/support_tickets_rls.sql
-- Exits non-zero if the table is missing, RLS is off, an anon-readable policy
-- exists, or anon can actually read/write rows.
\set ON_ERROR_STOP on

BEGIN;

-- 1) Structural invariants: table exists, RLS enabled, and NO policy exposes
--    the table to anon/public.
DO $$
DECLARE
  v_rls boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    RAISE EXCEPTION 'support_tickets table is missing';
  END IF;

  SELECT relrowsecurity
    INTO v_rls
    FROM pg_class
   WHERE oid = 'public.support_tickets'::regclass;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'RLS is not enabled on support_tickets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'support_tickets'
       AND cmd IN ('SELECT', 'ALL')
       AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  ) THEN
    RAISE EXCEPTION 'support_tickets must not expose SELECT to anon/public';
  END IF;
END $$;

-- 2) Behavioral: seed a row as the (superuser) migration owner, which bypasses
--    RLS, then confirm the anon role cannot read or write it. We GRANT table
--    privileges to anon first to mirror Supabase's default grants, so this test
--    exercises RLS itself — not merely a missing GRANT.
INSERT INTO public.support_tickets (name, email, subject, message)
VALUES ('Smoke Tester', 'smoke@example.test', 'general_question', 'hello');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO anon, authenticated;

SET LOCAL ROLE anon;

DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.support_tickets;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'anon must not read support_tickets, but saw % row(s)', v_count;
  END IF;
END $$;

-- anon INSERT must be blocked by RLS (no permissive INSERT policy exists).
DO $$
BEGIN
  BEGIN
    INSERT INTO public.support_tickets (name, email, subject, message)
    VALUES ('Evil', 'evil@example.test', 'other', 'x');
    RAISE EXCEPTION 'anon INSERT into support_tickets should have been blocked by RLS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- expected: row-level security denies the write
  END;
END $$;

RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'support_tickets RLS OK: anon cannot read or write.'; END $$;

ROLLBACK;
