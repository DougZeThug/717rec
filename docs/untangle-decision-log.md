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

## Slice 2 PR A result (DONE 2026-11-11, same-name twins and re-export files)

Plan: Slice 2 splits into PR A (this), PR T (type homes), PR B (single moves that fix layer direction) and PR C (moves near scoring). Only PR A is done. Import and mock-path changes only; no logic moved.

- **Same-name twins fixed (2):** `utils/rankingUtils.ts` became `utils/rankingUtils/index.ts` and `utils/colors.ts` became `utils/colors/index.ts`. Both are pure renames (`git diff -M100% --summary` shows R100), so every bare importer (14 for `colors`, 13 for `rankingUtils`) kept its import line. Before the rankingUtils move, the dead 7-line barrel `rankingUtils/index.ts` was deleted and `rankingUtils/__tests__/index.test.ts` now imports `@/utils/rankingUtils`. `divisionWeightsCache` is NOT re-exported from the new index (bare importers still do not load Supabase).
- **12 re-export-only files deleted:** `hooks/{useAuth,useMatchUpdates,useMessageBoard,useTeamSeasonBreakdown,useSchedulePreview,useTeamTotals}.ts`, `hooks/career/useCareerData.ts`, `services/{TeamService,TeamStatsService}.ts`, `services/brackets/manager/services/BracketAdminService.ts`, `utils/scheduling/greedyBackToBackScheduler.ts`, `utils/autoSchedule/blossomPairingAlgorithm.ts`. Importers now name the real hook, service or folder. `useTeamTotals` was an alias (`useTeamTotalsComputed as useTeamTotals`): call sites got the real name, no alias left. `useTeamMutations.test.ts` now mocks three services (Create, Delete, Update) instead of one file.
- **No test deleted, skipped or weakened.** 18 test files changed, all by import path, mock path, mock key or one comment. Every repointed `vi.mock` was proven to still intercept: a throwing mock factory added for one run failed each test file with `MOCK_HIT`, then the file was restored.
- **Proof of no behaviour change:** 852 test files, 7,834 tests pass (same as before); per-file pass counts equal for every touched test; coverage totals identical (lines 89.01, statements 87.48, functions 87.58, branches 78.18) and no surviving file lost coverage (the 12 shims had 0/0 lines; the two moved files kept 47/47 and 15/15 lines); built CSS byte-identical (0 classes removed or added); total built JS grew by 24 bytes (5,010,974 -> 5,010,998; same 309 files) only because one shared chunk was renamed after the deleted `useTeamTotals` alias (now `useLeaguePercentiles`, +3 bytes, and its three importers carry the longer name, +21); no code changed and gzip totals are unchanged; size limits unchanged (main 78.24 kB gzip).
- **Import graph (throwaway script, production files only):** wrong-direction edges 35 -> 35 and import cycles 3 -> 3 with the same members (the 9-file `adminTabs` / admin-section cluster, `types/index` with `types/autoSchedule`, `transformBracketData` with `useBracketData`). PR A fixes no layer edge on purpose; the `useAuth` shim removal did not create a cycle.
- **Kept on purpose:** `TeamSeasonStatsService`, `CareerService`, `TeamFetchService` (7 production importers, 11 test mocks), `MatchReadService`, `SeasonService`, folder `index.ts` entries, `SupabaseSqlStorage.ts`, `rankingUtils/sortAndUpdateRankings.ts` with its test, and both `useUpdateTeam` and `useTeamMutations` (not duplicates: merging would double-toast; only their service import changed).
- **Left as written (dated snapshots):** `docs/product-description/bug-triage.md` (names `rankingUtils.ts`, `colors.ts`), `docs/audits/CODE-QUALITY-AUDIT-2026-04-24.md`, `docs/quality-review-2026-07/briefs/PR-04-*.md`. `SCHEDULER_README.md` test commands still work (the two test files keep their names).
- **Deferred from Slice 2 (need design, not a move):** `routePrefetch` (14 dynamic page imports from `utils`), `adminTabs` (lazy-only cycle with the admin sections), `matchHistoryService` (a util that acts as a service and swallows errors: Slice 6), the `useToast` type import from a shadcn component (keep as a documented exception), dead `haveTeamsPlayed`, and the dead `rankingUtils/sortAndUpdateRankings.ts` wrapper with its test. When that wrapper is deleted, first move its two unique cases ("empty array", "division tier after rounding") into `rankingUtils/__tests__/index.test.ts`.
- **Still to do in Slice 2:** PR T, PR B and PR C are done (next three sections). What is left is the design PR for `routePrefetch`, `adminTabs` and `matchHistoryService` + `compatibilityUtils`; `useToast` stays a documented exception. The current deferred lists are at the end of the PR C section.

