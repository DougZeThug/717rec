

## Plan: Split `BracketReadService.ts` (533 lines, 19 functions) into sub-modules

### Why
533-line file with 19 exported functions, exceeding the project's ~400-line guideline. Mirrors the `MatchReadService` pattern already documented in the codebase (see `src/services/matches/MatchReadService.ts` which is a barrel re-exporting from focused sub-services).

### Target structure

Create folder `src/services/brackets/read/` with cohesive sub-services grouped by purpose:

```text
src/services/brackets/read/
├── BracketSelectorService.ts       // fetchBracketsForSelector + BracketOption type
├── BracketInfoService.ts           // fetchBracketInfo, fetchBracketWithDivision,
│                                   //   fetchBracketsOverview, fetchPlayoffBracketData
├── BracketParticipantService.ts    // fetchBracketParticipants, fetchParticipantsByIds,
│                                   //   fetchPlayoffTeams, fetchTeamsByNames,
│                                   //   validateSeeds
├── BracketMatchReadService.ts      // fetchPlayoffMatches, fetchPlayoffMatchWithBracket,
│                                   //   fetchPlayoffMatchTeams, fetchBmMatchWithStage,
│                                   //   fetchBmMatchData, fetchBracketsManagerMatchData
├── BracketStageService.ts          // fetchStageAndParticipants, fetchGroupsAndMatches
└── BracketStandingsService.ts      // fetchFinalStandings
```

Convert `src/services/brackets/BracketReadService.ts` into a **barrel re-export** (same pattern as `MatchReadService.ts`):

```ts
export type { BracketOption } from './read/BracketSelectorService';
export { fetchBracketsForSelector } from './read/BracketSelectorService';
export {
  fetchBracketInfo,
  fetchBracketWithDivision,
  fetchBracketsOverview,
  fetchPlayoffBracketData,
} from './read/BracketInfoService';
// ...etc
```

This keeps **all 13 importers unchanged** — zero call-site edits.

### Safety guarantees (zero behavior change)
- **Pure file split** — copy each function verbatim, fix only its imports.
- No signature changes, no renames, no logic edits.
- No new validation, throws, or error handling changes.
- The `BracketOption` interface moves with `fetchBracketsForSelector` and is re-exported via the barrel.

### Implementation steps
1. Create `src/services/brackets/read/` folder.
2. Create the 6 sub-service files with their respective functions copied verbatim.
3. Replace `BracketReadService.ts` content with the barrel re-exports.
4. Run `npx tsc --noEmit` — must pass with zero new errors.
5. Smoke test: open Playoffs page, open a bracket, view final standings.

### What changes
- **6 new files** in `src/services/brackets/read/`.
- **1 file shrunk** to a barrel re-export: `BracketReadService.ts` (~30 lines).
- **0 importers changed**, **0 tests changed**, **0 migrations**.

### Rollback
Delete the `read/` folder and restore the original `BracketReadService.ts` from git. Single-step revert.

