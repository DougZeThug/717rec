# PR-04 — Close the last non-atomic result write path (Mass Score Entry delete) and purge dead drift-capable code

> **Resolution status:** Open — product-code remediation brief; not part of PR-15 docs-only scope.

**Phase:** 2 (Data integrity) · **Tier:** 1 · **Agent:** Claude Code or Codex · **Parallelizable:** yes · **Depends on:** nothing (pairs with PR-05) · **Expected score impact:** +1.0 overall (Reliability & data integrity +6)

## 1. Background

Since the 2026-07-13 review, every score-entry, match-edit, tie, approval, and schedule-delete flow was moved onto atomic database RPCs (`resubmit_match_result`, `approve_match_result`, `mark_match_as_tie`, `delete_match_with_stats_reversal`) — verified in this review by tracing all callers. **Exactly one live admin flow still bypasses them:** the delete button in Admin → Scores (Mass Score Entry). `MassScoreEntryTool.handleDeleteConfirm` (src/components/admin/MassScoreEntryTool.tsx:45-89) runs three separate network calls:

```ts
await deleteMatch(deleteMatchId);            // 1. row deleted
await reverseTeamStats(winnerId, loserId, …) // 2. counters decremented — if this fails, drift is permanent
await upsertTeamSeasonStats();               // 3. season snapshot refresh
```

If call 2 or 3 fails (network blip, session expiry), the match row is already gone — the winner keeps a win that no longer exists, and because `teams` counters are incremental there is nothing left to retry against. The reversal amounts also come from client-side state that can contain unsubmitted local edits (`useMatchScores.ts:76`), so even on success it can subtract values that were never applied. The correct atomic RPC **already exists and is already used by the Schedule page** (`deleteMatchWithStatsReversal`, MatchWriteService.ts:198, called from `useMatchDelete.ts:40`; migration `20260608142313` locks the row FOR UPDATE and does delete + reversal + snapshot in one transaction).

Additionally, three dead drift-capable code paths survive: `EditScoresSection.tsx` (unimported; same non-atomic delete), `createMatch`'s completed-result branch (MatchWriteService.ts:87-118 — inserts winner/loser with no counter update; currently unreachable because no UI opens the create form), and the test-only counter-mutation chains `updateTeamWinLossRecord` / `applyMatchResult` (TeamUpdateService.ts:12, teamStatsUtils).

## 2. Objective

No code path in the repository — live or dormant — can change match results or delete matches without the atomic RPCs.

## 3. Exact scope

One behavior change (the delete swap); the rest is deletion of dead code and its tests.

## 4. Files to modify / delete

- `src/components/admin/MassScoreEntryTool.tsx` (swap delete implementation)
- Delete: `src/components/admin/EditScoresSection.tsx`, `src/hooks/useUncompletedMatches.ts` (+ their tests)
- `src/services/matches/MatchWriteService.ts` (after the swap: remove now-unused `deleteMatch`, `reverseTeamStats` exports at :131/:163 if caller count is zero; strip result fields from `createMatch`'s insert or delete the create branch — see step 4)
- `src/hooks/matches/updates/utils/statReversalUtils.ts`, `src/services/teams/TeamUpdateService.ts:12` area, `src/utils/teamStatsUtils/updateTeamRecord.ts`, `src/services/TeamStatsService.ts:16` area (delete dead chains + tests)

## 5. Implementation steps

1. In `MassScoreEntryTool.handleDeleteConfirm`, replace the three-call sequence with `await deleteMatchWithStatsReversal(deleteMatchId);` mirroring `useMatchDelete.ts:40`; keep the toasts. **Then make the row actually disappear:** the tool's match list comes from a hand-rolled `useEffect` fetch (`useScoreEntryData`), so `invalidateAllDataQueries` alone will NOT refresh it — after a successful delete, remove the match from the local list state (or call the hook's refetch) explicitly, and add a test asserting the row is gone post-delete. (Once PR-10 migrates this hook to TanStack Query, the invalidation path takes over and the manual removal can go.) Remove the now-unused imports and the `['mass-score-entry']` dead invalidation key (nothing subscribes to it).
2. Delete `EditScoresSection.tsx` + `useUncompletedMatches.ts`, and delete `useUncompletedMatches`' standalone test. **Careful with the shared test file:** `src/components/admin/__tests__/admin-score-tools.test.tsx` covers Mass Score Entry as well — remove only its `EditScoresSection` cases and mocks, keep the Mass Score coverage intact.
3. Re-grep callers of `deleteMatch` / `reverseTeamStats`; if zero production callers remain, delete both exports and `statReversalUtils.ts`.
4. `createMatch`: strip `iscompleted/winner_id/loser_id/team1_score/team2_score` from `MatchInsertInput` (mirror the `MatchNonResultUpdate` type-guard pattern at MatchWriteService.ts:25-30) — **and migrate the live callers in the same commit, or this step fails typecheck**: `useMatchCreation.ts:31-56` currently forwards all five fields, fed by `MatchFormRHF`'s completed-toggle/score fields via `Schedule.tsx:189`. Update `useMatchCreation` to drop the result fields (and `MatchFormRHF` to hide the completed/score inputs in create mode), or alternatively delete the create branch entirely (createMatch, useMatchCreation, the create arm of Schedule.tsx:189) since no UI currently opens the form in create mode. If a future "create completed match" flow is wanted, it must insert-then-call `resubmit_match_result`.
5. Delete `updateTeamWinLossRecord` / `applyMatchResult` chains + tests.
6. Run knip — it should stay clean (this PR removes exactly the kind of code knip can't see because tests import it).

## 6. Database requirements

None — the RPC already exists and is migration-tested.

## 7. UI/UX requirements

Delete behavior in Mass Score Entry is unchanged from the admin's perspective (same dialog, same toasts).

## 8. Testing requirements

- New unit test: MassScoreEntryTool delete calls `deleteMatchWithStatsReversal` exactly once, no calls to legacy functions; failure shows the destructive toast and does not invalidate caches prematurely.
- Existing `useMatchDelete` tests remain the reference behavior.

## 9. Validation commands

```bash
npm run test:file -- src/components/admin/__tests__/MassScoreEntryTool.test.tsx
npm run typecheck && npm run lint && npm run test:coverage && npm run knip && npm run build
```

## 10. Manual verification checklist (Doug)

- [ ] Admin → Scores: delete an uncompleted test match — row disappears, standings unchanged.
- [ ] Delete a completed test match — winner's W and loser's L both decrease by exactly 1 (check the team pages).
- [ ] Run the PR-05 drift check afterwards: 0 rows.

## 11. Acceptance criteria

- `grep -rn "reverseTeamStats\|deleteMatch(" src --include='*.ts*' | grep -v test | grep -v WithStatsReversal` returns nothing.
- All gates green; knip clean.

## 12. Non-goals / rollback

- Non-goals: the drift detector (PR-05), mass-entry error-display fixes (PR-08), batch serialization (PR-08).
- Rollback: revert the commit. The old path returns but nothing else depends on this change.
