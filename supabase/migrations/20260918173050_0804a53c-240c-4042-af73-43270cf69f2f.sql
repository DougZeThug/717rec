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