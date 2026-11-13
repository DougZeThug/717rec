# League context for the agent team

Every specialist agent reads this file first.
It holds **verified facts** and the **corrections log**.
Facts here were checked against the repo on 2026-10-06, and the 2026-11-13 corrections.
The live division weights come from a read Doug shared. The developer did not re-read them.
If the code disagrees with this file, the code wins. Then fix this file.

## What the product is

- A league app for a recreational cornhole league (717rec).
- Players, captains and admins use it on phones, mostly on league night.
- Admin is one person (Doug) who is not a coder. Admin steps must stay few.
- As of 2026-10-06, **nobody has used live scoring on a real league night yet.** There is no real data on lost rounds.
- Rainouts and forfeits **almost never** happen. Do not build for them unless Doug asks.

## Stack (verified)

- Frontend: React 19, TypeScript, Vite 8, Tailwind v4, shadcn/ui, TanStack Query, React Router 8.
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions in `supabase/functions/`).
- Hosting: Cloudflare static assets (`wrangler.toml`). Deploy build runs `bun install --frozen-lockfile`.
- Lovable: used for schema changes and the live preview (`.lovable/`). The repo still holds the code.
- Package manager: npm only. Update `bun.lock` too when dependencies change (see `AGENTS.md`).
- Source of truth for data shape: `src/integrations/supabase/types.ts` (auto-generated, never edit by hand).
- Data flow: Components -> Hooks -> `src/services/` -> Supabase. See `CLAUDE.md`.

## Mobile (verified)

- There is **no native app project** in this repo. No `android/`, no `ios/`, no `capacitor.config.*`.
- `@capacitor/core` and `@capgo/capacitor-social-login` exist only for native sign-in code (`src/services/auth/nativeAuth.ts`, `src/hooks/auth/useAuthMethods.ts`).
- "Mobile" means the responsive web app. It has a phone tab bar below 768 px. See `docs/product-description/cross-cutting/on-a-phone.md`.
- Do not claim Capacitor/Android behavior unless you find the project files.

## Database and deploy rules (verified)

- Migrations in `supabase/migrations/` do **not** reach production by themselves.
  Someone must apply them by hand or through Lovable. See `docs/OPERATIONS.md` section 6.
- Repo SQL tests live in `supabase/tests/` (run by the `supabase-ci` workflow on a throwaway database).
- Public data must stay public. Do not narrow SELECT policies on `seasons` or `team_season_stats`. See `docs/RLS_NOTES.md`.
- Archived seasons are frozen against division and division-weight edits.
  **Exception:** saving new Power Score weights in the Sandbox recomputes every season, archived included.
  This is on purpose, and Doug accepts it (2026-10-06). See `20260820120000_power_score_weight_sandbox.sql`.

## League rules (verified from `docs/product-description/foundations/league-objects.md`)

- Divisions: **Recreational, Intermediate, Competitive, Hidden**.
- Hidden is where teams go when they stop playing. Hidden teams leave standings. Their past matches still count for opponents.
- A match is best of three games. Two game wins take the match.
- A game is first to 21, win by 2, no cap, no bust rule.
- A match marked completed with no winner is a **tie**.
- Deleting a match reverses its stats. Hiding a team does not.

## Power Score (verified from `src/utils/powerScore/README.md` and `weights.ts`)

