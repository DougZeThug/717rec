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

## Slice 1 result (DONE 2026-11-11, QA PASS)

- 43 production files and 23 test files deleted; 6 test files edited (the 3 mixed ones, `TeamStatsComputed.test.tsx`, and 2 that only lost `vi.mock` lines). 5,458 lines removed.
- Extra removals forced by knip, lint or doc accuracy: `useWeekTimeslotsByTeam` (moved into the display-components commit), `styles/design-system/lists.ts` (emptied) with its barrel line and the "List Layout Utilities" section of `src/docs/CARD_PATTERNS.md`, the types `TeamAnalysis`, `TeamAnalysisInput`, `PlayoffViewModel`, `BracketMatchesByType`, `BracketMatchDisplay`, `MatchResultData`, `ScoreSectionProps`, the `championshipThresholds` constant, the barrel re-exports of `haveTeamsPlayedBefore` and `fetchTeamForStats` (the functions stay), the `export` keyword on `HeadToHeadMap`, and 3 rows in `TESTING.md`.
- After: 852 test files, 7,832 tests pass (the drop of 23 files / 180 tests is exactly the deleted dead tests); coverage lines 88.94 -> 89.01, no surviving file lost coverage; build and size unchanged (main 78.24 kB gzip); built CSS 319.5 -> 308.1 kB (64 class names gone, none used anywhere in `src/`); e2e 58 passed. No scoring file changed. No database or migration change.
- Integrity check flags 28 test files: 27 are this slice's deleted or edited tests; `LoginPrompt.test.tsx` was deleted earlier on this branch (PR 1734). Only Doug can `waive`.
- Commit messages: the playoff-hooks commit says "5 tests" (6 deleted); the display-components commit headline says 8 files (10 deleted, explained in its body). History is not rewritten.

## Carry-over notes for later slices

- **Re-pin before removing `updatePlayoffMatchResult`:** the live write path (`updatePlayoffMatchScores`, stamped in `usePlayoffMatchUpdate.ts:170`) has no test for `updated_at`. Add `updated_at: expect.any(String)` to `uncoveredPlayoffHooks.test.tsx` (~line 226). Season stats order playoff results by that column.
- **Re-pin the `sos || 0.5` fallback** (`hooks/useTeamRankings.ts:88`, display only): no live test. Note `||` also turns a SOS of 0 into 0.5.
- **Head-to-head win / loss / tie counts** have no direct test now (the deleted `headToHeadUtils` test was the only one). Live path is the SQL function `get_head_to_head_records`. Add a SQL test in `supabase/tests/` (Slice 5).
- **Playoff match tie:** live code gives team 2 the win when game wins are tied (`usePlayoffMatchUpdate.ts:154`, `useOptimisticScoreMutation.ts:250`). The screens cannot reach it (quick editor offers 2-0, 2-1, 1-2, 0-2). No test pins it. Ask Doug only if a different rule is wanted.
- **Stale comments to remove in Slice 7** (they name deleted callers): `TimeslotQueryService.ts:44,103`, `BracketInfoService.ts:91`, `BracketMatchReadService.ts:12`, `MatchHistoryService.ts:100`, `src/docs/FOLDER_CONVENTIONS.md:76`. The functions they describe may now have no production caller: check with `knip --production`.
- Unused mock stub `mocks.bracket` in `uncoveredPlayoffHooks.test.tsx` (lines ~7, 26): remove in Slice 8.
- `dark:bg-slate-800` left the built CSS (only the deleted `AnimatedRankNumber` used it). The same string sits in an old `hero_cards` seed migration; `ChampionsHeroCard` never reads it, so nothing shows. Re-check in Slice 9 if hero colours ever render from the database.
- `coverage-baseline.txt` still lists deleted files; it is a generated snapshot (refresh with `npm run test:coverage:refresh-docs` in Slice 8/9).
- `src/utils/powerScore/README.md:131-136` says nothing can move a finished season; `LEAGUE_CONTEXT.md:40` and README line ~255 say a weight save recomputes archived seasons too. Existing doc conflict: fix the README in Slice 5 (Doug already confirmed the LEAGUE_CONTEXT version).
- `CLAUDE.md` still says ~450 test files / ~3.2k tests; real: 852 / 7,832. Fix in Slice 9.

## Later slices (see the approved plan)

2 import direction, shims, name twins - 3 layer rule - 4 league constants - 5 scoring-adjacent copies (pin first) -
6 special cases - 7 comments - 8 tests - 9 re-scan and delete this file.
Also pending from Slice 1: ~60 dead exports that only tests use, `rankingUtils/{index,sortAndUpdateRankings}.ts`, `GameRules.hardCap`, the `matchesCreated` listener, unused config keys (`enableAuditLog`, `sessionTimeout` in `src/config/admin.ts`; unused tiers in `src/config/cache.ts`).
