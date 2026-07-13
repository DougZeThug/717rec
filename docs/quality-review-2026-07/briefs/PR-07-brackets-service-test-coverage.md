# PR-07 — Behavioral test coverage for the playoff brackets service layer

| | |
|---|---|
| **Phase** | 3 — Test coverage and regression protection |
| **Tier** | 2 — High value (least-tested subsystem relative to complexity) |
| **Priority** | Medium-high |
| **Recommended agent** | Claude Code (needs to understand brackets-manager semantics) |
| **Difficulty** | Medium-high |
| **Risk** | Low (tests only) |
| **Expected score improvement** | +0.9 overall (Testing 83→90, Reliability +1) |
| **Parallel-safe?** | Yes (adds test files only) |
| **Depends on** | PR-01 |

## Background and problem statement

- `src/services/brackets/` is the app's deepest subsystem: **51 source files vs 14 test files** (measured). It wraps the `brackets-manager` library with a custom Supabase storage adapter (`manager/SupabaseSqlStorage.ts`, 279 lines), update/admin services (`manager/services/BracketUpdateService.ts`, `BracketAdmin*`), normalization/repair services, a read layer, and a Challonge fallback (`src/services/ChallongeFallbackService.ts`).
- Playoffs are the league's highest-stakes moment; a bracket that silently mis-advances a team is the most embarrassing possible failure, and the normalization/"repair" code paths can rewrite bracket state.
- By contrast the rest of the services layer is well covered (services dir coverage floor is 72% statements, enforced). Status: **confirmed coverage gap** (file counts + coverage report); no specific bug is claimed.
- Preserve: all current behavior — these are characterization + contract tests, not refactors.

## Objective

The bracket storage adapter, match-update flow, and normalization/repair paths have behavioral tests that would catch a wrong-team-advances or state-corruption regression, raising `src/services/brackets/` to at least the services-wide coverage floor.

## Exact scope

Add tests (no production-code changes except exporting-for-test if unavoidable — prefer testing through public entry points):

1. **`SupabaseSqlStorage`** (the brackets-manager CRUD adapter): select/insert/update/delete per table mapping; error propagation; the contract brackets-manager relies on (return shapes, id handling). Mock the supabase client at module boundary like `src/services/__tests__/DivisionService.test.ts` does.
2. **`BracketUpdateService.updateMatch`**: entering a score advances the correct participant to the correct next match (use `brackets-memory-db` — already a dependency — or the mocked storage) for: 4-team and 8-team single-elim happy paths; reporting the LOWER seed winning; updating an already-scored match (score correction); attempting to score a match whose participants aren't set yet (expect controlled failure).
3. **Normalization/repair** (`manager/services/normalization/`): feed a deliberately inconsistent bracket state and assert repairs are exactly the documented ones — most importantly assert what it does NOT touch (completed match results must never be rewritten).
4. **Challonge fallback trigger** (`ChallongeFallbackService` + `useBracketData` seam): the condition that flips the UI to the Challonge embed; fallback config read path.
5. **Out of scope:** bracket UI components (PR-08 territory if desired), the `e2e/playoff-bracket.spec.ts` (exists), rewriting any service.

## Likely files affected

- New/expanded `__tests__` under `src/services/brackets/manager/`, `src/services/brackets/manager/services/`, `src/services/brackets/read/`, `src/services/__tests__/ChallongeFallbackService.test.ts`
- Read first: `docs/BRACKETS_MANAGER_SCHEMA.md`, `docs/BRACKET_MANAGER_PHASE_0_DOCUMENTATION.md`, `tests/bracketManagerPhase0.test.ts`, `tests/bracketManagerSchema.test.ts`, `tests/repro_bracket_standings.test.ts` (existing patterns to extend, not duplicate)

## Implementation instructions

1. Read the two brackets docs and the three existing root-level bracket tests to learn the fixtures/conventions already established.
2. Write the storage-adapter tests first (pure contract), then the update-flow tests on `brackets-memory-db`, then normalization.
3. Every test asserts observable outcomes (who is in the next round, what rows changed), not internal call counts, matching the repo's testing style (`TESTING.md`).
4. If you discover an actual bug (e.g., normalization rewriting completed results), do NOT fix it here — add a `test.fails`/skipped test documenting it and report it prominently.

## Database requirements

None (mocked storage + memory DB).

## UI and UX requirements

None.

## Testing requirements

The PR IS tests. Key cases enumerated in scope; each with setup (bracket fixture), action (score/report/normalize), expected result (explicit next-round participant ids / unchanged fields).

## Required validation commands

```bash
npm run test:file -- src/services/brackets src/services/__tests__/ChallongeFallbackService.test.ts tests/
npm run test:coverage   # services coverage floor must not regress; brackets dir should rise
npm run typecheck && npm run lint && npm run build
```

## Manual verification checklist (for Doug)

None needed (no behavior change). Optional: open `/playoffs` and confirm it renders as before.

## Acceptance criteria

- [ ] `src/services/brackets/**` statement coverage ≥ 72% (the services floor) in the coverage report.
- [ ] Tests cover: correct advancement (2 bracket sizes), score correction, unset-participants failure, normalization no-touch guarantee, Challonge fallback trigger.
- [ ] Zero production-code diffs (or only export-for-test, listed and justified).
- [ ] Full suite green.

## Non-goals and guardrails

- No refactoring of bracket services.
- No new snapshot tests.
- Do not chase 100% coverage — cover the failure modes listed.

## Rollback

Tests only; revert freely.

## Deliverables from the implementing agent

Coverage before/after for `src/services/brackets/`; list of test files + case inventory; any documented-but-not-fixed bugs found.
