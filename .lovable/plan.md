

## Plan: Re-apply Policy Fixes (Previous Migration Was Truncated)

The last migration was supposed to contain all the policy rewrites but only the final line (`ALTER TABLE public.profiles DROP CONSTRAINT ...`) made it through. Every other fix from the approved plan still needs to be applied.

### What happened

The migration file was truncated to a single line. All policy drops/creates were lost.

### What we'll do

Re-run the exact same approved plan in a new migration. One migration covering all remaining tables:

**Group 1 -- Drop ALL, replace with INSERT/UPDATE/DELETE:**
- `participant`: drop "Admin write participant"
- `round`: drop "Admin write round"
- `stage`: drop "Admin write stage"
- `participants`: drop "Admins can manage participants"
- `playoff_games`: drop "Admins can manage playoff games"
- `power_score_snapshots`: drop "Admins can manage snapshots"
- `team_season_stats`: drop "Admins can manage team season stats"
- `matches_archive`: drop "Admins can manage archived matches"

**Group 2 -- `team_details_archive`:** Drop "Admins can manage archive" (ALL) + "Admin users can update archive" (duplicate UPDATE). Create admin INSERT/UPDATE/DELETE.

**Group 3 -- `teams`:** Drop "Admins full access to teams" (ALL).

**Group 4 -- `seasons`:** Drop "Authenticated users can read seasons".

**Group 5 -- Combine SELECT policies:**
- `hero_cards`: merge two SELECT into one with `is_visible = true OR current_user_is_admin()`
- `profiles`: merge two SELECT into one with `id = (select auth.uid()) OR current_user_is_admin()`

**Group 6 -- `team_memberships` UPDATE:** Leave as-is (intentional, different conditions).

### What changes
- **1 migration file** -- policy rewrites only, no schema or data changes
- **0 code changes**

