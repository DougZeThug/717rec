# PR-08 — Component tests for the live-scoring UI (the mobile-critical flow)

| | |
|---|---|
| **Phase** | 3 — Test coverage and regression protection |
| **Tier** | 2 — High value |
| **Priority** | Medium |
| **Recommended agent** | Claude Code or Codex |
| **Difficulty** | Medium |
| **Risk** | Low (tests only) |
| **Expected score improvement** | +0.6 overall (Testing +4, Mobile +1) |
| **Parallel-safe?** | Yes |
| **Depends on** | PR-01 |

## Background and problem statement

- Live scoring is the feature players use mid-game on phones at the venue — the highest-pressure UI in the app. Its **logic** is superbly tested (`src/utils/liveScoring/` at ~99% coverage; SQL finalize/reopen covered by smoke tests; `tests/liveScoringFinalize.integration.test.ts` proves no double-count), but its **components** are thin: `src/components/live-scoring/` has only 7 test files for the whole tree, and key interactive components (`ScoreGrid`, `RoundScoreInput`, `CompleteMatchDialog`, `LiveMatchView` at 383 lines, `ThrowerBar`) lack direct tests.
- Component-layer regressions (a disabled submit button, a broken undo, an off-by-one in the round display) would ship undetected tonight and be discovered courtside. Status: **confirmed coverage gap** (file inventory); no specific bug claimed.
- Preserve: everything — characterization tests only.

## Objective

The interactive live-scoring components have behavior tests covering the score-entry loop (enter round → totals update → undo → complete game → complete match), including validation and error surfaces, so UI regressions in the scoring night flow are caught by CI.

## Exact scope

Add `__tests__` for, at minimum (RTL + userEvent, mock the hooks layer — the established seam, see `src/components/home/__tests__/ScoreSubmissionModal.test.tsx` for the house pattern; remember the Radix pointer-capture mocks from `CLAUDE.md`):

1. **`RoundScoreInput`**: entering bag counts enforces 0–12 and the "11 not possible" cornhole rule (find the exact validation in `src/utils/liveScoring/scoring.ts` and assert the UI surfaces it); submit disabled while invalid; fires the round mutation with the right payload.
2. **`ScoreGrid` / `RoundLog`**: renders rounds in order; totals match `deriveLiveMatch` output for a fixture; undo (delete last round) appears for the last round only and calls the mutation.
3. **`GameScoreboard` + `ThrowerBar`**: current game score and next-thrower indication for a mid-game fixture (thrower rotation logic already unit-tested — assert the UI reflects it).
4. **`CompleteMatchDialog`**: appears when best-of-3 is decided; confirm calls finalize; cancel does not; a `DuplicateRoundError`/already-finalized error path renders the error state instead of crashing.
5. **`LiveScoring` page-level guard**: non-scorers (via mocked `useCanScoreMatch` = false) see the read-only view, not the input controls.
6. **Out of scope:** realtime channel behavior (`useLiveMatchRealtime` — has its own tests), SQL, e2e, admin corrections UI.

## Likely files affected

- New tests under `src/components/live-scoring/__tests__/` and possibly `src/pages/__tests__/LiveScoring.test.tsx` (check it exists — extend, don't duplicate)
- Fixtures: reuse builders from `src/hooks/live-scoring/__tests__/` and `src/utils/liveScoring/__tests__/` if exported; otherwise create a small `testFixtures.ts` inside `__tests__/`.

## Implementation instructions

1. Inventory existing live-scoring component tests first (`find src/components/live-scoring -name "*.test.*"`) — extend gaps, never rewrite passing tests.
2. Mock at the hook boundary (`useLiveMatch`, `useRoundMutations`, `useFinalizeMatch`, `useCanScoreMatch`) — not the supabase client — matching house style.
3. Each test = user-visible behavior: what renders, what's disabled, what's called with what payload. No snapshots.
4. Include one 375 px-relevant assertion where cheap (e.g., touch targets render; do NOT attempt visual-size assertions in jsdom — assert the mobile variant renders, e.g., drawer vs dialog if `useIsMobile` gates it, by mocking `useIsMobile`).

## Database requirements

None.

## UI and UX requirements

None (tests only), but the tests must encode the CURRENT UX as the contract: validation messages, disabled states, dialog appearance timing.

## Testing requirements

Cases enumerated above; every case: setup (fixture match state + mocked hooks), action (userEvent), expected (assertion on DOM/mutation payload).

## Required validation commands

```bash
npm run test:file -- src/components/live-scoring src/pages/__tests__/LiveScoring.test.tsx
npm run test:coverage
npm run typecheck && npm run lint && npm run build
```

## Manual verification checklist (for Doug)

None (no behavior change).

## Acceptance criteria

- [ ] Direct tests exist for RoundScoreInput, ScoreGrid/RoundLog, GameScoreboard/ThrowerBar, CompleteMatchDialog, and the cannot-score guard.
- [ ] The 0–12 / no-11 validation is asserted at the component level.
- [ ] Coverage for `src/components/live-scoring/` visibly rises in the report; no floors regress.
- [ ] Zero production-code changes; full suite green.

## Non-goals and guardrails

No component refactors; no new deps; no snapshot tests; don't touch working tests.

## Rollback

Tests only; revert freely.

## Deliverables from the implementing agent

Test inventory (file → cases); coverage delta for the live-scoring tree; any component behavior discovered that looks wrong (report, don't fix).
