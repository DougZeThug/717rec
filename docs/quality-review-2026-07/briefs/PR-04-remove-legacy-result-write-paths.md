# PR-04 — Remove/guard the legacy non-atomic match-result write paths

| | |
|---|---|
| **Phase** | 2 — Reliability, database, and security |
| **Tier** | 2 — High value (closes the door PR-02 walked us out of) |
| **Priority** | Medium-high — immediately after PR-02 |
| **Recommended agent** | Claude Code or Codex |
| **Difficulty** | Medium |
| **Risk** | Low-medium (deletions; typecheck + knip catch mistakes) |
| **Expected score improvement** | +0.7 overall (Reliability +3, Code quality +2) |
| **Parallel-safe?** | No — same files as PR-02; must land after it |
| **Depends on** | **PR-02** (the atomic RPC must exist and be wired in first) |

## Background and problem statement

- `src/services/matches/MatchWriteService.ts` exports result-mutating functions that bypass team-counter updates:
  - `approveMatch` (line ~330: sets winner/loser directly, **no stats**) and `setMatchAsTie` (line ~346: clears winner/loser, **no reversal**) — grep of `src/` (excluding tests) found **no callers**: dead code that invites misuse (their names sound like the safe RPCs).
  - `updateMatchScore` (service-level, line ~71) — accepts `winner_id`/`loser_id` in its payload; also apparently uncalled (the actively used `updateMatchScore` is a different function in `src/hooks/matches/utils/matchDatabaseUtils.ts`).
  - `updateMatch`/`updateMatchArray` (lines ~165/181) — accept an **untyped `object` payload** and update any match columns; before PR-02 these were the drift vector (empirically demonstrated: `evidence/scoring-verification.log` B5).
- After PR-02, result changes flow through `resubmit_match_result`, but nothing *prevents* a future feature (or AI agent) from reaching for these generic updaters and reintroducing drift.
- Status: dead code **confirmed** by grep; the guard-rail need is a design judgment. Preserve: legitimate non-result match updates (reschedule date, location, team swap on unplayed matches — used by `useMatchUpdate` and `matchUpdateUtils`).

## Objective

It becomes impossible to change a match's result fields through the service layer except via the atomic RPCs — enforced by types and by deletion of dead paths.

## Exact scope

1. Delete `approveMatch`, `setMatchAsTie`, and service-level `updateMatchScore` from `MatchWriteService.ts` (+ their unit tests). Before deleting, re-verify zero callers with `grep -rn "approveMatch\b\|setMatchAsTie\|updateMatchScore" src/ --include="*.ts*"` (note: keep `matchDatabaseUtils.updateMatchScore` if PR-02 left it for non-result use — inspect first; if PR-02 made it dead, delete it too).
2. Replace the `updatePayload: object` parameter of `updateMatch`/`updateMatchArray` with an explicit allowlisted type that **excludes result fields**:
   ```typescript
   type MatchNonResultUpdate = Partial<Pick<Database['public']['Tables']['matches']['Update'],
     'date' | 'location' | 'team1_id' | 'team2_id' | 'round_number' | 'metadata'>>;
   ```
   (Derive the exact allowlist from what current callers actually pass — inspect `useMatchUpdate.ts` and `matchUpdateUtils.ts` first; result fields `winner_id`, `loser_id`, `iscompleted`, `team1_score`, `team2_score`, `team1_game_wins`, `team2_game_wins` must NOT be in it.)
3. If `useMatchUpdate`'s completed→incomplete path still needs to clear result fields (per PR-02's decision matrix), route that through `mark_match_as_tie`/`reopen_live_match`/`resubmit_match_result` as appropriate — do not carve an exception into the generic updater.
4. Also delete `useTeamRecordUpdate`/`useTeamRecords` if PR-02 left them callerless (grep first).
5. **Out of scope:** bracket/playoff score editing (brackets-manager subsystem has its own storage layer); `batchCreateMatches`/`createMatch`/`saveAutoScheduleMatches` (create paths, not result mutations).

## Likely files affected

- `src/services/matches/MatchWriteService.ts` (+ `__tests__`)
- `src/hooks/matches/utils/matchDatabaseUtils.ts`, `src/hooks/matches/utils/matchUpdateUtils.ts`
- `src/hooks/matches/updates/useMatchUpdate.ts`
- Possibly `src/hooks/matches/useTeamRecordUpdate.ts`, `src/hooks/useTeamRecords.ts` (deletion)
- No migrations. No type regeneration.

## Implementation instructions

1. Inspect every current caller of each function you intend to delete or retype (grep, then read each call site). Build the allowlist from reality, not guesswork.
2. Make the type change; let `npm run typecheck` reveal every violator; fix violators by routing through the correct RPC, not by widening the type.
3. Delete dead functions + their tests; run knip to confirm no new unused exports appear (and that deleted ones disappear).
4. Smallest coherent diff; no reformatting.

## Database requirements

None. (RLS already restricts `matches` UPDATE to admins; this PR is client-side defense-in-depth and dead-code removal.)

## UI and UX requirements

No visible changes. Match rescheduling (date/location/teams) must work exactly as before at all viewports; result editing must behave as PR-02 left it.

## Testing requirements

- Update `MatchWriteService` unit tests: deleted functions' tests removed; new compile-time guarantee documented by a type-level test (e.g., `// @ts-expect-error winner_id is not assignable` in a test file proving the allowlist rejects result fields).
- Existing `useMatchUpdate`/`matchUpdateUtils` tests updated to the new signatures.
- Full suite green.

## Required validation commands

```bash
npm run typecheck && npm run lint
npm run knip
npm run test:file -- src/services/matches src/hooks/matches
npm run test:coverage
npm run build
```

## Manual verification checklist (for Doug)

1. Admin → edit a match's **date/location** only → save. **Expect:** saved, no standings change.
2. Admin → edit a match's **winner** → save. **Expect:** standings update correctly (this exercises the PR-02 RPC through the new guard).

## Acceptance criteria

- [ ] `grep -rn "approveMatch\b|setMatchAsTie" src/` returns nothing.
- [ ] Passing `winner_id` to `updateMatch` is a TypeScript compile error (proven by an in-repo `@ts-expect-error` test).
- [ ] knip, typecheck, lint, full suite, build all green.

## Non-goals and guardrails

- Do not modify SQL functions or migrations.
- Do not touch bracket score editing.
- Do not delete anything that still has a caller — report instead.

## Rollback

Pure git revert; no schema/data involvement.

## Deliverables from the implementing agent

List of deleted exports with the zero-caller grep proof; the final allowlist type and why each field is in it; test/build outputs.
