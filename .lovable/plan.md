## Goal
Eliminate the 3 Supabase linter `multiple_permissive_policies` warnings by consolidating overlapping RLS policies into single combined policies per (role, action). Behavior stays identical — only performance and policy hygiene improve.

## Findings to resolve
1. `public.contact_requests` — SELECT/authenticated: `Admins can view contact requests` + `Users can view their own contact requests`
2. `public.matches_archive` — SELECT/authenticated: `Authenticated read archived matches` + `Public read archived matches`
3. `public.teams` — UPDATE/authenticated: `Admins can update teams` + `Approved members can update own team`

## Migration plan (single SQL migration)

For each table: inspect existing policy definitions, drop the two overlapping policies, recreate a single consolidated policy whose `USING` (and `WITH CHECK` where applicable) is the `OR` of the originals. Keep auth calls wrapped in `(SELECT auth.<fn>())` per the project's RLS performance standard.

### 1. contact_requests (SELECT)
```sql
DROP POLICY "Admins can view contact requests" ON public.contact_requests;
DROP POLICY "Users can view their own contact requests" ON public.contact_requests;

CREATE POLICY "View contact requests (admin or owner)"
ON public.contact_requests
FOR SELECT TO authenticated
USING (
  public.current_user_is_admin()
  OR user_id = (SELECT auth.uid())
);
```

### 2. matches_archive (SELECT)
The `Public read archived matches` policy already covers `public` role (anon + authenticated). The authenticated-only duplicate is redundant — drop it and keep only the public one.
```sql
DROP POLICY "Authenticated read archived matches" ON public.matches_archive;
-- Keep "Public read archived matches" as the sole SELECT policy.
```

### 3. teams (UPDATE)
```sql
DROP POLICY "Admins can update teams" ON public.teams;
DROP POLICY "Approved members can update own team" ON public.teams;

CREATE POLICY "Update teams (admin or approved member)"
ON public.teams
FOR UPDATE TO authenticated
USING (
  public.current_user_is_admin()
  OR <approved-member predicate from original>
)
WITH CHECK (
  public.current_user_is_admin()
  OR <approved-member predicate from original>
);
```

Before writing the migration I'll read the exact `USING`/`WITH CHECK` expressions of each existing policy via `supabase--read_query` against `pg_policies` so the consolidated predicates are a faithful OR of the originals (no behavior change).

## Verification
1. Re-run `supabase--linter` — the 3 warnings should be gone, no new ones introduced.
2. Spot-check via `pg_policies` that each table now has exactly one permissive policy per (role, action) involved.
3. Sanity check app paths that touch these tables (admin contact view, owner contact view, archived matches read, admin team edit, captain team edit) — no code changes required since predicates are equivalent.

## Out of scope
No code/UI changes. No changes to other tables or other (role, action) combinations.