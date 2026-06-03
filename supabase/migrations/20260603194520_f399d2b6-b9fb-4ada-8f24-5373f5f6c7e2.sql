CREATE POLICY "Public read archived matches" ON public.matches_archive FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.matches_archive TO anon;