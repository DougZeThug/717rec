-- Create blind_draw_signups table
CREATE TABLE public.blind_draw_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  first_name text NOT NULL,
  last_initial char(1) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blind_draw_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (public insert)
CREATE POLICY "Anyone can sign up for blind draw"
ON public.blind_draw_signups
FOR INSERT
WITH CHECK (true);

-- Only admins can view signups
CREATE POLICY "Admins can view blind draw signups"
ON public.blind_draw_signups
FOR SELECT
USING (current_user_is_admin());

-- Only admins can delete signups
CREATE POLICY "Admins can delete blind draw signups"
ON public.blind_draw_signups
FOR DELETE
USING (current_user_is_admin());

-- Create index for efficient date filtering
CREATE INDEX idx_blind_draw_signups_event_date ON public.blind_draw_signups(event_date);