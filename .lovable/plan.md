

## Plan: Fix RLS Performance Warnings

The Supabase linter flagged two categories of performance issues across your database. Neither is a security problem -- they just make queries slightly slower than necessary.

### What's wrong

1. **`auth_rls_initplan`** (14 policies): Policies use `auth.uid()` directly instead of `(select auth.uid())`. Without the `select` wrapper, Postgres re-evaluates the function for every row instead of once per query.

2. **`multiple_permissive_policies`** (many entries): Tables like `divisions`, `games`, `group`, `match`, `match_game`, and `hero_cards` have an `ALL` or admin-only SELECT policy alongside a public SELECT policy. Since the `ALL` command implicitly includes SELECT, both fire for every query. The fix is to keep the public read policy and make the admin policy cover only INSERT/UPDATE/DELETE.

### What we'll do

**One migration** that:

1. Drops and recreates 14 RLS policies to wrap `auth.uid()` and `auth.<function>()` calls in `(select ...)`:
   - `team_analysis`: delete, insert, update policies
   - `teams`: "Team members can update own team"
   - `profiles`: view own, update own
   - `season_team_participation`: delete
   - `team_memberships`: view, create, update own
   - `ranking_snapshots`: delete
   - `team_details_archive`: update
   - `messages`: insert
   - `team_requests`: view

2. Fixes duplicate permissive SELECT on 6 tables by replacing the broad `ALL` policy with separate INSERT/UPDATE/DELETE policies (keeping the existing public SELECT):
   - `divisions`: drop "Admin full access", create admin INSERT/UPDATE/DELETE
   - `games`: same pattern
   - `group`: drop "Admin write group", create admin INSERT/UPDATE/DELETE
   - `match`: drop "Admin write match", create admin INSERT/UPDATE/DELETE
   - `match_game`: drop "Admin write match_game", create admin INSERT/UPDATE/DELETE
   - `hero_cards`: no change needed (the two SELECT policies serve different purposes -- admins see all, public sees visible only)

3. Also marks the `storage_team_images_write` security finding as fixed (from the previous migration).

### What changes

- **1 migration file** -- purely policy rewrites, no schema or data changes
- **0 code changes**

### Technical detail

Example of the initplan fix:
```sql
-- Before
USING (id = auth.uid())
-- After  
USING (id = (select auth.uid()))
```

Example of the duplicate-policy fix:
```sql
-- Drop the ALL policy that overlaps with the public SELECT
DROP POLICY "Admin full access" ON public.divisions;
-- Replace with targeted write policies
CREATE POLICY "Admin insert divisions" ON public.divisions FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin update divisions" ON public.divisions FOR UPDATE TO authenticated
  USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Admin delete divisions" ON public.divisions FOR DELETE TO authenticated
  USING (current_user_is_admin());
```

