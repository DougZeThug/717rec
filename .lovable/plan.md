## Plan: Address GraphQL schema exposure findings

### Background

Supabase's lints `0026` (anon) and `0027` (authenticated) flag every table/view in the `public` schema because all of them grant `SELECT` to `anon`/`authenticated` (via the default `PUBLIC` grant). RLS still gates row access — these warnings are about **schema discoverability** through the GraphQL introspection endpoint, not data leakage.

This app (`717rec.app`) is a public rec-league site. Most tables are *intentionally* public-readable (teams, matches, divisions, brackets, seasons, etc.) and their RLS policies say `USING (true)`. For those, the warning is a false positive — they are deliberately discoverable.

A small number of tables are admin/internal-only and should be hidden from GraphQL introspection so signed-in (non-admin) users and anon visitors cannot even see them in the schema.

### Categorization

**Intentionally public — keep grants, ignore lint** (RLS is `USING (true)` for SELECT):
- Reference/league data: `divisions`, `seasons`, `teams`, `team_stats`, `team_season_stats`, `team_timeslots`, `team_badge_events`, `team_details_archive`, `team_requests`, `theme_settings`, `hero_cards`, `blind_draw_settings`
- Match/bracket data: `matches`, `games`, `match_comments`, `match_reactions`, `brackets`, `participants`, `participant`, `match`, `match_game`, `round`, `stage`, `group`, `playoff_matches`, `playoff_games`, `playoff_team_records`, `power_score_snapshots`, `ranking_snapshots`, `season_team_participation`, `team_analysis`
- All `v_*` views (standings/details aggregates)
- Authenticated-only by RLS but still legitimately readable: `messages`, `message_reactions`, `match_comments`, `matches_archive`

**Should NOT be discoverable to anon (or non-admin authenticated)** — revoke `SELECT` from `anon` and `authenticated`:
1. `admin_privilege_changes` — admin-only audit (RLS already restricts rows)
2. `security_audit_log` — admin-only audit
3. `debug_match_updates` — internal admin debugging
4. `score_submissions` — anon can INSERT, but viewing should be authenticated-only (already is via RLS); revoke `anon SELECT` only
5. `blind_draw_signups` — admin-view-only (RLS restricts rows)
6. `team_season_opt_out` — service-role only (separate finding already flags this)
7. `team_memberships` — sensitive membership data; RLS restricts rows but schema exposure is unnecessary for anon

### Changes

**1. Migration** to revoke `SELECT` from `anon` and `authenticated` on the 7 sensitive tables above. Functions/services that read these tables run either as admin (covered by RLS + `current_user_is_admin()`) or via service-role edge functions (bypass grants), so revoking PUBLIC/anon/authenticated `SELECT` is safe.

```sql
REVOKE SELECT ON TABLE
  public.admin_privilege_changes,
  public.security_audit_log,
  public.debug_match_updates,
  public.blind_draw_signups,
  public.team_season_opt_out,
  public.team_memberships
FROM anon, authenticated, PUBLIC;

REVOKE SELECT ON TABLE public.score_submissions FROM anon, PUBLIC;
-- authenticated keeps SELECT (existing RLS policy "Allow authenticated users to view score submissions")
```

**2. Verify code paths** that read these tables to confirm none rely on anon/authenticated direct queries:
- `admin_privilege_changes`, `security_audit_log` — only admin dashboard reads (passes RLS via `current_user_is_admin()`, but still needs grant — admins are `authenticated`, so we must keep `authenticated SELECT` on these)

→ **Revision**: Keep `authenticated SELECT` on `admin_privilege_changes` and `security_audit_log` (RLS already restricts to admins). Only revoke from `anon` + `PUBLIC`.

Final SQL:
```sql
REVOKE SELECT ON TABLE
  public.admin_privilege_changes,
  public.security_audit_log,
  public.debug_match_updates,
  public.blind_draw_signups,
  public.team_season_opt_out,
  public.team_memberships,
  public.score_submissions
FROM anon, PUBLIC;
```

This hides them from the **anon** GraphQL schema while preserving admin/authenticated app functionality (RLS still controls rows).

**3. Mark remaining anon/authenticated GraphQL findings as ignored** (with a clear reason that this is an intentionally public-data app), and update the security memory so future scans understand the posture.

**4. Update security memory** to document:
- App is a public-facing rec-league site with intentionally public read access on league data.
- RLS is the primary access control; GraphQL schema discoverability for public tables is acceptable.
- Sensitive tables (audit logs, debug, opt-outs, signups, memberships) have grants revoked so they don't appear in the anon GraphQL schema.

### What I will NOT do
- Will not revoke grants on the 40+ legitimately public tables/views — that would break the public site.
- Will not change any RLS policies.
- Will not touch `src/integrations/supabase/types.ts`.

### Verification after implementation
- Run `supabase--linter` again — `0026` count should drop by ~7; `0027` should drop by ~6.
- Smoke test: load homepage (anon), admin dashboard (authenticated admin), score submission form (anon insert).
