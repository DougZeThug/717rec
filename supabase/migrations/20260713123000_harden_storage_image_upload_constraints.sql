-- Harden image upload constraints for application-owned storage buckets.
-- Supabase enforces allowed_mime_types and file_size_limit at the bucket layer;
-- RLS policies below also reject object names without approved image extensions.

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
  file_size_limit = 5242880
WHERE id IN ('hero-cards', 'team-images', 'team-logos', 'teams');

-- hero-cards: admin-managed marketing images
DROP POLICY IF EXISTS "Admins can upload hero-cards" ON storage.objects;
CREATE POLICY "Admins can upload hero-cards"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hero-cards'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Admins can update hero-cards" ON storage.objects;
CREATE POLICY "Admins can update hero-cards"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'hero-cards' AND public.current_user_is_admin())
WITH CHECK (
  bucket_id = 'hero-cards'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- team-images: team-member managed uploads scoped by team-id folder
DROP POLICY IF EXISTS "Team members or admins upload team-images" ON storage.objects;
CREATE POLICY "Team members or admins upload team-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-images'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Team members and admins can update team images" ON storage.objects;
CREATE POLICY "Team members and admins can update team images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'team-images'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- team-logos: legacy admin-managed team logo bucket
DROP POLICY IF EXISTS "Admins can upload team-logos" ON storage.objects;
CREATE POLICY "Admins can upload team-logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Admins can update team-logos" ON storage.objects;
CREATE POLICY "Admins can update team-logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos' AND public.current_user_is_admin())
WITH CHECK (
  bucket_id = 'team-logos'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- teams: still used by existing team image upload/update policies
DROP POLICY IF EXISTS "Team members or admins upload team images" ON storage.objects;
CREATE POLICY "Team members or admins upload team images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teams'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Team members or admins update team images" ON storage.objects;
CREATE POLICY "Team members or admins update team images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teams'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'teams'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);
