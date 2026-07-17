CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 256),
  ua_class text NOT NULL CHECK (ua_class IN ('mobile-ios','mobile-android','mobile-other','desktop','unknown')),
  anon_day_id text NOT NULL CHECK (char_length(anon_day_id) BETWEEN 8 AND 64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_day_anon_idx ON public.page_views (created_at, anon_day_id);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pageviews"
  ON public.page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read pageviews"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

CREATE VIEW public.v_daily_traffic
WITH (security_invoker = on) AS
SELECT
  (created_at AT TIME ZONE 'America/New_York')::date AS day,
  count(DISTINCT anon_day_id) AS visitors,
  count(*) AS pageviews,
  count(DISTINCT anon_day_id) FILTER (WHERE ua_class = 'mobile-ios') AS ios_visitors,
  count(DISTINCT anon_day_id) FILTER (WHERE ua_class = 'mobile-android') AS android_visitors,
  count(DISTINCT anon_day_id) FILTER (WHERE ua_class IN ('mobile-other','desktop','unknown')) AS other_visitors
FROM public.page_views
GROUP BY 1;

GRANT SELECT ON public.v_daily_traffic TO authenticated;
GRANT SELECT ON public.v_daily_traffic TO service_role;