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
- **Proof of no behaviour change:** 852 test files, 7,834 tests pass (same as before); per-file pass counts equal for every touched test; coverage totals identical (lines 89.01, statements 87.48, functions 87.58, branches 78.18) and no surviving file lost coverage (the 12 shims had 0/0 lines; the two moved files kept 47/47 and 15/15 lines); built CSS byte-identical (0 classes removed or added); total built JS bytes identical (309 files, 5,010,974 bytes); size limits unchanged (main 78.24 kB gzip).
- **Import graph (throwaway script, production files only):** wrong-direction edges 35 -> 35 and import cycles 3 -> 3 with the same members (the 9-file `adminTabs` / admin-section cluster, `types/index` with `types/autoSchedule`, `transformBracketData` with `useBracketData`). PR A fixes no layer edge on purpose; the `useAuth` shim removal did not create a cycle.
- **Kept on purpose:** `TeamSeasonStatsService`, `CareerService`, `TeamFetchService` (7 production importers, 11 test mocks), `MatchReadService`, `SeasonService`, folder `index.ts` entries, `SupabaseSqlStorage.ts`, `rankingUtils/sortAndUpdateRankings.ts` with its test, and both `useUpdateTeam` and `useTeamMutations` (not duplicates: merging would double-toast; only their service import changed).
- **Left as written (dated snapshots):** `docs/product-description/bug-triage.md` (names `rankingUtils.ts`, `colors.ts`), `docs/audits/CODE-QUALITY-AUDIT-2026-04-24.md`, `docs/quality-review-2026-07/briefs/PR-04-*.md`. `SCHEDULER_README.md` test commands still work (the two test files keep their names).
- **Deferred from Slice 2 (need design, not a move):** `routePrefetch` (14 dynamic page imports from `utils`), `adminTabs` (lazy-only cycle with the admin sections), `matchHistoryService` (a util that acts as a service and swallows errors: Slice 6), the `useToast` type import from a shadcn component (keep as a documented exception), dead `haveTeamsPlayed`, and the dead `rankingUtils/sortAndUpdateRankings.ts` wrapper with its test. When that wrapper is deleted, first move its two unique cases ("empty array", "division tier after rounding") into `rankingUtils/__tests__/index.test.ts`.
- **Still to do in Slice 2:** PR T (type homes: `ProfileFormData`, `TrendBasis`, `WeeklyUpset` / `TeamStreakInfo`, `LetterGrade`, `SeasonOpponentData`; delete `phase3.ts`; break the `useBracketData` type cycle), PR B (`queryErrorToast`, `nativeAuth`, `useChartColors`, `createDateWithTime`, `teamLoaderUtils`, the `MatchScoreEditor` wrapper; maybe `playoffTypes` and the `Team` type cycle), PR C (`divisionWeightsCache`, `calculateCareerPowerScore`, `computeAllTeamsTotals`, `getMatchHeadToHead`, `fetchBatchHeadToHead`).

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
- **Stale comments to remove in Slice 7** (they name deleted callers): `TimeslotQueryService.ts:44,103`, `BracketInfoService.ts:91`, `BracketMatchReadService.ts:12`, `MatchHistoryService.ts:100`, `src/docs/FOLDER_CONVENTIONS.md:76`. The functions they describe may now have no production caller: check with `knip --production`.
- Unused mock stub `mocks.bracket` in `uncoveredPlayoffHooks.test.tsx` (lines ~7, 26): remove in Slice 8.
- `dark:bg-slate-800` left the built CSS (only the deleted `AnimatedRankNumber` used it). The same string sits in an old `hero_cards` seed migration; `ChampionsHeroCard` never reads it, so nothing shows. Re-check in Slice 9 if hero colours ever render from the database.
- `coverage-baseline.txt` still lists deleted files; it is a generated snapshot (refresh with `npm run test:coverage:refresh-docs` in Slice 8/9).
- `src/utils/powerScore/README.md:131-136` says nothing can move a finished season; `LEAGUE_CONTEXT.md:40` and README line ~255 say a weight save recomputes archived seasons too. Existing doc conflict: fix the README in Slice 5 (Doug already confirmed the LEAGUE_CONTEXT version).
- `CLAUDE.md` still says ~450 test files / ~3.2k tests; real: 852 / 7,832. Fix in Slice 9.

## Later slices (see the approved plan)

2 import direction, shims, name twins - 3 layer rule - 4 league constants - 5 scoring-adjacent copies (pin first) -
6 special cases - 7 comments - 8 tests - 9 re-scan and delete this file.
Also pending from Slice 1: ~60 dead exports that only tests use, `rankingUtils/sortAndUpdateRankings.ts` (its sibling barrel `index.ts` went in Slice 2 PR A), `GameRules.hardCap`, the `matchesCreated` listener, unused config keys (`enableAuditLog`, `sessionTimeout` in `src/config/admin.ts`; unused tiers in `src/config/cache.ts`).
