# Untangle decision log (temporary)

Started 2026-11-11 from the `/untangle-codebase` skill. **Delete this file when the last slice is done** (CLAUDE.md: executed plan files are deleted).
Rules for this work: never change scoring or ranking meaning; one fix per commit; gates after every commit
(`npm run typecheck`, `npm run lint`, `npm run knip`, nearby tests); full gates at the end of each slice.

Baseline on the clean tree (2026-11-11): typecheck, lint, knip, build and size pass.
`npm run test:coverage`: 875 test files, 8,012 tests, all pass, coverage floors hold.
Size: 1,393 source files, ~144k lines. Main bundle 78.24 kB gzip; all JS 1.27 MB gzip (limit 1.3 MB).

## How we know code is dead

`npm run knip` treats every test file as an entry point, so code only a test imports looks "used".
Two independent checks agree on 44 production files that nothing in production imports:
1. an import-graph script (roots: `src/main.tsx`, `src/index.css`, `src/lib/mcp/**`), and
2. `knip --production` with a temporary config (entries `index.html`, `src/main.tsx`, `src/lib/mcp/**`).

## Slice 1: remove dead files (this slice)

Problems:
- 12 files under `src/components/playoffs/` (`match-card/*`, `animation/BracketAnimationUtils.tsx`) hang off the dead `PlayoffMatchCard`. The live card is `src/components/schedule/match-card/`.
- 7 display components nobody renders: `schedule/ScoreSection`, `stats/{AnimatedRankNumber,CompactStandings,StatsSummaryCards}`, `stats/rank/TeamLogo`, `teams/TeamStats`, `timeslots/WeekTimeslotDisplay`, plus `styles/interactionUtils.ts`.
- 3 old team services nobody calls: `TeamAnalysisService` (coach notes; the `team_analysis` table STAYS), `TeamCalculationService`, `TeamHiddenService`.
- 5 old playoff hooks replaced by `usePlayoffViewModel.compat.ts`: `usePlayoffActions`, `usePlayoffBracketData`, `usePlayoffMatches`, `usePlayoffState`, `usePlayoffViewModel`; plus `matches/useMatchInteractions`, `matches/utils/matchResultUtils`, `useWeekTimeslotsByTeam`.
- Old utils: `autoScheduleUtils`, `teamStatsUtils/{fetchTeamData,parseTeamStats}`, `teamDetailsUtils/{headToHeadUtils,matchUtils}`, `colors/{championshipColors,sweepRateColors}`, `powerScore/getTrendingTeams`, `brackets/mappers/teamMapper`, `brackets/validators/bracketDataValidator`, `hooks/useHistoricalPowerScores`.

Fix:
- Delete the files and the tests that only test them. **Edit, do not delete**, test files that also guard live code: `utils/colors/__tests__/colorModules.test.ts`, `utils/teamDetailsUtils/__tests__/teamDetailsUtils.test.ts`, `hooks/playoffs/__tests__/uncoveredPlayoffHooks.test.tsx`.
- Remove `vi.mock` lines and comments that point at deleted files.
- Fix docs that name deleted files (`src/utils/powerScore/README.md`, `src/docs/TABLE_PATTERNS.md`, `TESTING.md`).
- After deleting, run `npm run knip`. Remove only the exports and types it now flags (they lost their last user).

Deliberately NOT in Slice 1 (checked by the scoring and skeptic reviews):
- ~60 other exports that only tests use (`utils/autoSchedule/*`, `validation.ts`, `timeUtils.ts`, ...). Deleting one exposes the next; later.
- `usePreviousRankings`: NOT dead. It feeds the trend arrows (database first, old browser key as fallback).
- `utils/rankingUtils/{index,sortAndUpdateRankings}.ts`: dead wrappers, but `rankingUtils/__tests__/index.test.ts` imports through the barrel and is the only test of the non-power-score column sorts. Repoint that import first (Slice 2/5).
- `GameRules.hardCap`: `winnerDetection.test.ts:8` is the only test of the confirmed "no hard cap" rule.
- `matchesCreated` listener: touches `useScoreEntryData` and 5 mass-score tests for a tiny gain.
- `BracketWriteService.updatePlayoffMatchResult`: its test (`BracketWriteService.test.ts:118`) is the only test that every playoff write carries `updated_at`. Before this export is ever removed, add `updated_at: expect.any(String)` to the `objectContaining` in `uncoveredPlayoffHooks.test.tsx` (~line 238).
- `AMBIGUOUS_SCORES`, `clearMatchHistoryCache`, `UPSET_THRESHOLD` (definition), `updateTeamSeed`, `getDivisionGradientClass` in `styles/design-system/divisions.ts`: live or used as test seams.
- `TeamCalculationService.test.ts:53` is the only test of the `sos || 0.5` fallback that lives in `hooks/useTeamRankings.ts:88` (display only). Consider porting that one case later.

## Later slices (see the approved plan)

2 import direction, shims, name twins - 3 layer rule - 4 league constants - 5 scoring-adjacent copies (pin first) -
6 special cases - 7 comments - 8 tests - 9 re-scan and delete this file.
