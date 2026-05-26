# Testing

This file describes what's tested in 717rec, the coverage targets we're aiming
for, and what's intentionally left out. It is meant to be skimmable — not a
full testing guide.

## How to run tests

```bash
npm test              # run the full suite once
npm run test:file -- <path>  # run a single test file (agent-safe; injects node_modules/.bin into PATH)
npm run test:watch    # re-run on file changes (while you're coding)
npm run test:coverage # fast gate: parallel forked workers + lightweight reporters (text + json-summary)
npm run test:coverage:serial # slow single-worker fallback for diagnosing flaky parallel coverage runs
npm run test:coverage:full # deep local diagnostics: includes HTML artifact at coverage/index.html
npm run test:coverage:refresh-docs # run coverage and auto-sync baseline metrics in this doc
npm run test:coverage:ci # PR gate: fast parallel threshold enforcement (10m timeout)
npm run test:coverage:deepsource # DeepSource artifact: LCOV @ coverage/deepsource/lcov.info (15m timeout)
npm run test:coverage:debug # serial + verbose coverage diagnostics (15m timeout)
npm run test:coverage:triage # bounded verbose coverage run with timestamped triage log
```

Single source of truth: script values in `package.json` are authoritative; this document should mirror those exact script definitions.

After `test:coverage:full`, open `coverage/index.html` in a browser to see
per-file percentages with line-by-line highlighting.


## Coverage troubleshooting (hangs/timeouts)

If coverage appears to hang in CI/Codex, start with the dedicated triage command first:

```bash
npm run test:coverage:triage
```

This command runs a bounded verbose coverage pass and writes a timestamped log to `logs/coverage-triage/coverage-triage-<UTC timestamp>.log`.

After triage logging, use this quick follow-up sequence as needed:

```bash
timeout 10m npm run test:coverage
timeout 10m npm test
timeout 10m env CI=true npx vitest run --coverage --reporter=verbose
timeout 10m env CI=true npx vitest run --coverage --maxWorkers=1
```

Interpretation:

- If `npm test` passes but coverage times out, the issue is coverage-only.
- Use `--reporter=verbose` to see the last completed suite before the stall.
- The default `test:coverage` runs in fast parallel mode (`VITEST_FAST_COVERAGE=1` → forked workers). If parallelism appears unstable, fall back to `npm run test:coverage:serial` to confirm before changing CI defaults.

## Troubleshooting agent shells (Codex / Claude Code)

If you see either of these errors when an AI agent tries to run a single test file:

- `sh: 1: vitest: not found` — the shell doesn't have `node_modules/.bin` on `PATH`.
- `pnpm: command not found` / "toolchain path issue" — this repo uses **npm**, not pnpm.

Use one of these instead (all reliably resolve the local vitest binary):

```bash
npm run test:file -- src/components/foo/__tests__/Foo.test.tsx
npx vitest run src/components/foo/__tests__/Foo.test.tsx
./node_modules/.bin/vitest run src/components/foo/__tests__/Foo.test.tsx
```

Do not use `pnpm` or `yarn` — neither is installed.

## Current baseline

Last measured: 2026-05-26.

| Metric     | Covered |
| ---------- | ------- |
| Lines      | 43.34%  |
| Statements | 42.59%  |
| Functions  | 35.25%  |
| Branches   | 34.04%  |

The overall number is low because most React components and UI pages are not
yet under test. The logic-heavy areas (utils, scheduling, rankings, career
math) are in much better shape — see the per-area table below.

Full baseline output is saved to `coverage-baseline.txt` at the repo root.

## Coverage threshold policy (enforced)

Vitest coverage thresholds are now enforced in CI and locally via
`npm run test:coverage` (fast gate) or `npm run test:coverage:full` (deep local diagnostics).

### Stage 2 (active now): no regression at the global level

Global thresholds in `vitest.config.ts` are pinned a few points below the
current baseline:

- Lines: **40%**
- Statements: **39%**
- Functions: **32%**
- Branches: **31%**

If a PR drops any global metric below those numbers, the coverage job fails.

### Stage 2 (active now): folder thresholds

These floors sit a few points below current measured coverage for each area, so
they catch regressions without blocking normal work:

