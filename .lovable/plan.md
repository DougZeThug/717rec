

## Security Fixes: Team Memberships & Storage Policies

### Finding 1: `user_is_team_member` missing approval check — **REAL, LOW RISK**

The function returns `true` for any membership row regardless of `is_approved`. This means a pending (unapproved) member can see other memberships on that team.

**Fix**: Update the function to add `AND is_approved = true`.

```sql
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
```

### Finding 2: Users can hijack approval by changing `team_id` — **REAL, MEDIUM RISK**

The `USING` clause on "Users can update own membership team" only checks `user_id = auth.uid()` — it doesn't require the row to currently be unapproved. So a user with an **approved** membership can update their `team_id` to a different team. The `WITH CHECK` forces `is_approved = false` on the resulting row, but the damage is done: they changed teams and can request re-approval on the new team while the system treats it as a team-switch rather than a new request.

More critically: between the UPDATE and admin review, the user briefly had an approved membership that they switched to a different team — the `validate_membership_approval` trigger only fires on approval changes, not team changes.

**Fix**: Add `AND is_approved = false` to the `USING` clause so users can only modify **pending** membership rows:

```sql
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
```

### Finding 3: Storage policies too permissive — **REAL, LOW RISK (trusted users)**

The `teams` bucket INSERT policy (`Authenticated upload team images`) only checks `bucket_id = 'teams'` with no ownership check. Any authenticated user can upload/overwrite files for any team. The `team-images` bucket (if it exists) has the same issue.

Given the app is "used internally by trusted team members only," this is lower risk. However, the fix is straightforward.

**Fix**: Restrict uploads to team members or admins using a folder-per-team pattern (already in use — files are stored as `teams/{team_id}/...`):

```sql
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
```

### Summary

One migration with three changes:
1. Update `user_is_team_member` function to require `is_approved = true`
2. Tighten `USING` clause on user self-update policy to only allow modifying pending rows
3. Restrict `teams` bucket upload policy to team members/admins

