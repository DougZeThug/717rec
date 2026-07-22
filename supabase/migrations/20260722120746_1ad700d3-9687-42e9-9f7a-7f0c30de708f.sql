DROP POLICY IF EXISTS "Anyone can insert pageviews" ON public.page_views;
REVOKE INSERT ON public.page_views FROM anon;
REVOKE INSERT ON public.page_views FROM authenticated;