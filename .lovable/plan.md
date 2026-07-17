
# PR-04 — Atomic Mass Score delete + purge dead drift paths

## Goal
Every match delete/result-write in the repo — live or dormant — must go through the atomic RPCs. Only one live caller remains (Mass Score Entry delete); the rest is dead code deletion.

## Plain-English summary
Admin → Scores has a delete button that today does three separate database calls. If the middle one fails, standings drift permanently. The Schedule page already uses a single-transaction RPC that does the same thing safely. We'll switch Mass Score Entry to use that same RPC, then delete a pile of unused files/functions that could reintroduce the old unsafe pattern.

## Changes

### 1. Mass Score Entry delete → atomic RPC
`src/components/admin/MassScoreEntryTool.tsx` `handleDeleteConfirm`:
- Replace the `deleteMatch` → `reverseTeamStats` → `upsertTeamSeasonStats` sequence with a single `await deleteMatchWithStatsReversal(deleteMatchId)`.
- After success, remove the row from local state explicitly (via a `removeMatch(id)` helper added to `useScoreEntryData`, or by calling an exposed `refetch`) — the hook is a hand-rolled `useEffect` fetch, so `invalidateAllDataQueries` won't refresh it.
- Drop unused imports (`deleteMatch`, `reverseTeamStats`, `upsertTeamSeasonStats`) and the dead `['mass-score-entry']` invalidation key.
- Keep the existing toasts and dialog UX exactly the same.

### 2. Delete unused admin surface
- `src/components/admin/EditScoresSection.tsx` — no importers.
- `src/hooks/useUncompletedMatches.ts` + `src/hooks/__tests__/useUncompletedMatches.test.ts`.
- In `src/components/admin/__tests__/admin-score-tools.test.tsx`, remove only the `EditScoresSection` cases and its mocks; keep any Mass Score coverage intact.

### 3. Purge dead drift-capable chains
After the swap, re-grep and remove (only if no non-test callers remain):
- `deleteMatch` and `reverseTeamStats` exports in `src/services/matches/MatchWriteService.ts`.
- `src/hooks/matches/updates/utils/statReversalUtils.ts` (+ its test).
- `applyMatchResult` in `src/services/TeamStatsService.ts` and `src/hooks/team-stats/utils/teamRecordUtils.ts` (+ `teamStats.test.ts`).
- `updateTeamWinLossRecord` in `src/services/teams/TeamUpdateService.ts` and `src/utils/teamStatsUtils/updateTeamRecord.ts` (+ its test).

Grep confirmation up-front: `updateTeamWinLossRecord` and `applyMatchResult` only appear in tests + their own re-export shims. `reverseTeamStats`/`deleteMatch` are only used by the two files being changed in steps 1–2 (plus their tests).

### 4. `createMatch` completed-result branch
`src/services/matches/MatchWriteService.ts` `createMatch` currently inserts `iscompleted/winner_id/loser_id/team1_score/team2_score` with no counter update — unreachable but drift-capable.
- Strip those five fields from `MatchInsertInput` and from the insert payload (mirror the `MatchNonResultUpdate` type-guard pattern at ~:25-30).
- Update the live caller `src/hooks/useMatchCreation.ts` to stop forwarding them, and update `MatchFormRHF` (invoked from `src/pages/Schedule.tsx:189`) to hide completed-toggle/score inputs in create mode so the form still typechecks. Edit mode is unaffected.

### 5. New test
`src/components/admin/__tests__/MassScoreEntryTool.test.tsx` (or extend existing wiring test):
- Confirm-delete calls `deleteMatchWithStatsReversal` exactly once.
- Legacy `deleteMatch` / `reverseTeamStats` / `upsertTeamSeasonStats` are never called.
- On success, the deleted match is removed from the visible list.
- On failure, destructive toast fires and caches are not invalidated.

## Validation
```
npm run test:file -- src/components/admin/__tests__/MassScoreEntryTool.test.tsx
npm run typecheck && npm run lint && npm run test:coverage && npm run knip && npm run build
grep -rn "reverseTeamStats\|deleteMatch(" src --include='*.ts*' | grep -v test | grep -v WithStatsReversal
```
Last grep must return nothing. Knip must stay clean.

## Non-goals / rollback
Non-goals: drift detector (PR-05), mass-entry error-display (PR-08), batch serialization (PR-08). Rollback = revert commit; nothing else depends on this.
