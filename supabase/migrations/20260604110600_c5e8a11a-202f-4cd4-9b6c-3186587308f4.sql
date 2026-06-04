
CREATE TABLE public.challonge_fallback_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  header_title text NOT NULL DEFAULT 'Playoffs',
  header_subtitle text NOT NULL DEFAULT 'Live tournament brackets - click any bracket to view details',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challonge_fallback_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challonge_fallback_config TO authenticated;
GRANT ALL ON public.challonge_fallback_config TO service_role;
ALTER TABLE public.challonge_fallback_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view challonge fallback config"
  ON public.challonge_fallback_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert challonge fallback config"
  ON public.challonge_fallback_config FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can update challonge fallback config"
  ON public.challonge_fallback_config FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can delete challonge fallback config"
  ON public.challonge_fallback_config FOR DELETE TO authenticated USING (current_user_is_admin());

CREATE TABLE public.challonge_fallback_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challonge_fallback_brackets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challonge_fallback_brackets TO authenticated;
GRANT ALL ON public.challonge_fallback_brackets TO service_role;
ALTER TABLE public.challonge_fallback_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view challonge fallback brackets"
  ON public.challonge_fallback_brackets FOR SELECT USING (true);
CREATE POLICY "Admins can insert challonge fallback brackets"
  ON public.challonge_fallback_brackets FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can update challonge fallback brackets"
  ON public.challonge_fallback_brackets FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can delete challonge fallback brackets"
  ON public.challonge_fallback_brackets FOR DELETE TO authenticated USING (current_user_is_admin());

CREATE OR REPLACE FUNCTION public.touch_challonge_fallback_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_challonge_fallback_config_updated_at
  BEFORE UPDATE ON public.challonge_fallback_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_challonge_fallback_updated_at();

CREATE TRIGGER trg_challonge_fallback_brackets_updated_at
  BEFORE UPDATE ON public.challonge_fallback_brackets
  FOR EACH ROW EXECUTE FUNCTION public.touch_challonge_fallback_updated_at();

INSERT INTO public.challonge_fallback_config (enabled, header_title, header_subtitle)
VALUES (false, '2025 Summer 2 Playoffs', 'Live tournament brackets - click any bracket to view details');

INSERT INTO public.challonge_fallback_brackets (title, slug, sort_order) VALUES
  ('Competitive', '5hy558bb', 0),
  ('Intermediate 1', 'd8uwweii', 1),
  ('Intermediate 2', '1a2md5x5', 2),
  ('Recreational', '9eg7l6f', 3);
