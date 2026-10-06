# League context for the agent team

Every specialist agent reads this file first.
It holds **verified facts** and the **corrections log**.
Facts here were checked against the repo on 2026-10-06.
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
- `@capacitor/core` and `@capgo/capacitor-social-login` exist only for native sign-in code (`src/utils/nativeAuth.ts`, `src/hooks/auth/useAuthMethods.ts`).
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
- **Division weights:** the old values (Competitive 1.00, Intermediate 0.75, Recreational 0.35) are **not confirmed**.
  Admins edit weights in the app. No migration holds the live values. The product docs say no division has weight 1.0.
  Read the live values before any scoring work (admin screen, or `division_weight_history`). Never assume them.
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
