# RLS notes

Plain-English notes on intentional Row-Level Security decisions that future
contributors should not silently undo. Pair this with the per-table policies
visible in the Supabase dashboard.

## `public.seasons`

Seasons metadata (name, dates, active flag, champion ids, archive flag) is
public information. The marketing site, standings pages, and history views
all read it without an auth session.

### Canonical policies

| Policy                    | Cmd    | Role            | Rule                      |
| ------------------------- | ------ | --------------- | ------------------------- |
| Anyone can view seasons   | SELECT | `public`        | `true`                    |
| Admins can insert seasons | INSERT | `authenticated` | `current_user_is_admin()` |
| Admins can update seasons | UPDATE | `authenticated` | `current_user_is_admin()` |
| Admins can delete seasons | DELETE | `authenticated` | `current_user_is_admin()` |

### Drift-prevention rule

Any migration touching `public.seasons` policies MUST keep
`Anyone can view seasons` for role `public`, or replace it with an
equivalent `TO anon, authenticated` SELECT policy. **Do not narrow
public read without product review** — it will break logged-out league
pages.

### Verifying

After any migration that touches seasons policies, run:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/seasons_rls.sql
```

Or query the helper directly:

```sql
SELECT * FROM public.seasons_rls_drift();
-- 0 rows = healthy
```

### History

The seasons read policy has been dropped or rewritten multiple times in the
past (`20260202182410`, `20260410153406`). The
`<ts>_seasons_rls_canonical.sql` migration pins the intended state and adds
the drift detector so the next accidental narrowing is caught fast.

## `public.team_season_stats`

Season stats are public. Stats, History, Insights, team pages and the public
MCP tools read them without an auth session.

- Keep `Anyone can view team season stats` (SELECT, `public`, `true`).
- Writes stay admin-only (`current_user_is_admin()`).
- **Do not remove public read** — the pages go empty with no error.
- Verify: `psql "$SUPABASE_DB_URL" -f supabase/tests/team_season_stats_rls.sql`

## `public.power_score_division_override`

- Signed-out and signed-in visitors can read the team, season, and division
  keys for overrides that point to a rateable division. Public scoring uses
  these keys through `v_power_score_team_matches_rated`.
- Reasons and entry times are internal. Do not restore table-wide public read.
- Writes remain limited to the service role and database owner.
- Verify on a throwaway database: `psql "$SUPABASE_DB_URL" -f supabase/tests/power_score_division_override.sql`.

## Accepted linter warnings (2026-10-03)

The Supabase linter reports ~217 warnings that are intentional. Do not "fix"
them without reading this section.

### GraphQL exposure (161 warnings)

Lints 0026/0027 flag every table and view visible in the GraphQL schema to
`anon` / `authenticated`. This app does not use pg_graphql at all — all data
access goes through PostgREST, and the flagged objects are public league data
(standings, teams, stats, schedules) that the public pages serve by design.
Accepted: the exposure matches the intended public read access.

### SECURITY DEFINER functions executable by anon (9)

These are public on purpose — public pages or RLS policies call them:

- Public page data: `get_batch_head_to_head`, `get_opponent_match_history`,
  `get_blind_draw_signup_count`, `get_season_team_power_scores`,
  `get_season_week_number`
- RLS policy helpers (revoking breaks the policies): `current_user_is_admin`,
  `is_team_opted_out_active`, `user_can_score_match`, `user_is_team_member`

Note (2026-11-23): `get_team_badges`, `get_all_team_badges`, `get_season_badges` and
`get_participants` were not called by the app (no caller in `src` or
`supabase/functions`). Migration `20261123120000_drop_dead_db_objects.sql` dropped
them. Doug applied it on live on 2026-11-23 (`docs/OPERATIONS.md` section 6i). The
count above was 13 before and is 9 now. **The names above match the live security
advisor of 2026-11-23, which lists exactly these 9.**

### SECURITY DEFINER functions executable by authenticated (36)

Per the live security advisor of 2026-11-23, exactly 36. It is the 9 above, plus these
27, which the client calls as a signed-in admin or scorer (match approval, live
scoring, season lifecycle, seeding, admin power tools):

- Match results and deletes: `approve_match_result`, `resubmit_match_result`,
  `mark_match_as_tie`, `delete_match_with_stats_reversal`
- Live scoring: `start_game_with_roster`, `finalize_live_match`, `reopen_live_match`
- Season lifecycle: `activate_season_with_partial_archive`, `archive_season`,
  `partial_archive_season`, `finalize_playoffs`, `finalize_bracket_standings`,
  `replace_playoff_games`
- Seeding: `batch_update_team_seeds`, `reset_division_seeds`, `validate_division_seeds`
- Admin power tools: `admin_get_pre_unification_season_stats`,
  `admin_get_pre_unification_team_power`, `admin_power_unification_status`,
  `admin_reapply_power_score_unification`, `admin_recompute_season_power`,
  `admin_revert_power_score_unification`, `admin_revert_power_score_weights`,
  `admin_set_power_score_weights`
- Other helpers: `reconcile_team_counters`, `is_username_taken`, `user_belongs_to_team`

Admins are authenticated users, so these must keep the authenticated grant; each
function checks admin/scorer rights internally.

Everything else was revoked in the 2026-10-03 lockdown migration: badge
awarding, stat recalculation and trigger helpers are no longer callable by anon or
authenticated. (The 2026-11-23 advisor list above is the current truth. It still shows
`finalize_playoffs` and `finalize_bracket_standings` as callable by signed-in users.)

### Backup tables

9 power-score backup tables were dropped on 2026-10-03. The two
`team_*_pre_unification` tables remain because the admin power-migration
review/revert tool (`PowerMigrationService`) still reads them; they keep RLS
enabled with no policies (deny all) until that tool is removed.
