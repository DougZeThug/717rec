# Testing

This file describes what's tested in 717rec, the coverage targets we're aiming
for, and what's intentionally left out. It is meant to be skimmable — not a
full testing guide.

## How to run tests

```bash
npm test              # run the full suite once
npm run test:watch    # re-run on file changes (while you're coding)
npm run test:coverage # run once and produce a coverage report
```

After `test:coverage`, open `coverage/index.html` in a browser to see
per-file percentages with line-by-line highlighting.

## Current baseline

Last measured: 2026-04-22 (200 test files, all passing).

| Metric     | Covered |
| ---------- | ------- |
| Lines      | 31.22%  |
| Statements | 30.93%  |
| Functions  | 24.25%  |
| Branches   | 23.12%  |

The overall number is low because most React components and UI pages are not
yet under test. The logic-heavy areas (utils, scheduling, rankings, career
math) are in much better shape — see the per-area table below.

Full baseline output is saved to `coverage-baseline.txt` at the repo root.

## Coverage threshold policy (enforced)

Vitest coverage thresholds are now enforced in CI and locally via
`npm run test:coverage`.

### Stage 1 (active now): no regression at the global level

Global thresholds in `vitest.config.ts` are pinned to the current baseline:

- Lines: **27.27%**
- Statements: **26.96%**
- Functions: **21.12%**
- Branches: **19.98%**

If a PR drops any global metric below those numbers, the coverage job fails.

### Stage 1 (active now): conservative folder thresholds

To start building area-level enforcement without blocking normal work, these
initial floor values are intentionally conservative:

- `src/services/**`: 45% lines / 45% statements / 40% functions / 35% branches
- `src/hooks/**`: 15% lines / 15% statements / 15% functions / 12% branches
- `src/utils/**`: 50% lines / 50% statements / 45% functions / 40% branches

These values are below current measured coverage for those areas and are meant
as a floor, not a final target.

### Stage 2 (next): tighten by domain

We will increment thresholds over time, focusing on:

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

To keep this baseline consistent across updates, run coverage from the repo
root in a normal dev environment and capture the full terminal output:

```bash
npm run test:coverage | tee coverage-baseline.txt
```

Then copy the summary values from that run into this section (date, test file
count, top-level metrics, and area table).

## Coverage by area

Line coverage snapshot by folder. Targets are what we want each area to reach
over time; anything already above target is just "keep it green".

| Area                               | Lines today | Target | Notes                                        |
| ---------------------------------- | ----------- | ------ | -------------------------------------------- |
| `src/services/**`                  | 56%         | 70%    | Data access layer — trending up              |
| `src/services/auth`                | 100%        | 70%    | On target                                    |
| `src/hooks/**`                     | 22%         | 60%    | React Query hooks wrapping services          |
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

DeepSource reporting should invoke the same lightweight coverage command first so
its uploaded artifact matches CI behavior (`npm run test:coverage:ci`).

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
