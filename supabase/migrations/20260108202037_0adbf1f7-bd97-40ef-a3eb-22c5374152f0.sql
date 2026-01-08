-- Create team_requests table
CREATE TABLE public.team_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('TIME_CHANGE', 'BYE_REQUEST', 'EMERGENCY_CANCEL')),
  status text DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  match_date date,
  current_timeslot text,
  requested_timeslot text,
  reason text,
  admin_notes text,
  submitted_by uuid,
  submitted_by_name text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;

-- Public read policy (all can view requests)
CREATE POLICY "Anyone can view requests"
  ON public.team_requests FOR SELECT
  USING (true);

-- Authenticated users can submit requests
CREATE POLICY "Authenticated users can submit requests"
  ON public.team_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update requests (process them)
CREATE POLICY "Admins can update requests"
  ON public.team_requests FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin());

-- Create indexes for common queries
CREATE INDEX idx_team_requests_status ON public.team_requests(status);
CREATE INDEX idx_team_requests_team_id ON public.team_requests(team_id);
CREATE INDEX idx_team_requests_created_at ON public.team_requests(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_team_requests_updated_at
  BEFORE UPDATE ON public.team_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();