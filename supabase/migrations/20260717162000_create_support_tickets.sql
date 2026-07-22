-- Create durable storage for support form submissions handled by the
-- send-support-email edge function. Public clients must not insert directly;
-- the edge function validates input and writes with the service role.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 1 AND 255),
  subject TEXT NOT NULL CHECK (subject IN ('bug_report','feature_request','account_issue','score_dispute','general_question','other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON public.support_tickets (status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.support_tickets FROM authenticated;
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "Admins can view support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.support_tickets IS
'Validated support form tickets. INSERTs are intentionally restricted: anon and authenticated roles have INSERT revoked and no INSERT RLS policy exists. New tickets must flow through the send-support-email edge function, which validates input and inserts using the service role. Admins can read and resolve tickets through RLS policies.';
