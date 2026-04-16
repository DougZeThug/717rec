

## Plan: Add Missing Admin Write Policies for `playoff_team_records`

### The problem

The `playoff_team_records` table has **zero write policies** — no INSERT, UPDATE, or DELETE. However, `BracketStandingsService.ts` calls `.upsert()` on this table when calculating final standings after a playoff bracket completes. This means final standings silently fail to save (or throw an RLS error), exactly like the team division update you just hit.

### Other tables checked

- **team_badge_events** — also has no write policies, but badges are awarded via the `award_streak_badges` RPC function (SECURITY DEFINER), which bypasses RLS. No direct writes from app code. **No change needed.**
- **admin_privilege_changes** — no write policies, but inserts are handled by a database trigger. **No change needed.**
- **security_audit_log** — no write policies by design (audit integrity). **No change needed.**
- All other admin-managed tables already have proper INSERT/UPDATE/DELETE policies.

### The fix

**1 migration** — Add admin INSERT, UPDATE, and DELETE policies to `playoff_team_records`:

```sql
CREATE POLICY "Admins can insert playoff team records"
  ON public.playoff_team_records FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can update playoff team records"
  ON public.playoff_team_records FOR UPDATE
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete playoff team records"
  ON public.playoff_team_records FOR DELETE
  TO authenticated
  USING (current_user_is_admin());
```

### What changes

- **1 migration file** — adds 3 RLS policies to `playoff_team_records`
- **0 source files changed**

