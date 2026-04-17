DROP POLICY IF EXISTS "Authenticated can list team images" ON storage.objects;
CREATE POLICY "Admins can list team images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teams' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "Authenticated can list team-images" ON storage.objects;
CREATE POLICY "Admins can list team-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-images' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "Authenticated can list hero-cards" ON storage.objects;
CREATE POLICY "Admins can list hero-cards"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hero-cards' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "Authenticated can list team-logos" ON storage.objects;
CREATE POLICY "Admins can list team-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-logos' AND public.current_user_is_admin());