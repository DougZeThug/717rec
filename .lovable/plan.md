

## Plan: Add Missing Admin UPDATE Policy for Teams Table

### The problem

The `teams` table has RLS policies for admin INSERT and DELETE, but **no admin UPDATE policy**. The only UPDATE policy is "Approved members can update own team", which checks `team_memberships`. When an admin changes a team's division, the update is blocked by RLS unless the admin happens to be an approved member of that specific team.

### The fix

**1 migration** — Add an admin UPDATE policy to the `teams` table:

```sql
CREATE POLICY "Admins can update teams"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
```

This matches the existing pattern used on every other admin-managed table (divisions, matches, brackets, etc.).

### What changes

- **1 migration file** — adds the missing RLS policy
- **0 source files changed**

