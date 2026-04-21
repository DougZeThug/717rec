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

Last measured: 2026-04-17 (86 test files, all passing).

| Metric     | Covered |
| ---------- | ------- |
| Lines      | 16.67%  |
| Statements | 16.29%  |
| Functions  | 12.06%  |
| Branches   | 11.81%  |

The overall number is low because most React components and UI pages are not
yet under test. The logic-heavy areas (utils, scheduling, rankings, career
math) are in much better shape — see the per-area table below.

Full baseline output is saved to `coverage-baseline.txt` at the repo root.

## Coverage by area

Line coverage snapshot by folder. Targets are what we want each area to reach
over time; anything already above target is just "keep it green".

| Area                              | Lines today | Target | Notes                                       |
| --------------------------------- | ----------- | ------ | ------------------------------------------- |
| `src/services/**`                 | 9%          | 70%    | Data access layer — priority to raise       |
| `src/services/auth`               | 30%         | 70%    |                                             |
| `src/hooks/**`                    | 5%          | 60%    | React Query hooks wrapping services         |
| `src/hooks/matches`               | 24%         | 60%    | Best-covered hooks area today               |
| `src/utils/**` (aggregate)        | 15%         | 85%    | Pure functions — easiest wins               |
| `src/utils/career`                | 87%         | 85%    | On target                                   |
| `src/utils/rankingUtils`          | 95%         | 85%    | On target                                   |
| `src/utils/predictions`           | 96%         | 85%    | On target                                   |
| `src/utils/playoffs`              | 100%        | 85%    | On target                                   |
| `src/utils/matchUtils`            | 100%        | 85%    | On target                                   |
| `src/utils/brackets/mappers`      | 100%        | 85%    | On target                                   |
| `src/utils/brackets/validators`   | 100%        | 85%    | On target                                   |
| `src/utils/auth`                  | 69%         | 85%    | Close                                       |
| `src/utils/autoSchedule`          | 56%         | 85%    | Complex scheduling algorithms — gradual     |
| `src/utils/autoSchedule/dualBlock`| 88%         | 85%    | On target                                   |
| `src/utils/scheduling/greedy`     | 62%         | 85%    | Several sub-modules still at 0%             |
| `src/utils/colors`                | 4%          | 60%    | Small pure helpers — easy to raise          |
| `src/utils/timezone`              | 7%          | 60%    | Important for match scheduling correctness  |
| `src/utils/teamDetailsUtils`      | 0%          | 60%    |                                             |
| `src/utils/teamStatsUtils`        | 0%          | 60%    |                                             |
| `src/pages/**`                    | 9%          | 40%    | Mostly integration-style tests              |
| `src/components/**` (non-UI)      | near 0%     | 40%    | Component coverage is lowest priority       |
| `src/types`                       | 77%         | —      | Types only — no target                      |

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

## CI (not wired yet)

`npm run test:coverage` is **not** currently part of CI or a pre-commit hook.
When we're ready, wiring it into `.github/workflows/` and/or a `pre-push` hook
would prevent regressions. That's a separate, optional step.

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