- **The old "40 / 40 / 20" split is out of date.**
- Default weights today: **40 match win rate, 45 strength of schedule, 15 game win rate**.
- The live weights are the newest row of `power_score_weight_history`. An admin changes them in the Power Score Sandbox. The SQL functions `power_score_100()` and `power_score_100_career()` are regenerated from that row.
- `src/utils/powerScore/weights.ts` mirrors the SQL for previews. SQL is the source of truth.
- Stored on a 0-1 scale. Shown on a 0-100 scale. `NULL` for a team with no matches and for Hidden teams.
- Career score applies a 0.30 performance floor to the SOS term.
- Strength of schedule = average division weight of opponents (held between 0.1 and 1.0). It is **not** the average opponent power score.
- Opponents are rated by the division they were in **on the match date** (`division_weight_history`).
- Playoff games count. Byes do not.
- **Division weights:** admins edit weights in the app. No migration holds the live values.
  Read the live values before any scoring work (admin screen, or `division_weight_history`). Never assume them.
  - **Reported live weights** (from a live read Doug shared 2026-11-13; not re-read by the developer): Competitive 1.00, Competitive Low 0.95, Cuspers 0.90, Intermediate High 0.80, Intermediate 0.70, Intermediate Low 0.60, Recreational High 0.60, Recreational 0.35, Hidden 0.60, Hidden2 0.35. That is 10 divisions. **Competitive IS 1.00. No division is 0.85.** None of the 10 has a NULL or zero weight.
  - The same read reports that 0 of 51 teams, 0 of 34 brackets and 0 of 575 completed playoff results lack a valid division link. All 292 `team_season_stats` division names matched a real division, directly or through an existing translation rule.
  - **Hidden is not negative live.** Older notes said Hidden is -1.0 (from migration comments). Do not rely on "negative weight = hidden". `division_is_hidden()` (`20260812171421_0b0efe39-6446-4180-b1a9-1a13d036652f.sql`) is also true for a name or display name that starts with `hidden`.
  - **Hidden and Hidden2 weights (0.60, 0.35) are never used to rate an opponent:** `v_division_rateable` skips any Hidden division (same migration, lines 153-163).
  - The old remembered values (Competitive 1.00, Intermediate 0.75, Recreational 0.35) match the reported read except Intermediate, which reads 0.70.
  - **0.85 in code is a temporary fallback** for a missing weight, not a league-strength value (`src/utils/rankingUtils/defaultDivisionWeight.ts`). Doug decided on 2026-11-13 that an unknown division must be treated as unrated. That is DECIDED, NOT BUILT (see the corrections log).
- Read these before touching scoring: `docs/product-description/stats/power-score.md`, `docs/POWER_SCORE_ROLLOUT.md`, `docs/OPERATIONS.md` sections 6a and 6b.

## Where things live

| Topic | Place |
|---|---|
| What the user sees, screen by screen | `docs/product-description/` (start at `README.md`) |
| League-night playbook | `docs/OPERATIONS.md` section 2 |
| Dashboard settings baseline | `docs/PRODUCTION_SETTINGS.md` |
| RLS decisions | `docs/RLS_NOTES.md` |
| Architecture | `ARCHITECTURE.md` |
| Services (all Supabase calls) | `src/services/` (`matches/`, `liveScoring/`, `rankings/`, ...) |
| Scoring math in TypeScript | `src/utils/powerScore/`, `src/utils/standings/`, `src/utils/rankingUtils/` |
| Admin screens | `src/components/admin/` (`league-night-status`, `live-corrections`, `mass-score-entry`, `power-sandbox`, ...) |
| Edge functions | `supabase/functions/` |
| SQL tests | `supabase/tests/` |
| E2E tests | `e2e/` |
| UX audits | `docs/audits/` |

## Commands

- Typecheck: `npm run typecheck` (never bare `tsc --noEmit`).
- Lint: `npm run lint`.
- One test file: `npm run test:file -- <path>`.
- Fast full gate: `npm run test:coverage`.
- E2E: `npm run e2e`.
- Live read-only league data: MCP server `717rec-public` (standings, schedule, teams, brackets).

## Corrections log (durable learning)

When Doug corrects a rule, workflow or scoring assumption, the Lead adds one row here.
Then the Lead also fixes any doc, test or agent file that carried the wrong belief.
Keep rows short. Do not delete rows. Mark a row `superseded` if a later row replaces it.

