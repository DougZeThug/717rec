
-- Create blind_draw_settings table (single-row config pattern)
CREATE TABLE public.blind_draw_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_confirmation_message text NOT NULL DEFAULT 'You''re signed up! See you there!',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blind_draw_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can view blind draw settings"
ON public.blind_draw_settings
FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update blind draw settings"
ON public.blind_draw_settings
FOR UPDATE
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Seed with default row
INSERT INTO public.blind_draw_settings (signup_confirmation_message)
VALUES ('You''re signed up! See you there!');

-- Timestamp trigger
CREATE TRIGGER update_blind_draw_settings_updated_at
BEFORE UPDATE ON public.blind_draw_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
