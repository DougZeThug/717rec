

## Plan: Fix Remaining Multiple Permissive Policies + Duplicate Index

These are all WARN-level performance issues, not security problems. The pattern is the same as the previous round: broad `ALL` policies overlap with specific `SELECT` policies, causing Postgres to evaluate both for every query.

### Affected tables and fixes

**Group 1 -- Drop ALL policy, replace with targeted INSERT/UPDATE/DELETE** (same pattern as before):
- `participant`: drop "Admin write participant", create admin INSERT/UPDATE/DELETE
- `round`: drop "Admin write round", create admin INSERT/UPDATE/DELETE
- `stage`: drop "Admin write stage", create admin INSERT/UPDATE/DELETE
- `participants`: drop "Admins can manage participants", create admin INSERT/UPDATE/DELETE
- `playoff_games`: drop "Admins can manage playoff games", create admin INSERT/UPDATE/DELETE
- `power_score_snapshots`: drop "Admins can manage snapshots", create admin INSERT/UPDATE/DELETE
- `team_season_stats`: drop "Admins can manage team season stats", create admin INSERT/UPDATE/DELETE
- `matches_archive`: drop "Admins can manage archived matches", create admin INSERT/UPDATE/DELETE

**Group 2 -- `team_details_archive`**: Drop "Admins can manage archive" (ALL) and "Admin users can update archive" (duplicate UPDATE). Create admin INSERT/DELETE. Keep "read archive" SELECT.

**Group 3 -- `teams`**: Drop "Admins full access to teams" (ALL). The specific policies ("Admins can create teams", "Admins can delete teams", "Team members can update own team", etc.) already cover all operations.

**Group 4 -- `seasons`**: Drop "Authenticated users can read seasons" since "Anyone can view seasons" (public role) already covers authenticated users.

**Group 5 -- Combine overlapping SELECT policies**:
- `hero_cards`: Drop both SELECT policies, create one: `USING (is_visible = true OR current_user_is_admin())`
- `profiles`: Drop both SELECT policies, create one: `USING (id = (select auth.uid()) OR current_user_is_admin())`

**Group 6 -- Intentional, leave as-is**:
- `team_memberships` UPDATE: admin and user UPDATE policies have different conditions (admin = any row, user = own pending only). Both are needed for security. Performance cost is negligible.

**Group 7 -- Duplicate index on `profiles`**:
- Drop `profiles_username_key` (keep `profiles_username_unique`)

### What changes

- **1 migration file** -- purely policy rewrites + drop one index, no schema or data changes
- **0 code changes**

### Technical detail

```sql
-- Example: hero_cards combined SELECT
DROP POLICY "Admins can view all hero cards" ON public.hero_cards;
DROP POLICY "Public can view visible hero cards" ON public.hero_cards;
CREATE POLICY "Read hero cards" ON public.hero_cards FOR SELECT
  USING (is_visible = true OR current_user_is_admin());

-- Example: teams - just drop the redundant ALL
DROP POLICY "Admins full access to teams" ON public.teams;

-- Example: duplicate index
DROP INDEX IF EXISTS public.profiles_username_key;
```

