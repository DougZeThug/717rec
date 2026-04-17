DROP POLICY IF EXISTS "Public Access for team images" ON storage.objects;
CREATE POLICY "Authenticated can list team images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teams');

DROP POLICY IF EXISTS "Allow public read access on team images" ON storage.objects;
CREATE POLICY "Authenticated can list team-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "Anyone can read hero-cards" ON storage.objects;
CREATE POLICY "Authenticated can list hero-cards"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hero-cards');

CREATE POLICY "Authenticated can list team-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-logos');