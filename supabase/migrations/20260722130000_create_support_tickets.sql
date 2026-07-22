-- PR-07: Durable storage for support-form submissions.
--
-- Before this table existed, send-support-email inserted into a non-existent
-- `support_tickets` relation ("silently noop if table is missing") and still
-- returned success — so when Resend was unavailable the visitor's message was
-- lost. This table makes that insert load-bearing.
--
-- Access model mirrors public.contact_requests / public.score_submissions:
--   * RLS enabled.
--   * Admins (current_user_is_admin()) may SELECT and UPDATE (e.g. triage
--     status new -> resolved).
--   * No anon/authenticated INSERT policy on purpose: rows are written only by
--     the edge function using the service_role key, which bypasses RLS. This
--     prevents anon users from writing arbitrary rows directly.
--
-- Reversible: additive. DROP TABLE public.support_tickets restores prior state.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON public.support_tickets (status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can read every ticket.
CREATE POLICY "Admins can view support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (current_user_is_admin());

-- Admins can update tickets (e.g. mark resolved).
CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Intentionally NO INSERT/SELECT policy for anon: inserts happen via the
-- service role in the edge function; anon has no read or write access.

-- Audit admin triage of tickets, mirroring contact_requests. The shared
-- admin-audit trigger records admin INSERT/UPDATE/DELETE into
-- security_audit_log. Service-role inserts from the edge function have
-- auth.uid() = NULL and are ignored by the trigger, so only real admin
-- mutations (e.g. status new -> resolved) are logged.
DROP TRIGGER IF EXISTS audit_admin_mutation ON public.support_tickets;
CREATE TRIGGER audit_admin_mutation
  AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation();

-- Extend the audit-coverage guard so the smoke test enforces support_tickets
-- coverage going forward. Mirrors 20260701180231 with support_tickets appended.
CREATE OR REPLACE FUNCTION public.admin_audit_coverage_drift()
RETURNS TABLE(issue text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  t text;
  audited_tables text[] := ARRAY[
    'seasons',
    'divisions',
    'teams',
    'team_timeslots',
    'brackets',
    'admin_notifications',
    'hero_cards',
    'theme_settings',
    'contact_requests',
    'season_team_participation',
    'blind_draw_settings',
    'challonge_fallback_config',
    'challonge_fallback_brackets',
    'support_tickets'
  ];
BEGIN
  IF to_regproc('public.audit_admin_mutation') IS NULL THEN
    issue := 'missing function public.audit_admin_mutation()';
    RETURN NEXT;
  END IF;

  FOREACH t IN ARRAY audited_tables LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND tg.tgname = 'audit_admin_mutation'
        AND NOT tg.tgisinternal
        AND tg.tgfoid = 'public.audit_admin_mutation'::regproc
        AND (tg.tgtype::integer & 1) = 1
        AND (tg.tgtype::integer & 2) = 0
        AND (tg.tgtype::integer & 28) = 28
    ) THEN
      issue := format('missing or misconfigured audit trigger on public.%s', t);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;
