# PR-03 — Pin `search_path` on the last 3 SECURITY DEFINER functions

| | |
|---|---|
| **Phase** | 2 — Reliability, database, and security |
| **Tier** | 2 — High value (security hardening; low exploitability but established best practice) |
| **Priority** | High (small, finishes a hardening pass already 95% done) |
| **Recommended agent** | Codex or Claude Code |
| **Difficulty** | Low (~1 hour) |
| **Risk** | Low |
| **Expected score improvement** | +0.4 overall (Security 86→90) |
| **Parallel-safe?** | Yes (single migration, no app code) |
| **Depends on** | Nothing (PR-01 first only for green CI) |

## Background and problem statement

- The repo ran a dedicated hardening migration on 2026-07-13 (`20260713120000_harden_security_definer_search_paths.sql`) pinning `search_path` on SECURITY DEFINER functions — the correct defense against search-path hijacking for definer-rights functions.
- **Confirmed by rebuilding the database from all 324 migrations and querying `pg_proc`:** exactly three SECURITY DEFINER functions still have **no** pinned search_path: `fn_update_playoff_record`, `get_participants`, `snapshot_current_season`. All three are defined only in `supabase/migrations/00000000000000_baseline.sql` (they were reconstructed for schema parity; the baseline's own comments note they're referenced by no app code).
- **Exploitability is low** (attackers can't create objects in `public` on Supabase by default), but the repo's own standard — and Supabase's linter — says definer functions must pin `search_path`. Status: **confirmed** (catalog query evidence in `evidence/`), severity: low.
- **Preserve:** each function's existing body and behavior exactly.

## Objective

After a fresh replay of all migrations, `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND (p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))` returns **zero rows**.

## Exact scope

One new migration that, for each of the three functions, either `ALTER FUNCTION ... SET search_path = 'pg_catalog','public'` (preferred — no body duplication) or `CREATE OR REPLACE` with `SET search_path` added, mirroring the style of `20260713120000_harden_security_definer_search_paths.sql`. Wrap in existence guards (`DO $$ ... IF EXISTS (SELECT 1 FROM pg_proc ...)`) exactly like that migration does, so replay works whether or not the function exists. **Out of scope:** changing any function body; touching any other function; dropping these functions even if unused (deletion of dead DB objects is PR-06's decision).

## Likely files affected

- New file: `supabase/migrations/<timestamp>_pin_remaining_security_definer_search_paths.sql`
- Nothing in `src/`. No type regeneration needed (no signature changes).

## Implementation instructions

1. Read `20260713120000_harden_security_definer_search_paths.sql` and copy its guard + ALTER pattern.
2. Find the three functions' exact signatures in `00000000000000_baseline.sql` (`ALTER FUNCTION` needs the argument list; `get_participants` takes arguments — check).
3. Write the migration; apply to a fresh database along with everything else; run the catalog query above — expect 0 rows.

## Database requirements

- Migration: yes (idempotent, guarded). No data change, no backfill, trivially reversible (`ALTER FUNCTION ... RESET search_path`).
- Must replay cleanly on fresh DB (CI `supabase-ci.yml` does this weekly).

## UI and UX requirements

None — invisible to users.

## Testing requirements

- Add the zero-rows catalog assertion to an existing SQL smoke test (e.g., a new small `supabase/tests/security_definer_search_path.sql` following the suite's `\set ON_ERROR_STOP on` + `DO $$ ... RAISE EXCEPTION` pattern), so this property is **enforced forever**, not just fixed once.
- Playoff record trigger still works: the existing smoke suites + full replay cover it implicitly (the function is attached to playoff flows); no app-level test needed.

## Required validation commands

```bash
# Fresh-DB replay + smoke tests exactly as .github/workflows/supabase-ci.yml does
npm run test:coverage   # unchanged app — must stay green
npm run build
```

## Manual verification checklist (for Doug)

1. Nothing user-visible. After deploy, in Supabase Dashboard → Database → Advisors, the "function search_path mutable" warnings for these three functions should disappear.

## Acceptance criteria

- [ ] Catalog query returns 0 rows after full fresh replay.
- [ ] New SQL smoke test fails if a future SECURITY DEFINER function omits search_path, passes now.
- [ ] All existing smoke suites + app test suite green.

## Non-goals and guardrails

- Do not modify function bodies or grants.
- Do not delete the functions.
- Do not touch other advisor warnings in the same PR.

## Rollback

Single migration; `ALTER FUNCTION ... RESET search_path` restores prior state. No data risk.

## Deliverables from the implementing agent

Migration filename; before/after catalog query output on a fresh replay; smoke + suite results.