- `src/services/**`: 70% lines / 68% statements / 68% functions / 55% branches
- `src/hooks/**`: 33% lines / 32% statements / 27% functions / 24% branches
- `src/utils/**`: 64% lines / 63% statements / 62% functions / 52% branches

These values are below current measured coverage for those areas and are meant
as a floor, not a final target.

### Stage 2 ratchet history

- **2026-05-26**: First Stage-2 ratchet. Global gates raised from
  27.27/26.96/21.12/19.98 to 40/39/32/31; folder floors raised for services
  (45→70 lines), hooks (15→33 lines), and utils (50→64 lines). Added a
  regression suite for the playoff bracket-seeding algorithm
  (`src/services/__tests__/bracket-creator.test.ts`). The other named domains
  (scheduling, timeslots, blind draw) were already covered by existing suites.

### Stage 3 (next): tighten by domain

We will keep incrementing thresholds over time, focusing on:

1. `src/services/**`
2. `src/hooks/**`
3. key util domains (ranking, career, predictions, playoffs, scheduling)

Each threshold increase should happen in a dedicated PR with rationale in the
description and an updated table in this file.

### Ownership expectations

- **PR author**: keep coverage at or above thresholds for touched code.
- **Area owners/reviewers**: ratchet thresholds upward when an area improves and
  stays stable.
- **Maintainers**: keep `vitest.config.ts` thresholds and this policy in sync.
- **Everyone**: never lower thresholds just to merge unrelated work. If a drop is
  unavoidable (e.g., broad refactor), call it out explicitly in the PR and
  restore in follow-up work.

### Baseline generation note

To keep this baseline consistent across updates, run a single command from the
repo root:

```bash
npm run test:coverage:refresh-docs
```

This command runs coverage, reads `coverage/coverage-summary.json`, and
automatically updates the `## Current baseline` date + top-level metric rows in
this file.

## Coverage by area

Line coverage snapshot by folder. Targets are what we want each area to reach
over time; anything already above target is just "keep it green".

| Area                               | Lines today | Target | Notes                                        |
| ---------------------------------- | ----------- | ------ | -------------------------------------------- |
| `src/services/**`                  | 74%         | 70%    | Data access layer — on target                |
| `src/services/auth`                | 100%        | 70%    | On target                                    |
| `src/hooks/**`                     | 37%         | 60%    | React Query hooks wrapping services          |
| `src/hooks/matches`                | 21%         | 60%    | Coverage spread across many small hooks      |
| `src/utils/**` (aggregate)         | 69%         | 85%    | Strong gains from logic-heavy utility tests  |
| `src/utils/career`                 | 89%         | 85%    | On target                                    |
| `src/utils/rankingUtils`           | 96%         | 85%    | On target                                    |
| `src/utils/predictions`            | 95%         | 85%    | On target                                    |
| `src/utils/playoffs`               | 100%        | 85%    | On target                                    |
| `src/utils/matchUtils`             | 100%        | 85%    | On target                                    |
| `src/utils/brackets/mappers`       | 100%        | 85%    | On target                                    |
| `src/utils/brackets/validators`    | 100%        | 85%    | On target                                    |
| `src/utils/auth`                   | 90%         | 85%    | On target                                    |
| `src/utils/autoSchedule`           | 77%         | 85%    | Complex scheduling algorithms — gradual      |
| `src/utils/autoSchedule/dualBlock` | 89%         | 85%    | On target                                    |
| `src/utils/scheduling/greedy`      | 71%         | 85%    | `swapRepair` improved but still below target |
| `src/utils/colors`                 | 89%         | 60%    | On target                                    |
| `src/utils/timezone`               | 87%         | 60%    | On target                                    |
| `src/utils/teamDetailsUtils`       | 73%         | 60%    | On target                                    |
| `src/utils/teamStatsUtils`         | 100%        | 60%    | On target                                    |
| `src/pages/**`                     | 33%         | 40%    | Mostly integration-style tests               |
| `src/components/**` (non-UI)       | 10%         | 40%    | Component coverage is still lowest priority  |
| `src/types`                        | 77%         | —      | Types only — no target                       |

## What's tested today

**Services:** `ProfileService`, `HeadToHeadService`, `TeamFetchService`,
`TeamCreateService`, `TeamUpdateService`, `MatchReadService`,
`MatchWriteService`, `RankingCareerService`, `RankingPersistenceService`,
`RankingCurrentService`, `RankingTrendsService`.

