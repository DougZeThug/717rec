# PR: Seeded real-backend E2E coverage

Extend the existing `@real-backend` Playwright suite (`e2e/real-backend.spec.ts` + `e2e/helpers/realBackend.ts`) with four new seeded flows and hardened cleanup. All new work stays behind the existing env-gated `test.skip`, so CI without `E2E_SUPABASE_*` secrets is unaffected.

## Files touched

- `e2e/helpers/realBackend.ts` — new seed/cleanup helpers, admin promotion helper, per-suffix tracking.
- `e2e/real-backend.spec.ts` — three new public-route tests + one admin score-entry test, all in the existing `@real-backend` describe block.

No product code, no migrations. Verification: `npm run e2e -- --grep @real-backend` locally with a staging Supabase project (documented in `docs/E2E_REAL_BACKEND.md`).

## Helper additions (`e2e/helpers/realBackend.ts`)

Keep the existing `SeededMatch` / `seedPendingMatch` / `cleanupSeededMatch` shape intact and add:

1. `ensureTestUserIsAdmin(admin, env)`
   - After `ensureTestUser`, look up the user's `profiles` row and `update({ is_admin: true })`. Idempotent — safe to re-run.
2. `SeededSeason` + `ensureActiveSeason(admin)`
   - Reuse an existing active season if one exists; otherwise insert an `E2E Season <suffix>` marked active. Return `{ seasonId, createdByHelper }` so cleanup only removes seasons this helper created.
3. `SeededDivision` + `ensureDivision(admin, seasonId)`
   - Reuse or insert a single `E2E Division <suffix>` scoped to the season. Same `createdByHelper` flag.
4. `SeededScheduleFixture` + `seedScheduleFixture(admin)`
   - Seeds: 1 season (if needed), 1 division (if needed), 2 teams, 1 `team_timeslots` row per team, and 1 `matches` row dated in the near future (`iscompleted: false`, real `date`, `location: 'E2E Court'`). Returns all ids and generated team names.
5. `SeededStandingsFixture` + `seedStandingsFixture(admin)`
   - Seeds 2 teams + 1 completed match with concrete `team1_score`/`team2_score` and `iscompleted: true`, plus matching `team_season_stats` rows (wins/losses/points_for/points_against) so the standings page renders deterministic rank/stat values without depending on background triggers. If a trigger already writes stats, upsert on `(team_id, season_id)`.
6. `SeededTeamsFixture` + `seedTeamsFixture(admin)`
   - Seeds a division and 3 teams within it, plus 2 `team_players` rows per team, so `/teams` renders both team cards and roster counts.
7. `SeededAdminScoreFixture` + `seedAdminScoreFixture(admin)`
   - Same shape as `seedPendingMatch` but guaranteed to appear in the admin Mass Score Entry tool: season + division attached, `iscompleted: false`, no scores.
8. `cleanupSeededScheduleFixture` / `cleanupSeededStandingsFixture` / `cleanupSeededTeamsFixture` / `cleanupSeededAdminScoreFixture`
   - Each accepts the fixture object; deletes in FK-safe order (`game_players` → `games`/`match_game` if touched → `score_submissions` → `team_season_stats` → `matches` → `team_players` → `team_timeslots` → `teams` → `divisions` if `createdByHelper` → `seasons` if `createdByHelper`).
   - Every delete uses `.eq`/`.in` on ids captured at seed time and swallows "not found" so partial-failure reruns stay green (mirrors the current `cleanupSeededMatch` behavior).
   - Refactor `cleanupSeededMatch` to funnel through a shared `safeDelete(table, column, value)` helper so all cleanups share the same idempotent semantics.

Each seed helper uses the existing `uniqueSuffix()` so parallel runs never collide, and returns names/ids the spec asserts against.

## Spec additions (`e2e/real-backend.spec.ts`)

Inside the existing `test.describe('@real-backend golden paths', ...)`:

- Move the per-test pending-match seeding out of `beforeEach` — each new test owns its fixture in its own `try/finally` (or a local `afterEach` via `test.afterEach` scoped inside a nested `describe`) so an unrelated failure doesn't skip cleanup for another test.

1. `public schedule renders seeded matches via anon client`
   - Seed via `seedScheduleFixture`. Navigate to `/schedule` without logging in.
   - Assert `main` visible, no `/failed|error/i` text, and both seeded team names are visible in the schedule list. Cleanup in `finally`.

2. `public standings renders seeded team stats via anon client`
   - Seed via `seedStandingsFixture`. Navigate to `/stats` (the standings route confirmed in `src/pages/Stats.tsx`).
   - Assert seeded team names render and their seeded win/loss numbers appear in the same row (`getByRole('row', { name: new RegExp(team1Name) })` then `getByText('1')` scoped to that row, matching whichever stats we wrote).

3. `public teams page renders seeded teams via anon client`
   - Seed via `seedTeamsFixture`. Navigate to `/teams`.
   - Assert all three seeded team names visible and each rendered card includes the seeded division label.

4. `admin can submit a score for a seeded match`
   - `beforeAll` additionally calls `ensureTestUserIsAdmin`.
   - Seed via `seedAdminScoreFixture`. Log in through `/auth`, then `page.evaluate` to preset `sessionStorage.setItem('adminActiveTab', 'scores')` before navigating to `/admin` so the Scores tab is active on first render (matches `AdminSidebar`'s persistence key).
   - Locate the seeded match row by team name, enter final scores (e.g. `21` / `17`), submit, and wait for the success toast/row-removal.
   - Verify via the service-role client: `matches.iscompleted = true`, `team1_score`/`team2_score` match, and `team_season_stats` for the winning team incremented (read the pre-submit snapshot in the fixture so we assert deltas, not absolute values, to stay robust against concurrent seeds).
   - Cleanup in `finally`.

All new tests keep the existing console-error assertion pattern (filter Supabase noise + `fetchPriority`).

## Idempotency & safety notes

- Every helper is safe to call repeatedly and safe to clean up after a partial failure: unique suffixes prevent name collisions, `createdByHelper` flags prevent us from deleting pre-existing seasons/divisions, and `safeDelete` never throws on missing rows.
- No changes to prod code, RLS, or migrations — the admin promotion writes only to the test user's `profiles` row on the staging Supabase project.
- CI stays unchanged: the suite still skips when `E2E_SUPABASE_*` secrets are absent, matching the current `real-backend` policy.
