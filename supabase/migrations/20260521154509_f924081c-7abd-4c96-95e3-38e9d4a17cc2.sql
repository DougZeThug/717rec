
-- Contact requests table for the homepage contact form
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('timeslot','score','join_league','general','other')),
  submitter_name TEXT NOT NULL,
  submitter_team TEXT,
  submitter_contact TEXT NOT NULL,
  players TEXT,
  message TEXT NOT NULL,
  user_id UUID,
  team_id UUID,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_requests_status_created ON public.contact_requests (status, created_at DESC);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Admins can see / update / delete everything
CREATE POLICY "Admins can view contact requests"
  ON public.contact_requests FOR SELECT
  TO authenticated
  USING (current_user_is_admin());

CREATE POLICY "Admins can update contact requests"
  ON public.contact_requests FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete contact requests"
  ON public.contact_requests FOR DELETE
  TO authenticated
  USING (current_user_is_admin());

-- Inserts are performed by the edge function using the service role,
-- which bypasses RLS. No public INSERT policy is created on purpose so that
-- anon/authenticated users can't write arbitrary rows directly.

CREATE TRIGGER trg_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
