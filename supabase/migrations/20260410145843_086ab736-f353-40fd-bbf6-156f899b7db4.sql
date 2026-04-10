
-- Drop permissive DELETE/UPDATE policies on team-images bucket
DROP POLICY IF EXISTS "Allow authenticated users to delete team images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update team images" ON storage.objects;

-- Create ownership-scoped DELETE policy
CREATE POLICY "Team members and admins can delete team images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE user_id = auth.uid()
        AND is_approved = true
        AND team_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Create ownership-scoped UPDATE policy
CREATE POLICY "Team members and admins can update team images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (
    public.current_user_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE user_id = auth.uid()
        AND is_approved = true
        AND team_id::text = (storage.foldername(name))[1]
    )
  )
);
