

## Security Fixes: 3 Findings

### 1. Team requests publicly readable (team_requests_public_read)

**Problem:** The `Anyone can view requests` SELECT policy uses `USING (true)` with `TO public`, exposing all rows (including `admin_notes`, `reason`) to unauthenticated users.

**Fix:** Replace with an authenticated-only policy scoped to the submitter and admins:

```sql
DROP POLICY "Anyone can view requests" ON public.team_requests;

CREATE POLICY "Users can view own requests, admins view all"
  ON public.team_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = submitted_by
    OR current_user_is_admin()
  );
```

**Code impact:** `fetchPendingRequestsCount` and `fetchAllRequests` are admin-only features (called from admin UI). `fetchTeamRequests` filters by `team_id` and is used by team members who are also the submitters. All callers are authenticated. No code changes needed.

---

### 2. Realtime messages no RLS (realtime_messages_no_policies)

**Problem:** No RLS on `realtime.messages`, so any authenticated user can subscribe to any channel.

**Why we should NOT fix this:** The `realtime` schema is a **Supabase-reserved schema** — the project instructions explicitly say not to modify `realtime`, `auth`, `storage`, etc. Modifying it can cause service degradation. Additionally, per the project knowledge: *"This is a prototype project with intentionally public data"* and *"used internally by trusted team members only."*

**Recommendation:** Dismiss/ignore this finding. The data flowing through realtime channels (messages, match comments, reactions) is already viewable by authenticated users via normal SELECT policies. Adding RLS to a reserved schema risks breaking realtime functionality entirely.

---

### 3. Users can self-approve membership (team_memberships_user_can_approve_self)

**Problem:** The UPDATE policies allow users to set `is_approved = true` on their own rows.

**Already fixed:** A `validate_membership_approval` trigger was deployed in migration `20260330151615` that blocks self-approval at the database level. The trigger checks that when `is_approved` changes from false to true, `approved_by` must reference an admin in `profiles` and cannot equal the membership's `user_id`.

However, the **RLS policies themselves are still overly permissive** — there are two redundant UPDATE policies. We should tighten them:

```sql
-- Remove the redundant user-only policy (covered by the combined one)
DROP POLICY "Users can update their membership" ON public.team_memberships;

-- Replace the combined policy: users can only update team_id (to switch teams)
DROP POLICY "Admins or owners can update team_memberships" ON public.team_memberships;

CREATE POLICY "Admins can update any membership field"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Users can update own membership team"
  ON public.team_memberships FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_approved = false
    AND approved_by IS NULL
    AND approved_at IS NULL
  );
```

This ensures users can only update their row if `is_approved` stays false, providing defense-in-depth alongside the trigger.

---

### Summary

| Finding | Action |
|---------|--------|
| team_requests public read | 1 migration: replace SELECT policy |
| realtime.messages no RLS | Skip — reserved schema, prototype app |
| self-approve membership | 1 migration: tighten UPDATE policies (trigger already in place) |

**One migration file, no code changes.**