**Hooks:** `usePendingMatches`, `useTeamScheduleLoader`, `usePairingGenerator`,
match-submission and team-record-update hooks, match query-cache utilities,
team-stats util.

**Utils:** ranking calculations (SOS, head-to-head, streaks, win %, power
score), career stats (match stats, playoff stats, sweep rate, clutch rate,
narratives, career SOS), predictions, playoffs, match utilities, bracket
validators/mappers, error handler, auto-schedule (blossom algorithm,
dual-block pairing, validation, edge cases), greedy scheduler (feasibility,
constraints, rematch repair), `sanitizeReturnTo`.

**Components / pages (sampled):** Playoff bracket form (many sub-pieces),
mass-score-entry, batch-matches auto-schedule warnings, history page,
`ProtectedAdminRoute`, `AdminDashboard`, `Auth` page.

**Season workflow:** `SeasonService` (incl. `partial_archive`, `finalize_playoffs`,
`activate_season_with_partial_archive`, `fetchPlayoffActiveSeason`),
`useSeasonMutations` (cache invalidation + error surfacing for the new RPCs),
`SeasonActivationDialog` (the "keep playoffs active" branch),
`SeasonFinalizePlayoffsDialog` (confirm / cancel / error paths).

See `__tests__/` folders next to the source for unit tests and the root
`tests/` folder for integration tests.

## What's intentionally excluded

Configured in `vitest.config.ts` under `test.coverage.exclude`:

- `src/components/ui/**` — shadcn/Radix UI primitives; tested upstream
- `src/integrations/supabase/types.ts` — auto-generated, do not edit
- Test files themselves (`*.test.ts(x)`, `*.spec.ts(x)`)
- `src/setupTests.ts` — test harness, not shipped code

## Raising coverage — rules of thumb

- **Prefer unit tests** for pure functions in `src/utils/**`. They're cheap
  and fast.
- **Services** should be mocked at the Supabase-client boundary. The
  "Service Template" in `CLAUDE.md` shows the shape.
- **Hooks**: use `@testing-library/react` with a wrapped TanStack Query
  client.
- **Components**: only cover non-trivial behavior — don't test that a button
  renders text.
- When adding a new service or util function, add its test in the same PR.

## CI enforcement

Coverage enforcement runs on pull requests via
`.github/workflows/coverage-threshold.yml`, which executes:

```bash
npm run test:coverage:ci
```

Because Vitest thresholds are configured in `vitest.config.ts`, that workflow
fails automatically when any enforced global or folder threshold regresses.

DeepSource reporting should invoke its dedicated lightweight command:

```bash
npm run test:coverage:deepsource
```

This command enforces a hard runtime cap (`timeout 15m`) and emits the exact
artifact DeepSource expects in this repo: LCOV at
`coverage/deepsource/lcov.info`.

Use `npm run test:coverage` for fast local/CI gating and
`npm run test:coverage:full` for deep local diagnostics with HTML output.

## Manual checks: overlapping seasons

The three new Postgres RPCs and the `ensure_single_playoffs_active_season`
trigger run inside the database and aren't covered by the JS test suite. After
any change touching `supabase/migrations/*playoffs_active*` or the SeasonService
RPC wrappers, run this 4-step smoke check in a staging environment:

1. **Plain activation**: activate a season normally (checkbox unchecked). Old
   season flips to `is_active=false`; new season flips to `is_active=true`. No
   `playoffs_active` flags should be set.
2. **Activate with partial archive**: activate a new season with the "Keep
   playoffs active" checkbox **checked**. Old season:
   `is_active=false, playoffs_active=true`; its completed regular-season
   matches move to `matches_archive`; team win/loss counters reset.
3. **Trigger guard**: in SQL, manually try
   `UPDATE seasons SET playoffs_active = true WHERE id = '<some other season>';`
   while another season already has `playoffs_active=true`. The trigger should
   flip the previous season's flag to `false` so only one row is true.
4. **Finalize playoffs**: from Season Management, click "Finalize Playoffs" on
   the partial-archived season. It should flip to
   `is_active=false, is_archived=true, playoffs_active=false`, snapshot team
   details, and award champion badges in the relevant divisions.
