# PR-08 — Mass Score Entry reliability: resurrect error reporting, fix the submit filter, serialize the batch

**Phase:** 3 (Admin reliability) · **Tier:** 2 · **Agent:** Claude Code or Codex · **Parallelizable:** yes (after PR-04 merges to avoid conflicts in the same file) · **Depends on:** PR-04 · **Expected score impact:** +0.8 overall (Reliability +3, UX +3)

## 1. Background

The batch submit core is **sound** (verified): each edited match goes through the atomic, idempotent `resubmit_match_result` RPC with per-item error capture, so a mid-batch failure can't corrupt data or abort the rest. But the layer that tells the admin what happened is broken:

1. **The entire error-display subsystem is dead.** `useErrorHandling.ts:21-24` collects `failedMatches`/`errorMessages`, but no failure reason is ever rendered — the `ErrorAlert` banner never mounts and the per-row "dismiss error" button is a no-op. A league admin whose batch half-fails sees only a generic toast and has no idea *which* matches to re-submit.
2. **The submit button lies.** `MassScoreEntryTool.tsx:92`: the button counts all *edited* matches, but the submit filter only sends *edited-and-completed* ones — edited-but-incomplete rows are silently never submitted, and un-completing a match can never be persisted.
3. **Concurrent batch can deadlock itself.** `useScoreEntryData.ts:117-134` fires every RPC via `Promise.all` while each RPC's transaction rewrites `team_season_stats`; on large batches this serializes on row locks and can produce deadlock-driven spurious failures.
4. Minor: N+1 toasts + full cache-invalidation storms per item; the final partial-failure toast is success-styled.

## 2. Objective

After any batch, the admin sees exactly which matches saved and which failed (with reasons and a retry affordance); the button count matches what will actually submit; large batches don't self-inflict deadlocks.

## 3. Exact scope

Mass-score-entry component tree + its hooks. No DB changes.

## 4. Files to modify

- `src/components/admin/MassScoreEntryTool.tsx`
- `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts`
- `src/components/admin/mass-score-entry/hooks/error/useErrorHandling.ts`
- `src/components/admin/mass-score-entry/` (ErrorAlert wiring, row error badges)
- `src/hooks/matches/useMatchSubmission.ts` (toast consolidation)
- Tests for each.

## 5. Implementation steps

1. Wire `ErrorAlert` into the tool's render: after a batch, show a summary banner ("7 saved, 2 failed") listing failed matchups with their error messages and a "Retry failed" button (re-submits only the failures). Make the per-row dismiss button actually remove the row's error state.
2. Fix the count: compute the button label from the same predicate the submit loop uses (`edited && completed`). For edited-but-incomplete rows, show an inline hint ("marked incomplete — won't submit") and decide the un-complete story: either support it via the existing `reopen_live_match`/reopen RPC, or disable un-completing in this tool with a pointer to Live Corrections. (Recommend the latter for scope control; note it in the UI.)
3. Replace `Promise.all` with bounded concurrency of 1–2 (simple for-loop with await, or a tiny p-limit helper) — the RPCs serialize on `team_season_stats` anyway, so client-side serialization removes deadlock risk at near-zero wall-clock cost. Keep per-item error capture.
4. Consolidate toasts: one summary toast per batch (destructive-styled if any failure); invalidate caches once after the batch, not per item.
5. Component tests: batch of 3 with the 2nd mocked to fail → banner shows 2/1, retry re-submits only #2; count label matches filter; single cache invalidation.

## 6. Database requirements

None.

## 7. UI/UX requirements

- Plain-language errors ("Couldn't save Cuzzo's Clinic vs Birds of Prey — try again"), not raw RPC text, with the raw message collapsible.
- Banner must be dismissible and must not block further edits.

## 8. Testing requirements

Component tests above; keep the existing e2e `admin-mass-score.spec.ts` green (it covers the happy path and invalid-input block).

## 9. Validation commands

```bash
npm run test:file -- src/components/admin/mass-score-entry
npm run e2e   # admin-mass-score spec
npm run typecheck && npm run lint && npm run test:coverage && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] Enter scores for several matches, disconnect Wi-Fi mid-submit → banner tells you which failed; reconnect; "Retry failed" completes them.
- [ ] Button count equals the number of rows that actually submit.

## 11. Acceptance criteria

- A partial failure is visibly attributable to specific matches with retry; no silent drops.
- One toast + one invalidation per batch.

## 12. Non-goals / rollback

- Non-goals: the delete path (PR-04), redesigning the tool's layout.
- Rollback: revert; core submit semantics are untouched.
