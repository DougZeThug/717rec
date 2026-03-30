

## Fix: Team Membership Self-Approval Privilege Escalation

### Problem
Users can self-approve their own team membership via direct API calls, then edit team details. The `team_memberships` UPDATE RLS policy allows `user_id = auth.uid()` with no column restrictions, so a user can set `is_approved = true` on their own row.

### Fix
Add a database trigger (matching the existing `prevent_admin_privilege_escalation` pattern on `profiles`) that blocks non-admin self-approval.

### Migration SQL

Creates a `validate_membership_approval` trigger function that fires before UPDATE on `team_memberships`. When `is_approved` transitions from false/null to true, it enforces:
1. `approved_by` must be set
2. `approved_by` must reference an admin in `profiles`
3. `approved_by` cannot equal the membership's `user_id` (no self-approval)

Uses `SECURITY DEFINER` with explicit `search_path` to safely query `profiles`.

### Files
- **One SQL migration** -- trigger + function only, no frontend changes needed

The client-side code already sends approval through `updateMembershipApproval` (admin-only UI), so legitimate workflows are unaffected.

