-- Storage for published recap graphics.
--
-- The summary graphic is rendered in an admin's browser and downloaded to be
-- posted by hand. It is ALSO uploaded here on publish, for one reason: a link
-- to /recap/<season>/week-<n> needs an og:image, and 717rec is a
-- client-rendered SPA, so a social crawler never runs the JavaScript that would
-- set one. The Cloudflare worker in workers/og-recap/ reads the stored URL and
-- injects the tags for crawlers.
--
-- Public read, admin write, mirroring the hero-cards bucket. A published recap
-- graphic is already public information — it is made to be posted.

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('recap-graphics', 'recap-graphics', true, ARRAY['image/png']::text[], 5242880)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      allowed_mime_types = ARRAY['image/png']::text[],
      file_size_limit = 5242880;

DROP POLICY IF EXISTS "Anyone can view recap graphics" ON storage.objects;
CREATE POLICY "Anyone can view recap graphics"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'recap-graphics');

DROP POLICY IF EXISTS "Admins can upload recap graphics" ON storage.objects;
CREATE POLICY "Admins can upload recap graphics"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recap-graphics'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) = 'png'
);

-- A correction publishes a new version, and a new version gets a new object
-- name, so an update is only ever a re-upload of the same edition's graphic.
DROP POLICY IF EXISTS "Admins can update recap graphics" ON storage.objects;
CREATE POLICY "Admins can update recap graphics"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'recap-graphics' AND public.current_user_is_admin())
WITH CHECK (
  bucket_id = 'recap-graphics'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) = 'png'
);

DROP POLICY IF EXISTS "Admins can delete recap graphics" ON storage.objects;
CREATE POLICY "Admins can delete recap graphics"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'recap-graphics' AND public.current_user_is_admin());
