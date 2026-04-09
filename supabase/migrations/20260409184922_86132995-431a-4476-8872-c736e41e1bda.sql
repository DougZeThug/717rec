
-- 1. Tighten user_is_team_member to require approval
CREATE OR REPLACE FUNCTION public.user_is_team_member(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = p_user_id
      AND team_id = p_team_id
      AND is_approved = true
  );
$$;

-- 2. Tighten user self-update policy to only allow modifying pending rows
DROP POLICY "Users can update own membership team" ON public.team_memberships;

CREATE POLICY "Users can update own membership team"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_approved = false)
  WITH CHECK (
    user_id = auth.uid()
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );

-- 3. Restrict teams bucket upload policy to team members or admins
DROP POLICY IF EXISTS "Authenticated upload team images" ON storage.objects;

CREATE POLICY "Team members or admins upload team images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teams'
    AND (
      current_user_is_admin()
      OR EXISTS (
        SELECT 1 FROM public.team_memberships
        WHERE user_id = auth.uid()
          AND is_approved = true
          AND team_id::text = (storage.foldername(name))[1]
      )
    )
  );
