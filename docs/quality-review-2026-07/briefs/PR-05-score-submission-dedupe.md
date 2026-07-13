# PR-05 — De-duplicate public score reports (edge function + DB guard)

| | |
|---|---|
| **Phase** | 2 — Reliability, database, and security |
| **Tier** | 3 — Polish (admin-inbox noise, not a data-integrity risk) |
| **Priority** | Low-medium |
| **Recommended agent** | Codex or Claude Code |
| **Difficulty** | Low-medium |
| **Risk** | Low |
| **Expected score improvement** | +0.4 overall (Reliability +2, UX +1) |
| **Parallel-safe?** | Yes |
| **Depends on** | Nothing |

## Background and problem statement

- Public visitors submit free-text score reports via the `submit-score-report` edge function into `score_submissions`; admins review them in the dashboard. The table is an **inbox**, not authoritative score data — approving a submission does not itself change scores.
- **Demonstrated on a fresh database:** two byte-identical pending rows (same match, name, message) insert successfully — there is no unique constraint and no dedupe check in `supabase/functions/submit-score-report/index.ts` (`evidence/scoring-verification.log` B6). A user double-tapping submit, or a spammer inside the rate limit (5 per 10 min per IP), fills the admin inbox with duplicates.
- Status: **confirmed** (empirical). Severity: low — worst case is admin annoyance and a mis-clicked review.
- Preserve: the edge function's existing protections (CORS allow-list, IP rate limit, honeypot, zod `.strict()`, length caps, optional auth attach) and the admin review flow (`useScoreSubmissions` → approve/reject).

## Objective

An identical pending score report for the same match cannot be created twice; the submitter gets a friendly "already received" response instead of a duplicate row.

## Exact scope

1. **Edge function** `supabase/functions/submit-score-report/index.ts`: before insert, query for an existing row with the same `match_id` + same normalized `message` (trimmed) + `status = 'pending'`. If found, return 200 with `{ok: true, duplicate: true}` (treat as success — don't give bots an oracle, don't error at users).
2. **DB backstop** migration: a partial unique index so racing requests can't both land:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS score_submissions_pending_dedupe
   ON public.score_submissions (match_id, md5(message))
   WHERE status = 'pending';
   ```
   Edge function treats a `23505` on insert the same as the pre-check hit.
   **Pre-flight:** the migration must first collapse existing pending duplicates (keep oldest per group) or the index creation fails on real data — write that DELETE guarded and logged, and state row counts in the PR.
3. **Out of scope:** the admin review UI; contact-request dedupe (different function; only if trivially identical, note it — don't do it here).

## Likely files affected

- `supabase/functions/submit-score-report/index.ts` (+ its test dir under `supabase/tests/submit-score-report/`)
- New migration `supabase/migrations/<timestamp>_score_submissions_pending_dedupe.sql`
- `src/` untouched (client already treats `{ok:true}` as success — verify `createScoreSubmission` in `MatchWriteService.ts` handles the new field benignly; it checks only for `error`).

## Implementation instructions

1. Read the edge function fully (including `_shared/rateLimit.ts` usage) and its existing Deno tests to copy the test style.
2. Implement pre-check + 23505 handling; keep zod/honeypot/rate-limit order unchanged (cheapest checks first: honeypot → rate limit → zod → dedupe → insert).
3. Write the migration with the duplicate-collapse step, idempotent (`IF NOT EXISTS`).
4. Fresh-DB replay must pass (the collapse DELETE runs harmlessly on empty tables).

## Database requirements

- Migration: yes (index + one-time cleanup). **Destructive step** (deleting duplicate pending rows) — justify: rows are byte-identical duplicates; keep-oldest preserves the original submission and its timestamp. Reversible: dropping the index restores prior behavior; deleted duplicates are not recoverable, hence keep-oldest and logged counts.
- Existing-data test: insert seeded duplicates on the fresh DB before applying, confirm collapse keeps exactly one per group.
- No type regeneration (no schema shape change).

## UI and UX requirements

- Submitter journey (public modal on the home/schedule pages): a duplicate submit shows the **same success confirmation** as a first submit, all viewports. No new error state.
- Admin inbox: unchanged.

## Testing requirements

- **Deno test** (`supabase/tests/submit-score-report/`): duplicate POST → `{ok, duplicate:true}`, table has 1 row; distinct message → 2 rows; race simulated by direct insert then POST (hits 23505 path).
- **SQL smoke**: index exists after replay; inserting 2 identical pending rows raises; approving one then inserting the same message again succeeds (status changed, partial index no longer blocks).

## Required validation commands

```bash
# Fresh-DB replay + smoke suites (as supabase-ci.yml)
deno test supabase/tests/submit-score-report/ 2>/dev/null || echo "deno tests run in CI"
npm run test:coverage && npm run build
```

## Manual verification checklist (for Doug)

1. On the live site (logged out), submit a score report for a match. **Expect:** success message.
2. Submit the exact same text again immediately. **Expect:** the same success message; in Admin → score submissions, **only one** entry appears.

## Acceptance criteria

- [ ] Two identical pending submissions for one match cannot coexist (proven by SQL smoke test).
- [ ] Duplicate submit returns success-shaped response (no user-visible error).
- [ ] Existing edge-function tests + suite + replay green.

## Non-goals and guardrails

- Do not tighten the rate limit or change CORS in this PR.
- Do not add a captcha.
- Keep responses non-enumerating (no "this match already has a report" details).

## Rollback

Drop the index (one-line down migration) + revert the function; keep-oldest cleanup documented with counts.

## Deliverables from the implementing agent

Function diff summary; migration; duplicate-collapse row counts on the live DB (from deploy logs); test outputs.
