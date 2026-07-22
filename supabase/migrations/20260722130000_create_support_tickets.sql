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