## Slice 2 PR T result (type homes, built 2026-11-11, 8 commits on the PR A branch)

Types are erased at build time, so nothing the league sees can change. Moved type text is character-identical (only the `export` keyword was added to two interfaces in T6). No alias re-exports were left behind: each old place stopped exporting and every importer was repointed in the same commit.

- **T1:** deleted `types/phase3.ts` (six aliases such as `Phase3X = X`, two users) and its line in the `types/index.ts` barrel. `usePlayoffEditMatch.ts` now imports from `services/brackets/read/types`; `TeamSeedService.ts` from `types/seeding`.
- **T2:** `SimpleBracketData` moved from `useBracketData.ts` to `transformBracketData.ts` (it is that function's return type). The `useBracketData` / `transformBracketData` cycle is gone. `BracketLoadingStep` and `BracketLoadingProgress` stay in `useBracketData.ts`.
- **T3:** `TrendBasis` moved from `services/rankings/weeklyTrendsForWeek.ts` to `types/powerScoreSnapshot.ts`. A stale comment in `types/recapEdition.ts` was fixed.
- **T4:** `LetterGrade` moved from `utils/reportCardUtils.ts` to new `types/reportCard.ts`. Grade cutoffs, `GRADE_GPA`, `GRADE_WEIGHTS`, `GradeCategory` and `TeamGrades` stay in `reportCardUtils.ts`. Five importers were repointed (hook, recap service, `types/recapEdition.ts`, two tests).
- **T5:** `WeeklyUpset` and `TeamStreakInfo` moved from `services/weeklyRecap/types.ts` to new `types/weeklyRecap.ts`. `RecapMode`, `WeeklyRecapData` and `MIN_STREAK_COUNT` stay. The two names left the `WeeklyRecapService.ts` re-export; three home components, `upsets.ts`, `streaks.ts` and `types/recapEdition.ts` were repointed.
- **T6:** `OpponentRecord`, `TeamOpponentHistory` and `SeasonOpponentData` moved from `MatchHistoryService.ts` to new `types/seasonOpponentHistory.ts` (not `opponentHistory.ts`: `OpponentHistory` already exists in `types/headToHead.ts`). The re-exports in `MatchReadService.ts` and `useSeasonOpponentHistory.ts` were deleted. `utils/exportMatchupsToExcel.ts` no longer imports from a hook.
- **T7:** `ProfileService.updateProfile` now takes its own small input type (`username`, optional `fullName`) instead of `ProfileFormData` from a component. `ProfileFormData` stays `z.infer` in `components/profile/profileSchema.ts`, like the other forms; `ProfileForm.tsx` still passes its data and TypeScript still checks the shape there.
- **Layer edges:** imports from `src/types/**` up into services, utils or components went from 6 to 2. Also gone: service -> component (`ProfileService`), util -> hook (`exportMatchupsToExcel`) and the hook cycle in T2.
- **Stays on purpose (goes to PR B):** `types/index.ts:115` and `types/playoff.ts:5` (both import `utils/playoffs/playoffTypes`), and the `autoSchedule.ts` / `index.ts` `Team` cycle. `types/badges.ts:3` imports generated Supabase types, which is fine.
- **New type files are not in the `types/index.ts` barrel.** Import them by direct path, like `recapEdition.ts` and `seeding.ts`.
- **Checks so far:** after each commit, typecheck, lint on the changed files, knip and the nearby tests passed. The full suite, coverage floors, build comparison and import-graph proof are the QA step.

## Slice 2 PR B result (built 2026-11-12, 8 code commits + 1 docs commit on the same branch)

PR B moves single files to the layer where they belong. The code that runs does not change. Moved text is character-identical (B1, B2, B3 and B8 show R100 in `git diff -M --summary`). No alias re-exports were left behind: every importer, `vi.mock` string and dynamic `import()` was repointed in the same commit.

- **B1:** `utils/queryErrorToast.ts` -> `hooks/queryErrorToast.ts`, with its test. It calls the toast store in `hooks/useToast`.
- **B2:** `utils/charts/chartStyleUtils.ts` -> `hooks/useChartColors.ts`. The whole file moved (`getChartColors`, `ChartColors`, `useChartColors`), not a split. Its test moved to `hooks/__tests__/useChartColors.test.ts`. Three components and five `vi.mock` strings were repointed.
- **B3:** `utils/nativeAuth.ts` -> `services/auth/nativeAuth.ts`, beside `AuthService`. The lazy `import()` in `useAuthMethods.ts` and its `vi.mock` were repointed.
- **B4:** `createDateWithTime` (and its private helper `formatDateForInput`) moved from `components/schedule/form-utils.ts` to `utils/timezone/createDateWithTime.ts`. It is NOT in the `utils/timezone` barrel: tests mock that barrel in part. `form-utils.ts` imports it back.
- **B5:** `utils/autoSchedule/teamLoaderUtils.ts` -> `services/timeslots/teamLoaderUtils.ts`, because it calls `TimeslotService`. Only its three import lines changed. The test moved with it.
- **B6:** deleted the pass-through wrapper `components/playoffs/match-score-editor/MatchScoreEditor.tsx` (same name as the folder `MatchScoreEditor/`). `match-score-editor/index.ts` now points at `./MatchScoreEditor/MatchScoreEditor`.
- **B7:** the `Team` interface moved from `types/index.ts` to new `types/team.ts`. `index.ts` re-exports it by name (`export type { Team } from './team'`): a named export wins over the `Team` in `export * from './playoffTypes'`, and `export *` would give TS2308. `types/autoSchedule.ts` now imports `./team`. The 170 files that import `Team` from `@/types` did not change.
- **B8:** `utils/playoffs/playoffTypes.ts` -> `types/playoffTypes.ts` (pure rename). 35 importers were repointed. **`Team` rule:** the 6 files that import `Team` (the playoff team) from this file use `@/types/playoffTypes`, never the `@/types` barrel. The barrel `Team` is a different interface (20 fields). A mix-up gives a loud type error.
- **Still deferred (current lists):**
  - **PR C (scoring-adjacent):** DONE, see the PR C section below. `fetchBatchHeadToHead` was dropped from PR C: it is already a service, so it has no wrong-direction import.
  - **Needs its own design plan:** `routePrefetch` (14 dynamic page imports; invert it so `App.tsx` supplies the loaders), `adminTabs` (with the 9-file admin cycle), `matchHistoryService` and `compatibilityUtils` (a util that calls a service: inject the service from hooks).
  - **Documented exception, keep:** `hooks/useToast.ts` imports the `ToastProps` type from a shadcn component.
  - The dead-code items in the PR A "Deferred" line (`haveTeamsPlayed`, `rankingUtils/sortAndUpdateRankings.ts`) still stand.
- **Checks so far:** after each commit, typecheck, lint on the changed files, knip and the nearby tests passed (pass counts equal before and after). The full suite, coverage floors, build comparison, import-graph counts and the throwing-mock proof for the repointed `vi.mock` strings are the QA step.

## Slice 2 PR C result (built 2026-11-12, 6 code commits + 1 docs commit on the same branch)

PR C moves the files beside the Career Power Score and head-to-head code into `services/`. Moved text is character-identical (C3, C4 and C5 show R100 per commit in `git diff -M --summary`, but over the whole range git shows 94% for the cache and 98% for the C2 and C4 files, because C1 and C2 edited them first; C2 changes only its import block; C1 moves two statements and adds the word `export`). No scoring number, weight, tie-break or fallback changed. No alias re-exports were left behind: every importer, `vi.mock` string and dynamic `import()` was repointed in the same commit.

- **C0 (test only):** pinned `fetchDivisionWeightsByName` before it moved (it was only ever mocked). +10 tests in `divisionWeightsCache.test.ts` (two of the 10 go beyond the plan: a nameless division is skipped, and `clear` also drops an in-flight by-name fetch). 12 code changes in a throwaway copy each made at least one of them fail. No production file changed.
- **C1:** split `utils/rankingUtils/defaultDivisionWeight.ts` out of the cache (`DEFAULT_DIVISION_WEIGHT` = 0.85 and `getDefaultDivisionWeight()`). The cache keeps all state and fetch code and imports the constant. It is not in the `rankingUtils` barrel. The getter test moved to `defaultDivisionWeight.test.ts`.
- **C2:** `utils/career/calculateCareerPowerScore.ts` -> `services/career/calculateCareerPowerScore.ts` (+ test). The `utils/career` barrel lost that one line and keeps its other 6 functions.
- **C3:** `utils/rankingUtils/divisionWeightsCache.ts` -> `services/divisionWeightsCache.ts` (+ its 2 tests in `services/__tests__/`).
- **C4:** `hooks/career/computeAllTeamsTotals.ts` -> `services/career/computeAllTeamsTotals.ts` (+ test). Four production importers repointed. The stale comment in `weeklyRecap/upsetPrediction.ts` (it said the module lives under `hooks/career/`) was fixed.
- **C5:** `utils/matchUtils/getMatchHeadToHead.ts` -> `services/getMatchHeadToHead.ts` (+ test), beside `HeadToHeadService`. The empty `utils/matchUtils/` folder is gone.
- **Mock strings (measured from the diffs):** 9 existing `vi.mock` strings repointed (6 for the cache in C3, 3 for `computeAllTeamsTotals` in C4), 1 new mock (`calculateCareerPowerScore` in `useTeamTotalsComputed.test.ts`, C2) and 1 now-unused cache mock deleted (`divisionBonusWeight.test.ts`, C1). The plan said "10 + 1 new"; the diff shows 9 repointed + 1 new + 1 deleted. Each repointed string was checked by making its factory throw in a throwaway worktree and seeing the test fail.
- **Import graph (QA, production files):** wrong-direction edges 22 -> 18. The four expected edges are gone (`calculateCareerPowerScore` -> `CareerQueryService`, the cache -> `DivisionService`, `upsetPrediction` -> `computeAllTeamsTotals`, `getMatchHeadToHead` -> `HeadToHeadService`) and none was added. No `services` -> `hooks` edge is left. Import cycles stay at 1 (the 9-file admin cluster).
- **Applied migrations left as written:** `20260225200000_fix-badge-logic.sql`, `20260901120000_career_power_score_match_app.sql` and `20260901173600_d02f40b1-...sql` name the old file paths in comments (including a `COMMENT ON FUNCTION`). They are applied history. No hand-apply is needed. `supabase/tests/career_power_score_parity.sql` changed comment lines only.
- **Docs fixed:** `src/utils/powerScore/README.md` (2 paths), the parity SQL comments (3 lines), and the dead `src/utils/matchUtils` row in `TESTING.md`.
- **Findings for later slices (recorded, NOT fixed in PR C):**
  - **Slice 4 (league constants):** the 0.85 default exists as 3 named constants plus about 8 inline literals: `CareerBulkFetchService.ts:93,143,376,385`, `calculatePlayoffStats.ts:31`, `teamSeasonStats/calculations.ts:117`, `mappers.ts:34`, `fetchSeasonBreakdown.ts:92`. Some use `||` where the cache uses `??` (so a weight of 0 behaves differently). Do not merge them without pinning each one first.
  - **Slice 6 (special cases):** `getMatchHeadToHead` swallows errors and returns null (moved as-is; a known exception to "services throw"). `computeAllTeamsTotals` handles errors per team (drops a failed team, rethrows only if every team fails); that is pinned by its test and unchanged.
  - **Slice 6, stale write after clear:** in `divisionWeightsCache`, a fetch that is still running when `clearDivisionWeightsCache()` runs writes its stale result into the cache afterwards. The by-id fetch does the same. Confirmed in a scratch run in C0; NOT pinned as expected behaviour.
  - **Slice 6, whitespace-only names:** a division name that is only spaces is stored under the key `''` (not pinned).
  - **Slice 6, cache keys:** `useDivisionMutations.ts` invalidates `['divisions']`, but predictions and career rankings cache under `['divisionWeights']`. After an admin weight edit they can show the old weights for up to 10 minutes. Pre-existing.
  - **Slice 8 (tests):** `computeAllTeamsTotals` bonus wiring is not asserted end to end. `useTeamTotalsComputed.test.ts` never asserts the score. `useCareerRankings` sort order is untested. `useBatchMatchForm.test.ts` never checks the mocked date. `Navbar.test.tsx` mocks a missing file, `@/hooks/useSeasonalThemeBase`. The career and admin tests pass with a different default constant: they do not check the 0.85 fallback.
- **Still deferred (current lists):**
  - **Needs its own design plan:** `routePrefetch` (14 dynamic page imports; invert it so `App.tsx` supplies the loaders), `adminTabs` (with the 9-file admin cycle), `matchHistoryService` and `compatibilityUtils` (a util that calls a service: inject the service from hooks).
  - **Documented exception, keep:** `hooks/useToast.ts` imports the `ToastProps` type from a shadcn component.
  - The dead-code items in the PR A "Deferred" line (`haveTeamsPlayed`, `rankingUtils/sortAndUpdateRankings.ts`) still stand.
- **Checks (QA, PARTIAL only for the two items below, no code defect):** typecheck, lint and knip exit 0; full suite 852 -> 853 files and 7,834 -> 7,844 tests (+10 from C0; the getter test moved, none lost); coverage floors hold and no surviving file lost coverage (the cache rose from 36/52 to 50/50 lines); CSS byte-identical; built JS differs only in 2 of 2,471 modules (the inlined 0.85 constant and an export alias letter); full e2e 58 passed; all 10 changed mock sites intercept (a throwing factory fails each test); one pinned fixture (53.43) recomputed by hand; a 600-case scorer run gives byte-identical output at baseline and HEAD.
  - **`factory integrity` flags one false positive on the full range:** `src/utils/rankingUtils/__tests__/divisionWeightsCache.test.ts: 7 fewer assertions`. Git sees that file as deleted and the one in `src/services/__tests__/` as created (C0 grew it, so the whole-range rename match falls under 50%), so the old file's 7 `expect` lines count as removed. Across the whole range `expect`/`assert` lines are -7 / +29 (net +22). Each commit scanned on its own is clean except C1 (one moved getter case that nets out). Only Doug can waive the finding; the tool is not part of CI.
  - **Tidy-up for Slice 8:** the dead `getDefaultDivisionWeight` key stays in 4 cache-mock factories (`buildCareerWeightPreview.test.ts`, `buildPowerMigrationComparison.test.ts`, `services/career/__tests__/computeAllTeamsTotals.test.ts`, `services/career/__tests__/calculateCareerPowerScore.test.ts`). It is harmless. `useCareerRankings.test.ts` still passes with a stale mock path because it mocks `useQuery` and has no value check.
  - **Possible league question (Slice 4):** the cache keeps a division weight of 0 (`??`), while the career fetch services turn 0 into 0.85 (`||`). Unknown whether the admin screen allows a weight of 0.

## Slice 3 PR 3A result (built 2026-11-12, 1 config commit + 1 docs commit)

3A makes the "no Supabase client in hooks" lint rule real and writes it down. Config and docs only: **no file under `src/` changed**, so nothing a player or admin sees can change. No database or migration change.

- **The hole (found by reading `eslint.config.js`):** the ban on the Supabase client was switched off for every file in `src/hooks/**`. A hook that called `supabase.from(...)` passed lint. Nothing was broken: the 12 production hooks that import the client only call `.channel()` or `.removeChannel()` (checked by grep).
- **3A-1, allow-list by file (commit 228de1b):** the folder glob `src/hooks/**/*.{ts,tsx}` is gone. The ban is off for 12 named hook files only: `useBracketsManagerRealtime`, `useContactRequests`, `useLiveMatchRealtime`, `useMatchComments`, `useMatchReactions`, `useMessageReactions`, `useMessageRealtime`, `useNotificationsRealtime`, `subscribeWithRetry`, `useSupportTickets`, `useBracketCompletion`, `useOpsHealth` (full paths in `eslint.config.js`). A new realtime hook must be added to that list: lint fails at once if it is not. The other exceptions are unchanged (`src/services/**`, `src/utils/imageUpload.ts`, `src/lib/mcp/**`, `src/pages/OAuthConsent.tsx`, test files).
- **3A-1, two side doors closed:** (1) the ban used `paths`, which matched only the exact string `@/integrations/supabase/client`; a relative import (`../integrations/supabase/client`) passed. It now uses `patterns` with `**/integrations/supabase/client`, same `importNames: ['supabase']` (so `src/main.tsx`, which imports `isSupabaseConfigured`, still passes) and the same message. (2) Two `no-restricted-syntax` selectors now block dynamic `import('...supabase/client')` and `require('...supabase/client')`. No such call existed anywhere.
- **3A-1, comments fixed:** the two comments that described the exception list wrongly now say the hooks are listed by file.
- **3A-2, docs:** `CLAUDE.md` Architecture Rules lists the real exceptions; `ARCHITECTURE.md` has a new "Layer rules" section (direction, what lint enforces today versus convention, the exception list, `src/lib/mcp/**` exempt). This log was updated.
- **Probe results:** the table below. Throwaway worktrees, probe files named `zzProbe*` (deleted with the worktrees), baseline = 1d6f4f4.

| Probe | Baseline | After 3A-1 |
|---|---|---|
| (a) unlisted hook, `@/` import of the client | PASS (hole) | FAIL, once |
| (b) unlisted hook, relative import | PASS (hole) | FAIL, once |
| (c) new file in `src/hooks/realtime/` | PASS (hole) | FAIL |
| (d) unlisted hook, `await import('@/integrations/supabase/client')` | PASS (hole) | FAIL (new selector) |
| (e) component, `@/` import | FAIL | FAIL |
| (f) hook, `import * as sb from` the client | PASS (hole) | FAIL |
| (g) hook, `export { supabase } from` the client | PASS (hole) | FAIL |
| (h) hook, `require('@/integrations/supabase/client')` | FAIL (only `no-require-imports`, a different rule) | FAIL (also the new selector) |
| the 12 listed hooks, `OAuthConsent.tsx`, `imageUpload.ts`, `main.tsx`, `DivisionService.ts`, a hook test that mocks the client, `tests/bracketManagerSchema.test.ts` | PASS | PASS |

- **Probe summary:** with the 12 file names deleted from the config, the 12 hooks all fail: the list is what lets them pass. Each failure is reported once. Whole-repo `npm run lint`: exit 0 before and after (86.7 s before, 85.4 s after). Typecheck and knip: exit 0.
- **Not changed on purpose:** services keep full access to the client; `src/lib/mcp/**` stays exempt (own `createClient` clients, not the app client).
- **Slice 3 plan (the rest of the approved list; each PR gets its own short plan and approval):**
  - **3B:** layer-direction lint rule (utils and types must not import services, hooks, components or pages; services must not import hooks or components; hooks must not import components). The 18 wrong-direction edges that remain go on a short, commented exception list that shrinks over time: `routePrefetch` x14, `adminTabs`, `matchHistoryService`, `compatibilityUtils`, and the `useToast` type import. It must merge with the Supabase ban in `eslint.config.js`: a later config block replaces an earlier block's setting for the same rule.
  - **3C:** expose the `BracketAdmin` index helpers (`simulateRearrange` and 6 type imports used by 3 dialogs, `RearrangeBoard.tsx` and `dropLogic.ts`). Types and one pure function.
  - **3D:** hero-card reads into hooks (`TargetSelector`, `ChampionsEditor`, `ChampionsHeroCard`). **3E:** auth pages (`ForgotPassword`, `ResetPassword`). **3F:** `ProfileForm` and `TeamEditSection`. **3G:** playoff reads (`FinalStandings`, `BracketDetail`, `BracketAdminToolbar`; query keys unchanged).
  - **3H-3J:** the league-night write paths: `SeedingUpdateDialog`, `BracketCreationDialog` and the `MassScoreEntryTool` delete. **Ask Doug again before starting these.** A components-to-hooks lint rule comes only after 3D-3G land.
  - **Count correction:** the real number of components and pages that call a service with their own query or mutation is **13 files**. The earlier "~29" also counted 10 colocated hook files (allowed) and 6 pure-helper and constant files. None of the 13 can be fixed by repointing to an existing hook: each needs a new hook, so 3D-3J change code, not only paths.

## Carry-over notes for later slices

- **DONE 2026-11-11 (commit 0db935f): `updated_at` on legacy playoff writes.** `uncoveredPlayoffHooks.test.tsx` now checks the ISO `updated_at` that `usePlayoffMatchUpdate.ts:170` stamps. Mutation-checked (deleting the line fails the test). `updatePlayoffMatchResult` can now be removed whenever a later slice wants.
- **DONE 2026-11-11 (commit ed9e86b): `sos || 0.5` fallback** (`hooks/useTeamRankings.ts:88`, display only). Two cases in `useTeamRankings.test.ts`: a missing SOS reads 0.5; a real 0.62 stays 0.62. Mutation-checked. A SOS of exactly 0 is not tested on purpose (league rules hold SOS between 0.1 and 1.0).
- **DONE 2026-11-11 (commits 210c8a6, a69d29d): head-to-head counts.** New `supabase/tests/head_to_head_records.sql` covers `get_head_to_head_records` (view `v_head_to_head`, used by `HeadToHeadService`) and `get_batch_head_to_head` (used by `TeamCareerStatsService` / schedule page). Pins: matches + playoffs + archive all count; tied and unfinished regular-season/archive matches do not; mirrored rows; (B,C) zero row; self pair dropped. QA recomputed every number by hand and mutation-checked the view and the batch function (archive, playoff and `iscompleted` branches, game-win sides, tie handling). Ran on Postgres 16.15 only: CI uses 15 (see open items below).
- **OPEN (Slice 5, found while writing the head-to-head test):**
  - **Weekly recap can inflate head-to-head counts.** `get_batch_head_to_head` squares its counts when the same ordered pair is listed twice (twice = x4, three times = x9). `useBatchHeadToHead` removes duplicate pairs first, so the schedule page is safe. `weeklyRecap/upsets.ts` (~line 125) builds `pairs` from the week's completed matches with NO de-duplication and passes them to `fetchUpsetPredictionInputs` -> `fetchBatchHeadToHead`. It matters only if one week holds two matches between the same teams in the same order. Recommended fix: de-duplicate `pairs` in `upsets.ts` (no migration). Needs a test first.
  - **The two functions disagree on one edge case.** A completed match with a winner but a NULL `loser_id` is dropped by the view (`get_head_to_head_records`) and counted by the batch function. Not pinned (looks accidental). Check production data before deciding.
  - **Playoff status is not filtered by either function.** A playoff match with a winner and loser set counts even if its status is `in_progress`. Described in the test header, not pinned.
  - **Postgres 15 vs 16.** CI runs Postgres 15; the new test ran only on 16. The view returns `numeric` game wins (playoff scores are numeric) while `get_head_to_head_records` declares `bigint`. Postgres 16 casts silently; 15 is expected to as well (the function already exists in the migrations CI applies on 15). If the first CI run fails on this function with "return type mismatch", that is a real bug that needs a migration, not a test change.
- **CI fix, Deno edge-function tests (2026-11-11, PR 1736):** the job `Edge function Deno tests` failed at random with `Integrity check failed` for `esm.sh/tslib@2.8.1` and `esm.sh/zod@3.23.8`. Cause: `esm.sh` rebuilt its files (origin `last-modified` 2026-10-21; some CDN edges still hold Nov 2025 copies), so the same unpinned URL returns old or new bytes depending on the edge, and `deno.lock` can only hold one hash. The two versions differ only by redundant parentheses (cosmetic). Fixes made: `deno.lock` refreshed to the origin hashes (commit 6ba80be; all 63 entries re-verified), and `--no-lock` added to the CI test command in `.github/workflows/supabase-ci.yml` (Doug approved "fix properly in CI"). Reproduced locally with Deno 2.9.6: lock enforced fails with the CI error, `--no-lock` gives 148 passed. The stale workflow comment that said "no deno.lock is committed" was corrected.
  - **Left open (production hardening, not done):** edge functions import from `esm.sh` unpinned (`zod@3.23.8`, `@anthropic-ai/sdk@0.71.0`, and `@supabase/supabase-js@2`, a floating major version). A deploy therefore bundles whatever `esm.sh` serves that day. Pinning exact versions plus a build version (`?pin=v135`) would make deploys repeatable, but it changes what production runs (the repo test lock resolves `supabase-js` to 2.112.4; production may differ), needs a hand-deployed test, and I cannot deploy from here. Do this as its own change with a deploy plan.
  - `deno.lock` is now unused in CI (auto-found only because `package.json` sits next to it). Decide later whether to keep or delete it.
  - Not code problems, seen the same day: GitHub runner could not resolve Ubuntu mirror names during `playwright install --with-deps` (browser check); Cloudflare Workers Build failed on a corrupted `npm` cache (`ENOENT .../_cacache/...`); retry or clear the build cache.
- **Playoff match tie:** live code gives team 2 the win when game wins are tied (`usePlayoffMatchUpdate.ts:154`, `useOptimisticScoreMutation.ts:250`). The screens cannot reach it (quick editor offers 2-0, 2-1, 1-2, 0-2). No test pins it. Ask Doug only if a different rule is wanted.
- **Stale comments to remove in Slice 7** (they name deleted callers): `TimeslotQueryService.ts:44,103`, `BracketInfoService.ts:91`, `BracketMatchReadService.ts:12`, `MatchHistoryService.ts:105`, `src/docs/FOLDER_CONVENTIONS.md:76`. The functions they describe may now have no production caller: check with `knip --production`.
- Unused mock stub `mocks.bracket` in `uncoveredPlayoffHooks.test.tsx` (lines ~7, 26): remove in Slice 8.
- `dark:bg-slate-800` left the built CSS (only the deleted `AnimatedRankNumber` used it). The same string sits in an old `hero_cards` seed migration; `ChampionsHeroCard` never reads it, so nothing shows. Re-check in Slice 9 if hero colours ever render from the database.
- `coverage-baseline.txt` still lists deleted files; it is a generated snapshot (refresh with `npm run test:coverage:refresh-docs` in Slice 8/9).
- `src/utils/powerScore/README.md:131-136` says nothing can move a finished season; `LEAGUE_CONTEXT.md:40` and README line ~255 say a weight save recomputes archived seasons too. Existing doc conflict: fix the README in Slice 5 (Doug already confirmed the LEAGUE_CONTEXT version).
- `CLAUDE.md` still says ~450 test files / ~3.2k tests; real: 852 / 7,832. Fix in Slice 9.

## Later slices (see the approved plan)

2 import direction, shims, name twins (done: PR A, T, B, C; the leftovers move to the 3B exception list) - 3 layer rule (PR 3A done; 3B-3J planned in the 3A section above) -
4 league constants - 5 scoring-adjacent copies (pin first) - 6 special cases - 7 comments - 8 tests - 9 re-scan and delete this file.
Also pending from Slice 1: ~60 dead exports that only tests use, `rankingUtils/sortAndUpdateRankings.ts` (its sibling barrel `index.ts` went in Slice 2 PR A), `GameRules.hardCap`, the `matchesCreated` listener, unused config keys (`enableAuditLog`, `sessionTimeout` in `src/config/admin.ts`; unused tiers in `src/config/cache.ts`).
