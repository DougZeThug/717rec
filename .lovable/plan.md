## Audit results

I traced each claim in the PR against the repo. Most of the work is already landed and wired up correctly — only two small gaps remain.

### Already in place (no action needed)

1. **Admin audit triggers** — `supabase/migrations/20260701120000_admin_audit_triggers.sql`
   - `audit_admin_mutation()` SECURITY DEFINER trigger, best-effort (swallows failures), gated on `auth.uid() IS NOT NULL AND current_user_is_admin()`.
   - Attached AFTER INSERT/UPDATE/DELETE to: `seasons, divisions, teams, team_timeslots, brackets, admin_notifications, hero_cards, theme_settings, contact_requests`.
   - Drift guard `admin_audit_coverage_drift()` + smoke test `supabase/tests/admin_audit_triggers.sql`, invoked by the `supabase-ci` workflow.

2. **Reusable SECURITY_HEADERS** — `supabase/functions/_shared/securityHeaders.ts` (CSP `default-src 'none'`, XFO DENY, nosniff, no-referrer) with unit test `securityHeaders.test.ts`. Applied and spread into responses in all four edge functions: `send-support-email`, `submit-contact-request`, `submit-score-report`, `capture-power-snapshots`.

3. **CI env var** — `VITE_SUPABASE_PROJECT_ID: placeholder` is set in `.github/workflows/supabase-ci.yml` for the edge-function Deno tests.

### Gaps to close

1. **`.github/workflows/test.yml` is missing `VITE_SUPABASE_PROJECT_ID`.** The build step only passes `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If any code path reads the project id at build time it will be undefined. Add it alongside the other two (from secrets, or a placeholder — matching how `supabase-ci.yml` does it).

2. **Audit coverage does not include every "core admin-managed table."** The trigger list omits several admin-mutated tables that live in the same trust boundary:
   - `divisions` ✅ present
   - Missing: `season_team_participation`, `blind_draw_settings`, `challonge_fallback_config`, `challonge_fallback_brackets`, `team_requests` (admin resolve/deny), `admin_privilege_changes` is its own audit table so skip.

   Recommend adding at minimum `season_team_participation`, `blind_draw_settings`, `challonge_fallback_config`, and `challonge_fallback_brackets` to both the `audited_tables` array in the trigger DO-block and the matching array in `admin_audit_coverage_drift()`. This is a new forward migration (never edit the existing timestamped one).

### Proposed changes

- **New migration** `supabase/migrations/<new-ts>_admin_audit_triggers_expand.sql` that re-attaches `audit_admin_mutation` to the four additional tables (guarded by `to_regclass`) and updates `admin_audit_coverage_drift()` to include them.
- **Edit** `.github/workflows/test.yml` to add `VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}` (with the same placeholder fallback pattern used in `supabase-ci.yml` if the secret is not set).

### Verification

- After migration approval, `supabase/tests/admin_audit_triggers.sql` in the `supabase-ci` job will re-run and must report zero drift for the expanded list.
- `npm run build` in `test.yml` completes with the new env var wired.

### Out of scope

- No changes to edge-function code or the existing `SECURITY_HEADERS` module (both correct).
- No changes to the original audit-trigger migration (immutable history).
