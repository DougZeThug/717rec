# Testing

This file describes what's tested in 717rec, the coverage targets we're aiming
for, and what's intentionally left out. It is meant to be skimmable — not a
full testing guide.

## How to run tests

```bash
npm test              # run the full suite once
npm run test:file -- <path>  # run a single test file (agent-safe; injects node_modules/.bin into PATH)
npm run test:debug    # serial + verbose test run (10m timeout) for diagnosing slow or stuck test files
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


## End-to-end tests (Playwright)

E2E specs live in `e2e/` (separate from Vitest, which only picks up
`__tests__/` and `tests/` folders). There are currently seven specs:

| Spec                        | What it checks                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| `smoke.spec.ts`             | App loads; main shell and primary navigation render                     |
| `score-submission.spec.ts`  | Public score-submission workflow in the browser                         |
| `admin-access.spec.ts`      | Admin route gating for admin vs non-admin users                         |
| `admin-mass-score.spec.ts`  | Admin mass score entry flow                                             |
| `playoff-bracket.spec.ts`   | Bracket advances semifinal winners into the final and crowns a champion |
| `a11y.spec.ts`              | axe WCAG 2 A/AA scan of six public routes (runs in its own workflow)    |
| `real-backend.spec.ts`      | Optional live Supabase golden path: logs in, views the schedule, submits a score for a seeded pending match, and verifies the submission row in `score_submissions`; skipped unless `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_USER_EMAIL`, and `E2E_TEST_USER_PASSWORD` are set |

**Honest caveat:** most specs intercept and mock all Supabase network calls
(`page.route`) — they exercise the real UI in a real browser, but against
canned data, not a live backend or real RLS policies. They are best thought
of as browser-level integration tests. `real-backend.spec.ts` is the exception:
it uses a live Supabase backend, service-role setup/cleanup, and a real test
login when its required `E2E_SUPABASE_*` and `E2E_TEST_USER_*` environment
variables are configured. Anything outside that golden path that depends on
actual database behavior still needs the manual checks below.

```bash
npm ci                # install the exact npm dependencies from package-lock.json
npm run e2e:install   # one-time: install Chromium + OS deps for Playwright
npm run e2e           # run the smoke suite (auto-starts `npm run dev` on :8080)
npm run e2e:ui        # interactive UI mode for authoring/debugging
npm run e2e:report    # open the last HTML report
```

Local E2E setup checklist:

1. Run `npm ci` from the repo root. Do not use pnpm or yarn; this repo's
   lockfile and scripts are npm-based.
2. Run `npm run e2e:install` before the first E2E run and after Playwright
   version bumps. The script installs Playwright's pinned Chromium build plus
   required Linux packages via `playwright install --with-deps chromium`.
3. If browser installation fails behind a corporate proxy or sandbox allowlist,
   allow access to the Playwright browser CDN or configure an approved
   `PLAYWRIGHT_DOWNLOAD_HOST`, then rerun `npm run e2e:install`. As a local-only
   escape hatch for locked-down sandboxes, install an approved Chrome/Chromium
   binary and run E2E with
   `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run e2e`; do not
   use that override in CI unless the workflow also installs that exact browser
   first.
4. Run `npm run e2e`. Playwright reuses an already-running dev server locally;
   otherwise it auto-starts `npm run dev` on port 8080.

In CI, `.github/workflows/e2e.yml` runs `npm ci`, then `npm run e2e:install`,
and only then `npm run e2e`, so browser installation is validated before tests
start. Artifacts (HTML report, traces, screenshots) are written to
`playwright-report/` and `test-results/` and are gitignored.

### CI status: non-blocking

The `E2E (smoke)` GitHub Actions workflow (`.github/workflows/e2e.yml`) runs
on every PR but is configured with `continue-on-error: true`, so failures do
**not** block merges while the suite stabilizes. To make it a required gate,
remove `continue-on-error: true` from `.github/workflows/e2e.yml` and add the
check to the branch protection rules.

The a11y scan is the exception: `.github/workflows/a11y.yml` runs
`e2e/a11y.spec.ts` as a **blocking** gate on every PR.


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

Last measured: 2026-07-06.

| Metric     | Covered |
| ---------- | ------- |
| Lines      | 62.98%  |
| Statements | 61.56%  |
| Functions  | 56.65%  |
| Branches   | 51.32%  |

The overall number is moderate because component coverage is still uneven,
though the 2026-07 dead-code cleanup removed most zero-coverage orphans and
the admin request/timeslot/division flows now have suites. The logic-heavy
areas (utils, scheduling, rankings, career math) and the service layer are in
much better shape — see the per-area table below.

Full baseline output is saved to `coverage-baseline.txt` at the repo root.

This baseline exists to prevent future changes from silently lowering
confidence, not to claim the app is comprehensively tested. It is not.

### Automated vs manual confidence

Be precise about which kind of confidence a claim rests on:

- **Verified by automated tests (runs on every PR):** services/data-access
  layer, ranking/career/prediction/playoff math, scheduling algorithms,
  bracket seeding, error handling, and a sample of hooks, pages, and admin
  components. The axe accessibility scan of public routes is also a blocking
  automated gate.
- **Automated but non-blocking:** the Playwright browser suite in `e2e/`
  (smoke, score submission, admin access, mass score entry, playoff bracket,
  and the optional real-backend golden path). It runs on every PR but failures
  do not block merges. Most browser specs mock all Supabase traffic;
  `real-backend.spec.ts` is skipped unless the live Supabase credentials above
  are configured, and then verifies one login/schedule/score-submission path
  against the real backend.
- **Manual only — no automated coverage:** anything that executes inside the
  database (RLS policies, Postgres RPCs, triggers, migrations), real
  authentication against Supabase, image upload/storage, realtime
  subscriptions, and most of the visual component layer. Confidence here
  comes from the manual checks documented below, nothing else.

## Coverage threshold policy (enforced)

Vitest coverage thresholds are now enforced in CI and locally via
`npm run test:coverage` (fast gate) or `npm run test:coverage:full` (deep local diagnostics).

### Stage 2 (active now): no regression at the global level

Global thresholds in `vitest.config.ts` are pinned a few points below the
current baseline:

- Lines: **62%**
- Statements: **61%**
- Functions: **56%**
- Branches: **51%**

If a PR drops any global metric below those numbers, the coverage job fails.

The PR gate (`npm run test:coverage:ci`) now measures the same full `src/**`
scope as local coverage, including components and pages. Numbers in
`vitest.config.ts` are authoritative; if this doc and the config disagree, the
config wins and this doc needs a sync.

### Stage 2 (active now): folder thresholds

These floors sit a few points below current measured coverage for each area, so
they catch regressions without blocking normal work:

- `src/services/**`: 72% lines / 71% statements / 72% functions / 58% branches
- `src/hooks/**`: 44% lines / 43% statements / 38% functions / 34% branches
- `src/utils/**`: 67% lines / 66% statements / 64% functions / 55% branches

These values are below current measured coverage for those areas and are meant
as a floor, not a final target.

### Stage 2 ratchet history

- **2026-07-02**: Documentation audit. Re-synced this doc with reality: the
  late-June ratchets (below) had raised enforced thresholds without updating
  this file, the E2E section still claimed a single smoke spec (there are
  six), and the baseline table was one ratchet stale. No thresholds changed
  in this pass — docs only, plus removal of a dead `COVERAGE_CRITICAL_ONLY`
  env var from two package.json scripts (nothing reads it).
- **2026-06-25 → 06-30**: Two test-expansion ratchets ("add unit tests for 13
  hooks", "raise page + hook coverage") lifted global gates from 42/41/34/33
  to **49/48/41/39** (lines/statements/functions/branches) and hooks folder
  floors from 36/36/29/27 to **44/43/38/34**.
- **2026-06-24**: Refreshed the baseline from the latest passing fast coverage run
  (285 files / 2318 tests in 429.38s) and raised global plus high-risk folder
  floors by a small margin. The new gates remain below measured coverage and
  leave runtime stabilization work ahead of any larger Stage-3 ratchet.
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
description and an updated table in this file. The broader (non-threshold)
improvement plan lives in the "Next ratchet plan" section at the end of this
document.

### Ownership expectations

- **PR author**: keep coverage at or above thresholds for touched code.
- **Area owners/reviewers**: ratchet thresholds upward when an area improves and
  stays stable; avoid additional threshold increases while the coverage runtime
  is still being actively tuned or investigated.
- **Maintainers**: keep `vitest.config.ts` thresholds and this policy in sync.
- **Everyone**: never lower thresholds just to merge unrelated work. If a drop is
  unavoidable (e.g., broad refactor), call it out explicitly in the PR and
  restore in follow-up work.

### Baseline generation note

To promote the latest passing coverage run to the repository baseline, run a
single command from the repo root:

```bash
npm run test:coverage:update-baseline
```

This command runs the fast coverage gate, replaces `coverage-baseline.txt` only
after that run succeeds, then reads `coverage/coverage-summary.json` and updates
the `## Current baseline` date + top-level metric rows in this file. If you
already have a fresh successful coverage run and only need to resync this doc,
run `npm run test:coverage:sync-docs`.

## Coverage by area

Line coverage snapshot by folder, measured 2026-07-02 from
`coverage/coverage-summary.json`. Targets are what we want each area to reach
over time; anything already above target is just "keep it green".

| Area                               | Lines today | Target | Notes                                        |
| ---------------------------------- | ----------- | ------ | -------------------------------------------- |
| `src/services/**`                  | 75%         | 70%    | Data access layer — on target                |
| `src/services/auth`                | 100%        | 70%    | On target                                    |
| `src/hooks/**`                     | 46%         | 60%    | React Query hooks wrapping services          |
| `src/hooks/matches`                | 47%         | 60%    | Coverage spread across many small hooks      |
| `src/utils/**` (aggregate)         | 70%         | 85%    | Strong gains from logic-heavy utility tests  |
| `src/utils/career`                 | 89%         | 85%    | On target                                    |
| `src/utils/rankingUtils`           | 74%         | 85%    | Fell below target as new code landed         |
| `src/utils/predictions`            | 96%         | 85%    | On target                                    |
| `src/utils/playoffs`               | 100%        | 85%    | On target                                    |
| `src/utils/matchUtils`             | 100%        | 85%    | On target                                    |
| `src/utils/brackets/mappers`       | 100%        | 85%    | On target                                    |
| `src/utils/brackets/validators`    | 100%        | 85%    | On target                                    |
| `src/utils/auth`                   | 90%         | 85%    | On target                                    |
| `src/utils/autoSchedule`           | 66%         | 85%    | Complex scheduling algorithms — gradual      |
| `src/utils/autoSchedule/dualBlock` | 85%         | 85%    | On target                                    |
| `src/utils/scheduling/greedy`      | 70%         | 85%    | `swapRepair` improved but still below target |
| `src/utils/colors`                 | 91%         | 60%    | On target                                    |
| `src/utils/timezone`               | 90%         | 60%    | On target                                    |
| `src/utils/teamDetailsUtils`       | 73%         | 60%    | On target                                    |
| `src/utils/teamStatsUtils`         | 100%        | 60%    | On target                                    |
| `src/pages/**`                     | 67%         | 40%    | Big gains from late-June page-test ratchet   |
| `src/components/**` (non-UI)       | 41%         | 40%    | Improved, but very uneven — many 0% folders  |
| `src/types`                        | 82%         | —      | Types only — no target                       |

This table is a manual snapshot and drifts as code lands. Only the top-level
baseline table above is auto-synced by `npm run test:coverage:sync-docs`; when
per-area numbers matter for a decision, recompute them from a fresh
`coverage/coverage-summary.json` rather than trusting this table.

## What's tested today

**Services:** `ProfileService`, `HeadToHeadService`, `TeamFetchService`,
`TeamCreateService`, `TeamUpdateService`, `MatchReadService`,
`MatchWriteService`, `RankingCareerService`, `RankingPersistenceService`,
`RankingCurrentService`, `RankingTrendsService`.

**Hooks:** `usePendingMatches`, `useTeamScheduleLoader`, `usePairingGenerator`,
`useMatchComments`, match-submission and team-record-update hooks,
match query-cache utilities, team-stats util.

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

## PR baseline checklist

Before merging any PR, confirm:

- [ ] Unit/integration tests pass (`npm test` — CI runs this in `test.yml`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Build passes (`npm run build`)
- [ ] Coverage thresholds hold (`npm run test:coverage:ci` — enforced in CI)
- [ ] a11y scan passes (blocking CI gate)
- [ ] Critical user flows manually checked when the change touches them
      (home page, schedule, standings, teams)
- [ ] Admin score submission flow checked when score/match logic changed
- [ ] Bracket/playoff flow checked when bracket, seeding, or playoff code
      changed
- [ ] Supabase migration / RLS / RPC changes reviewed extra carefully — these
      have **no automated coverage**; run the relevant manual checks below
- [ ] No new `any` usage unless justified in the PR description
- [ ] No docs claiming test coverage that does not exist — if you touch
      thresholds or add/remove suites, update this file in the same PR

## Manual QA expectations

Some things can only be validated by a human clicking through the app,
because no automated test exercises a real backend:

- **Every release-worthy change:** load the home page, schedule, standings,
  and teams pages on desktop and mobile widths; confirm no blank sections or
  console errors.
- **Score/match changes:** submit a score as admin (single and mass entry)
  and confirm standings and team records update.
- **Playoff changes:** open an active bracket, advance a match, and confirm
  the bracket redraws correctly through the final round.
- **Database changes (migrations, RLS, RPCs, triggers):** run the relevant
  staging checks — see "Manual checks: overlapping seasons" below for the
  season-workflow example. There is no automated safety net here.
- **Auth changes:** log in/out with a real account, confirm admin routes stay
  blocked for non-admins.

When you complete manual QA for a PR, say so in the PR description ("manually
verified X and Y") so reviewers know which confidence is human-verified
rather than assumed.

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

## Next ratchet plan

Realistic next improvements, in tiers. Each tier should be fully true before
moving to the next; don't skip ahead and claim higher-tier confidence.

### Tier 1 — Minimum protection (where we are today)

Already in place and enforced:

- Typecheck must pass (CI: `test.yml`)
- Build must pass (CI: `test.yml`)
- Existing tests must pass (CI: `test.yml`)
- Coverage floors enforced on services/hooks/utils (CI: `coverage-threshold.yml`)
- a11y scan blocking on public routes (CI: `a11y.yml`)
- Manual smoke expectations documented (this file)

### Tier 2 — Core app confidence (mostly done as of 2026-07-06)

- ~~Extend tests for score submission logic~~ **Done.** All seven
  `src/components/admin/mass-score-entry/hooks/` files have suites,
  including game-wins submission via `useMatchScores`.
- ~~Extend to standings display components / pull rankingUtils above 85%~~
  **Done.** `src/components/stats/**` gained suites (rank/, containers/,
  hooks, career table, HeadToHeadRecords, OpponentHistoryModal), and
  `src/utils/rankingUtils/` sits well above its 85% target after the
  2026-07 dead-code cleanup removed untested orphans and equal-score
  tiebreaker tests were added.
- ~~Match completion/winner handling at the hook level~~ **Done.** Every
  hook and util in `src/hooks/matches` has a suite.
- ~~Playoff viewer/renderer regression tests~~ **Done.** All three
  `src/components/playoffs/viewer/` files are tested.
- Make the Playwright E2E workflow a blocking gate once it has been stable
  for a few weeks (remove `continue-on-error` from `e2e.yml`) — still open.

### Tier 3 — Higher confidence (later)

- ~~Component tests for the remaining admin flows~~ **Largely done
  (2026-07-06).** Divisions (DivisionsTab, DivisionRow,
  CreateDivisionDialog, useDivisionMutations), timeslots (TimeslotsTab,
  useTimeslots/useTimeslotQuery — useTimeslotMutation already had a suite),
  and requests (RequestsTab, useTeamRequests) are now covered.
- Integration tests against mocked Supabase data for multi-step admin
  workflows (season rollover, blind draw)
- E2E smoke coverage for public schedule, standings, teams, and admin score
  entry against a seeded staging backend (today's E2E mocks all network
  traffic, so RLS and RPC behavior is never exercised)
- Automated checks for database code (pgTAP or a scripted staging smoke) so
  the "manual only" list above starts shrinking
