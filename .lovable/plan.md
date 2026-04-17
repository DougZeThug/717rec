

## Plan: Split `blossomPairingAlgorithm.ts` (1179 lines) into sub-modules

### Why
Single 1179-line file with 25+ functions. Project rule: split files >~400 lines using the `matches/` folder pattern. Only one public export (`generatePairingsWithBlossom`), so external impact is zero.

### Target structure

Create folder `src/utils/autoSchedule/blossom/` with cohesive modules:

```text
src/utils/autoSchedule/blossom/
├── index.ts                  // re-exports generatePairingsWithBlossom
├── types.ts                  // TeamPairingConfig, Edge, RelaxationLevel,
│                             //   TeamEdgeAnalysis, GraphFeasibilityResult
├── tierUtils.ts              // getTierFromDivision, isExtremeTierDifference,
│                             //   isBothRecreational, _isSameTier
├── historyUtils.ts           // haveTeamsPlayedBeforeSync
├── graphBuilder.ts           // buildWeightedGraph, buildWeightedGraphWithRelaxation,
│                             //   buildEdgesWithRelaxationLevel, _buildRelaxedGraph,
│                             //   shouldExcludeEdge, createEdgeMap, filterUsedEdges
├── feasibility.ts            // analyzeGraphFeasibility
├── matchingRunner.ts         // runBlossomMatching, countTeamMatches
├── repair.ts                 // repairUnmatchedTeams, findGuaranteedSolution
├── validation.ts             // validatePairings, validatePairingsWithDetails,
│                             //   validateNoSessionRematches
├── statistics.ts             // logFinalStatistics
└── generatePairings.ts       // generatePairingsWithBlossom (orchestrator)
```

Keep `src/utils/autoSchedule/blossomPairingAlgorithm.ts` as a **1-line re-export shim** for backward compatibility:
```ts
export { generatePairingsWithBlossom } from './blossom';
```

This means the 3 existing import sites need **zero changes**.

### Safety guarantees (zero behavior change)
- **Pure file split** — copy functions verbatim into new files, fix imports only.
- No logic edits, no signature changes, no renames.
- Internal `_` prefixed helpers (`_isSameTier`, `_buildRelaxedGraph`) keep their names; they become non-exported within their new module unless cross-module access is needed.
- All types move to `types.ts` and are imported where used.
- Existing test file (`__tests__/blossomPairingAlgorithm.test.ts`) keeps working because it imports `generatePairingsWithBlossom` from `../blossomPairingAlgorithm` — the shim preserves that path.

### Implementation steps
1. Create `blossom/types.ts` with the 5 types.
2. Create leaf modules (`tierUtils`, `historyUtils`) — no internal deps.
3. Create `graphBuilder.ts` — depends on types + tierUtils + historyUtils.
4. Create `feasibility.ts`, `matchingRunner.ts`, `validation.ts`, `statistics.ts`, `repair.ts`.
5. Create `generatePairings.ts` orchestrator importing from the above.
6. Create `blossom/index.ts` re-exporting `generatePairingsWithBlossom`.
7. Replace `blossomPairingAlgorithm.ts` content with the 1-line re-export shim.

### Verification
1. `npx tsc --noEmit` — must pass with zero new errors.
2. `npm test blossomPairingAlgorithm` — existing tests must pass unchanged.
3. `npm test scheduling` / dual-block tests — pass unchanged.
4. Smoke test: open auto-scheduler in admin, generate a schedule for a date with teams, confirm pairings render.

### What changes
- **10 new files** in `src/utils/autoSchedule/blossom/`.
- **1 file shrunk** to a single re-export line: `blossomPairingAlgorithm.ts`.
- **0 importers changed**, **0 tests changed**, **0 migrations**.

### Rollback
Delete the `blossom/` folder and restore the original `blossomPairingAlgorithm.ts` from git history. Single-step revert.

