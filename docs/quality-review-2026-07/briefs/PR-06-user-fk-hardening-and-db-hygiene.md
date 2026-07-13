# PR-06 — Add missing user foreign keys and drop the dead debug table

| | |
|---|---|
| **Phase** | 2 — Reliability, database, and security |
| **Tier** | 3 — Polish (integrity hardening; no observed corruption) |
| **Priority** | Low-medium |
| **Recommended agent** | Claude Code (FK/deletion semantics need judgment) |
| **Difficulty** | Medium |
| **Risk** | Medium (touches live schema; mitigations below) |
| **Expected score improvement** | +0.5 overall (Database 90→95, Reliability +1) |
| **Parallel-safe?** | Yes (schema-only; no app code) |
| **Depends on** | Nothing |

## Background and problem statement

- **Verified against the database rebuilt from all 324 migrations:** these `public` columns reference users by convention but have **no foreign key** to `auth.users`: `messages.user_id`, `match_comments.user_id`, `match_reactions.user_id`, `message_reactions.user_id`, `team_memberships.user_id`, `contact_requests.user_id` (plus `security_audit_log.user_id` and `debug_match_updates.user_id`, which are intentionally unlinked audit/debug rows — leave them).
- Meanwhile sibling columns DO have FKs (`match_rounds.entered_by_user_id`, `score_submissions.user_id/reviewed_by`, `team_analysis.created_by`…), so this is drift, not policy.
- Consequence: deleting a user in Supabase leaves orphaned memberships/messages/reactions; a bad insert can reference a non-existent user. Status: **confirmed schema fact**; no orphan rows were observed (no production data access).
- Separately, `debug_match_updates` is a leftover debug table: RLS is enabled with no permissive policies (so it is safe but dead weight). Grep `src/` and `supabase/functions/` for references before dropping.

## Objective

Every user-reference column in content tables has a real FK with deliberate delete behavior, and the dead debug table is gone.

## Exact scope

1. One migration adding FKs — with per-table delete semantics (decide from product logic, proposal):
   - `team_memberships.user_id` → `ON DELETE CASCADE` (membership is meaningless without the user)
   - `messages.user_id`, `match_comments.user_id` → `ON DELETE CASCADE` (or `SET NULL` + "deleted user" rendering if the app supports it — inspect how `messages` renders author; pick the one that can't break rendering, and say which you chose and why)
   - `match_reactions.user_id`, `message_reactions.user_id` → `ON DELETE CASCADE`
   - `contact_requests.user_id` → `ON DELETE SET NULL` (keep the inquiry, detach the account)
2. **Orphan pre-clean** in the same migration, before each `ADD CONSTRAINT`: delete (or null out, matching the chosen semantics) rows whose `user_id` no longer exists in `auth.users`, with `RAISE NOTICE` row counts. `ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` is acceptable if you prefer zero-downtime staging, but plain add is fine at this data size.
3. Drop `public.debug_match_updates` (after zero-reference grep; if any reference exists, report and leave it).
4. **Out of scope:** `security_audit_log` (must survive user deletion), FK-supporting indexes beyond what Postgres requires (add an index per new FK column only if missing — check `20260410154023` which added FK indexes broadly), and any app-code changes.

## Likely files affected

- New migration `supabase/migrations/<timestamp>_user_fk_hardening.sql`
- `src/integrations/supabase/types.ts` — **regenerate** (relationships appear in generated types)
- Nothing else in `src/` expected; typecheck will prove it.

## Implementation instructions

1. Inspect current constraints on each table (`\d` on a replayed DB) and the message/comment author rendering path (does the UI join `profiles` or store `sender_name` inline?) before choosing CASCADE vs SET NULL — never leave a UI that renders `user_id` pointing at nothing.
2. Write the migration: per table → orphan cleanup → `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES auth.users(id) ON DELETE ...`, all idempotent (`DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...)`).
3. Fresh-replay test, then seeded test: insert a user + rows in every affected table, delete the user, assert the chosen semantics.
4. Note: on a fresh CI database `auth.users` is the bootstrap stub — FKs to it work there because `supabase/tests/_bootstrap.sql` creates it; confirm the migration replays in that environment (this is exactly what `supabase-ci.yml` will run).

## Database requirements

- Migration: yes; **contains a destructive orphan cleanup** — justified (rows are already unreachable garbage) and logged with counts. Nondestructive alternative (SET NULL semantics everywhere) may be chosen if rendering requires it.
- Rollback: `DROP CONSTRAINT` per FK (write these in the PR description); cleanup rows are not recoverable — hence the logged counts and the requirement to run against a fresh backup snapshot first (Doug action below).
- Types must be regenerated.

## UI and UX requirements

None visible if semantics chosen correctly; message board and match comments must render exactly as before (verify manually).

## Testing requirements

- SQL smoke test (new file in `supabase/tests/`): user deletion cascades/nulls per the chosen matrix; insert with bogus `user_id` now fails with FK violation.
- Full app suite green (no code change expected; failures indicate a rendering path assumed orphans — report it).

## Required validation commands

```bash
# Fresh-DB replay + all smoke suites (supabase-ci.yml recipe)
npm run typecheck && npm run test:coverage && npm run build
```

## Manual verification checklist (for Doug)

1. **Before merging:** take/confirm a Supabase backup (Dashboard → Database → Backups).
2. After deploy: message board loads; match comments load; your own team membership intact.
3. Supabase Dashboard → Table editor: `debug_match_updates` no longer exists.

## Acceptance criteria

- [ ] Catalog query for user-reference columns without FKs returns only `security_audit_log.user_id` (and nothing else).
- [ ] Seeded user-deletion test passes with the documented semantics.
- [ ] Fresh replay green; app suite green; types regenerated with no manual edits.

## Non-goals and guardrails

- Do not add FKs to audit tables.
- Do not change RLS policies.
- Do not alter message/comment rendering logic in this PR — if semantics force UI work, stop and split.

## Rollback

Per-FK `DROP CONSTRAINT` statements included in the PR body; table drop reversible only via backup (hence checklist item 1).

## Deliverables from the implementing agent

Chosen delete-semantics matrix with reasoning; orphan-cleanup counts from live deploy; migration + smoke test; catalog query before/after; suite results.
