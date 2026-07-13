DROP POLICY IF EXISTS "Admins can upload hero-cards" ON storage.objects;
CREATE POLICY "Admins can upload hero-cards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hero-cards'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Admins can update hero-cards" ON storage.objects;
CREATE POLICY "Admins can update hero-cards"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hero-cards' AND public.current_user_is_admin())
WITH CHECK (
  bucket_id = 'hero-cards'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Team members or admins upload team-images" ON storage.objects;
CREATE POLICY "Team members or admins upload team-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-images'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Team members and admins can update team images" ON storage.objects;
CREATE POLICY "Team members and admins can update team images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-images'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
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
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Admins can upload team-logos" ON storage.objects;
CREATE POLICY "Admins can upload team-logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Admins can update team-logos" ON storage.objects;
CREATE POLICY "Admins can update team-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'team-logos' AND public.current_user_is_admin())
WITH CHECK (
  bucket_id = 'team-logos'
  AND public.current_user_is_admin()
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "Team members or admins upload team images" ON storage.objects;
CREATE POLICY "Team members or admins upload team images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'teams'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Team members or admins update team images" ON storage.objects;
CREATE POLICY "Team members or admins update team images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'teams'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
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
      SELECT 1 FROM public.team_memberships
      WHERE team_memberships.user_id = auth.uid()
        AND team_memberships.is_approved = true
        AND (team_memberships.team_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- Remove unused admin_note column from playoff_matches. No app code
-- references it (verified via grep across src/), and the column was
-- readable through the public SELECT policy. Dropping eliminates the
-- exposure entirely.
ALTER TABLE public.playoff_matches DROP COLUMN IF EXISTS admin_note;