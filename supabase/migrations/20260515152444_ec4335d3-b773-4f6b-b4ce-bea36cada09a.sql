
-- Tighten team-images INSERT to require team membership for the target folder
DROP POLICY IF EXISTS "Allow authenticated users to upload team images" ON storage.objects;

CREATE POLICY "Team members or admins upload team-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
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
);

-- Add UPDATE/DELETE policies for the `teams` bucket (team members + admins)
CREATE POLICY "Team members or admins update team images"
ON storage.objects
FOR UPDATE
TO authenticated
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
);

CREATE POLICY "Team members or admins delete team images"
ON storage.objects
FOR DELETE
TO authenticated
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
);

-- Add admin-only UPDATE/DELETE policies for `team-logos` (legacy admin-managed bucket)
CREATE POLICY "Admins can update team-logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos' AND public.current_user_is_admin());

CREATE POLICY "Admins can delete team-logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-logos' AND public.current_user_is_admin());
