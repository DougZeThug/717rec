CREATE TABLE public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view theme settings"
  ON public.theme_settings FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can update theme settings"
  ON public.theme_settings FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

INSERT INTO public.theme_settings (theme_key, label, is_enabled, sort_order) VALUES
  ('light', 'Light', true, 0),
  ('dark', 'Dark', true, 1),
  ('system', 'System', true, 2),
  ('winter-frozen', 'Winter', false, 3);