| Date | Doug said | Now true | Where it is enforced |
|---|---|---|---|
| 2026-10-06 | (setup) Old Power Score memory said 40/40/20 and divisions 1.00/0.75/0.35. | Default is 40/45/15 and admin-adjustable. Division weights are unconfirmed. | This file; `src/utils/powerScore/README.md` |
| 2026-10-06 | Old seasons may get new Power Scores when the weights change ("fine if they change"). | A weight save recomputes every season, archived included. This file said archived ratings never move. | This file; `docs/product-description/stats/power-score.md`; `.claude/agents/implementer.md` |
| 2026-10-06 | A tie must **not count** in Win %. | Win % = W ÷ (W + L). History and Career already do this. Standings Win % counted a tie as a loss. Power Score's match term must use the same rule (Doug, 2026-10-06): a tie does not count there either. Game term and SOS still count a tie. **Changed in repo; needs hand-apply** (`20261006120000`, `docs/OPERATIONS.md` §6e). | `supabase/tests/power_score_ties_excluded.sql`, `buildSeasonWeightPreview.test.ts` |
| 2026-11-13 | Odd block in the standard auto-schedule: "go with your recs" (option b). | **DECIDED, NOT BUILT.** In standard mode an odd block must leave one team out and list it as unmatched, as dual mode does. Today it only warns and builds a 3-team triangle (`standardPairing.ts:44-48`). | Not enforced yet. Queued as its own small PR, tests first. |
| 2026-11-13 | A block with one team: "go with your recs" (option b). | **DECIDED, NOT BUILT.** A lone team must be counted as unmatched, so the "N teams unmatched" message includes it. Today it is skipped silently (`standardPairing.ts:38-41`). | Not enforced yet. Queued with the row above. |
| 2026-11-13 | Prediction card while the head-to-head batch loads: "go with your recs" (option a). | **Keep as is.** The card may show a prediction without head-to-head weighting, with no loading state, until the batch arrives (`useMatchPrediction.ts:64`). Do not pin this in a test. Revisit only if cards visibly jump. | Nothing to enforce. |
| 2026-11-13 | Recap for a week with no scored teams: "go with your recs" (yes). | **DECIDED, NOT BUILT.** Such a week counts as `'missing'`: the admin is warned and publishing is blocked. Today it reports `'compared'` and publishes with no warning (`weeklyTrendsForWeek.ts:110-112`, `buildRecapFacts.ts:162-168`). | Not enforced yet. Queued as its own small PR, with a test. |
| 2026-11-13 | The 65/25/10 prediction split and the 30% upset line: "go with your recs" (leave them). | **Leave unchanged.** They stay product choices in code (`predictionConstants.ts:1-3`, `:25`). They are still **not confirmed league rules** and no test pins them. | Nothing to enforce. |
| 2026-11-13 | A live read of the divisions table that Doug shared. The repo notes said no division has weight 1.0 and (from migration comments) that Hidden is -1.0. | **Competitive IS 1.00.** Hidden is 0.60 and Hidden2 is 0.35. No division is 0.85. Full list in "Division weights" above. From a live read Doug shared 2026-11-13; not re-read by the developer. Any code or doc that relies on "negative weight = hidden" must be checked against the name rule: `division_is_hidden()` is also true for a name or display name that starts with `hidden`. | This file; `docs/product-description/stats/power-score.md`; `docs/untangle-decision-log.md` (Slice 4 result); the name rule in `supabase/migrations/20260812171421_0b0efe39-6446-4180-b1a9-1a13d036652f.sql` |
| 2026-11-13 | A team or bracket whose division is genuinely unknown: he chose "Treat as unrated". The developer had recommended keeping the fallback and adding an admin warning. | **DECIDED, NOT BUILT.** An unknown division is left out of the career bonus instead of counting as 0.85, like the season Power Score does for unrated opponents. The TypeScript 0.85 is a temporary fallback until then. Building it needs a migration plus a hand-apply (SQL uses 0.85 in `resolve_division_bonus_weight()` and `calculate_career_power_score()`), and TypeScript and SQL must change together. No number changes today, because no division is missing (reported). Own PR with a design. | Not enforced yet. Today's 0.85 is pinned by tests (`defaultDivisionWeight.test.ts`, the career, cache and Team page pins) and by `supabase/tests/career_power_score_parity.sql`. Edit those pins on purpose when this is built. |
