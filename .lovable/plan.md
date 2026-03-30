

## Security Fixes: 3 Findings

### 1. Function Search Path Mutable — `award_streak_badges`

**Problem:** The only function missing `search_path` is `award_streak_badges`. It was last recreated without `SET search_path`.

**Fix:** `CREATE OR REPLACE` with `SET search_path TO 'pg_catalog', 'public'` added.

### 2. Anonymous Upload on `teams` Storage Bucket

**Problem:** The `Allow anyone to upload team images` INSERT policy uses `TO public` (includes `anon`), letting unauthenticated users upload arbitrary files.

**Fix:** Drop the policy and recreate it restricted to `authenticated` only. No code changes needed — `uploadTeamImage` already requires a logged-in user.

### 3. Self-Approve via INSERT on `team_memberships`

**Problem:** Both INSERT policies only check `user_id = auth.uid()` but don't enforce `is_approved = false`. A user could insert a row with `is_approved = true` and immediately gain team write access.

**Fix:** Replace both INSERT policies with a WITH CHECK that enforces `is_approved = false AND approved_by IS NULL AND approved_at IS NULL`.

---

### Migration (one file, all three fixes)

```sql
-- 1. Fix award_streak_badges search_path
CREATE OR REPLACE FUNCTION public.award_streak_badges(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  -- (same function body, unchanged)
$$;

-- 2. Restrict teams bucket upload to authenticated users
DROP POLICY IF EXISTS "Allow anyone to upload team images" ON storage.objects;
CREATE POLICY "Authenticated upload team images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teams');

-- 3. Tighten team_memberships INSERT policies
DROP POLICY IF EXISTS "Users can create their membership" ON public.team_memberships;
DROP POLICY IF EXISTS "Users create own membership" ON public.team_memberships;

CREATE POLICY "Users can create their membership"
  ON public.team_memberships FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );
```

**One migration file, no code changes.**

