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
- Hidden is where an admin moves a team **after it drops out**. Hidden teams leave standings. Their past matches still count for opponents.
- **The move to Hidden overwrites the old division, with no history** (header of `supabase/migrations/20260812130000_power_score_historical_opponent_division.sql`). Later, migration `20261003183939` added `team_division_history`: a trigger saves the old division on each move from then on (no back-fill; whether it is applied live is UNKNOWN). So a game against a team that is Hidden now was a real game. The opponent was in a real division when they played. Do not call Hidden "administrative". Do not leave those games out.
- **Where the code stands today (checked 2026-11-16):** the Power Score finds the opponent's real division for each match (that season's weekly snapshot, then the archive row, the bracket, `team_division_history`, the current division, and last of all `v_team_last_known_division`; migration `20261003183939`, lines 30-76). Career drops those games. The Team page counts them as Competitive, which is the wrong tier for some. The proper fix is open: `docs/untangle-decision-log.md`, "Slice 6 result", "Open".
- **Verified by Doug (2026-11-16):** 22 games were played against 8 teams that are Hidden now. The snapshot view knows the real division for 13 of them: Burning Holes & Taking Souls was Recreational (6 games, Summer 1 2026), Baggin' & Braggin' was Competitive (4, Spring 2026), Jerm was Recreational (2, Winter 1 2026), Bag Assassins was Intermediate (1, Fall 2025). Doug supplied the other 9 from memory (not in the database): Shut Your Cornhole was Competitive (4, Fall 2025), Zoo Pals was Intermediate (2, Fall 2026, the active season), Red Roof Rockets was Recreational (1, Winter 1 2026), The Tomato Saucers were Recreational (2, Winter 2 2026).
- A match is best of three games. Two game wins take the match.
- A game is first to 21, win by 2, no cap, no bust rule.
- A match marked completed with no winner is a **tie**.
- Deleting a match reverses its stats. Hiding a team does not.

## Power Score (verified from `src/utils/powerScore/README.md` and `weights.ts`)

- **The old "40 / 40 / 20" split is out of date.**
- Default weights today: **40 match win rate, 45 strength of schedule, 15 game win rate**.
- The live weights are the newest row of `power_score_weight_history`. An admin changes them in the Power Score Sandbox. The SQL functions `power_score_100()` and `power_score_100_career()` are regenerated from that row.
- `src/utils/powerScore/weights.ts` mirrors the SQL for previews. SQL is the source of truth.
- Stored on a 0-1 scale. Shown on a 0-100 scale. `NULL` for a team with no matches. A Hidden team with matches has a score; the read layer only hides it from lists (CI test `supabase/tests/power_score_weighted_denominators.sql:172-180`).
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
  - **The career bonus no longer uses 0.85.** A division with no known weight is **unrated** there (a blank name, a name that matches no division, or a division with no weight): it adds 0 to the bonus. A weight of 0 is a real 0. Built 2026-11-16 in TypeScript and SQL (migration file `20261117120000`). **Doug applied the SQL to the live database on 2026-11-16** (fingerprint of all 51 career scores identical before and after; `docs/OPERATIONS.md` section 6f). **0.85 is still a temporary fallback in other code:** match predictions, the bracket weight (only compared with 0.89), the Team page tier and the by-id cache (`src/utils/rankingUtils/defaultDivisionWeight.ts`). It is not a league-strength value.
  - **Playoff-fallback rule (developer choice, Doug can overrule):** a playoff run in only unrated seasons is rated by the team's current division weight. If that is unrated too, the playoff win-rate bonus is 0. It is worth about 2 points or less.
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
| 2026-11-13 | Odd block in the standard auto-schedule: "go with your recs" (option b). | **Superseded 2026-11-13** by the "Odd block in STANDARD mode" row below. It was DECIDED, NOT BUILT: in standard mode an odd block must leave one team out and list it as unmatched, as dual mode does. Doug then said "nobody sits out", and the skeptic found Dual Match Mode already gives that, so this was never built. | Not built, on purpose. See the next rows. |
| 2026-11-13 | A block with one team: "go with your recs" (option b). | **BUILT 2026-11-13 (PR-S).** A lone team is counted as unmatched, named in the Auto Schedule toast ("1 team unmatched: Alpha.") and shown with an "Unmatched" badge on the Teams tab. An empty block adds nothing. A team short in two blocks is listed once. Before, the block was skipped silently (`standardPairing.ts:38-41` at that time; the code is `standardPairing.ts:65` now). | Enforced by tests: `standardPairing.test.ts` ("counts the team in a one-team block as unmatched and leaves a full block alone", "lists a lone team once when it is also short in another block", "does not stop for a lone team beside an even block"), `standardPairing.realGenerator.test.ts` ("counts a lone team as unmatched and leaves the 4-team block exactly as it was", "counts only the lone team when 9 block keys are present and 7 are empty"), `usePairingOperations.test.ts` (the "1 team" and named toast) and `TeamLoadingStep.test.tsx`. |
| 2026-11-13 | Odd block in STANDARD mode (Dual Match Mode off): first "one team sits out", then "nobody sits out, extra match at the next half-hour". Doug uses Dual Match Mode. | **BUILT 2026-11-13 (PR-S): stop early with a clear message.** An odd block of 3 or more teams makes Generate throw ONE message that names every odd block by its time and team count, then says to move a team or use Dual Match Mode on the Auto Schedule screen. Nothing is generated and nothing can reach Save. Doug uses Dual Match Mode, which already gives nobody-sits-out with a third slot at the next half-hour (`dualBlockScheduler.ts:87-88`, `scheduleOdd.ts:84`), so a third slot in standard mode was **not built**. Before, these nights reached Save and failed there with "Team is scheduled for multiple matches", or (5 teams of one division) failed at Generate with only a generic message. | Enforced by tests: `standardPairing.test.ts` ("stops with a clear message on an odd block (3 teams)", the 5, 7 and 9 team cases, "names every odd block in ONE message ..."), `standardPairing.realGenerator.test.ts` ("stops with a clear message for %i teams"), `standardOddBlock.integration.test.ts` and `useSchedulePreview.standardOddBlock.test.ts` (the message reaches the admin on both screens). Code: `standardPairing.ts:32-47`. |
| 2026-11-13 | A block of exactly 2 teams: one match, not unmatched. | **BUILT 2026-11-13 (PR-S).** Two teams can meet only once, so the block gets ONE match and neither team is listed as unmatched. Before, Generate failed for the whole night ("2 teams don't have 2 matches"). Blocks of 3 and more still target 2 matches per team. Open, not decided: the same 2 teams in Early and Late play each other twice, and a Competitive and a Recreational team in a block of 2 are paired anyway (see `docs/untangle-decision-log.md`, "PR-S result", open item 2). | Enforced by tests: `standardPairing.realGenerator.test.ts` ("gives a block of 2 teams one match against each other, with nobody unmatched", "pairs a block of 2 beside blocks of 4 and 6 without changing those blocks", "still plays the one match when the two teams already met this season"), `blossomPairingAlgorithm.test.ts` (2 teams: one pairing), `standardPairing.test.ts` ("does not list the two teams of a 2-team block as unmatched when they play their one match"). Code: `generatePairings.ts:31`, `standardPairing.ts:96`. |
| 2026-11-13 | Prediction card while the head-to-head batch loads: "go with your recs" (option a). | **Keep as is.** The card may show a prediction without head-to-head weighting, with no loading state, until the batch arrives (`useMatchPrediction.ts:64`). Do not pin this in a test. Revisit only if cards visibly jump. | Nothing to enforce. |
| 2026-11-13 | Recap for a week with no scored teams: "go with your recs" (yes). | **BUILT 2026-11-13 (PR-R).** A week whose snapshot rows have no scored team counts as `'missing'`: the admin is warned and the Publish button is off. Before, it reported `'compared'` and published with no warning. Not changed: a scored week whose teams are all new or all Hidden stays `'compared'`; week 1 stays `'baseline'`. The weekly job cannot write a NULL score, so this closes a hole for odd or hand-written rows only. The block is in the screen only: `publish()` does not check (not changed). | Enforced by tests: `weeklyTrendsForWeek.test.ts` ("calls a week missing when its rows have no scored team", the gap-week case, and three "(today's behaviour)" pins), `fetchRecapFacts.test.ts` ("keeps a 'missing' week in the facts, reads no previous standings and blocks publishing") and `PackWarnings.test.tsx` ("says a missing week can also mean no row has a power score"). Code: `weeklyTrendsForWeek.ts:111-116`. |
| 2026-11-13 | The 65/25/10 prediction split and the 30% upset line: "go with your recs" (leave them). | **Leave unchanged.** They stay product choices in code (`predictionConstants.ts:1-3`, `:25`). They are still **not confirmed league rules** and no test pins them. | Nothing to enforce. |
| 2026-11-13 | A live read of the divisions table that Doug shared. The repo notes said no division has weight 1.0 and (from migration comments) that Hidden is -1.0. | **Competitive IS 1.00.** Hidden is 0.60 and Hidden2 is 0.35. No division is 0.85. Full list in "Division weights" above. From a live read Doug shared 2026-11-13; not re-read by the developer. Any code or doc that relies on "negative weight = hidden" must be checked against the name rule: `division_is_hidden()` is also true for a name or display name that starts with `hidden`. | This file; `docs/product-description/stats/power-score.md`; `docs/untangle-decision-log.md` (Slice 4 result); the name rule in `supabase/migrations/20260812171421_0b0efe39-6446-4180-b1a9-1a13d036652f.sql` |
| 2026-11-13 | A team or bracket whose division is genuinely unknown: he chose "Treat as unrated". The developer had recommended keeping the fallback and adding an admin warning. | **BUILT 2026-11-16 (migration file `20261117120000`) and APPLIED by Doug on 2026-11-16** (own PR #1744; Doug chose "Build it now" on 2026-11-16; fingerprint of all 51 career scores identical before and after). An unknown division is left out of the career bonus instead of counting as 0.85, like the season Power Score does for unrated opponents. **Unrated** = a blank name, a name that matches no division, or a matched division with no weight; a weight of 0 is a real 0. A title or runner-up in an unrated division adds 0; the playoff win-rate weight averages the rated seasons, else the team weight, else the bonus is 0 (a developer choice, Doug can overrule); the cap uses the strongest rated weight, else the team weight, else 0. TypeScript and SQL give the same number, except for a division name with a leading tab or a non-breaking space: TypeScript rates it and SQL leaves it unrated (see the migration header). Not built: predictions, bracket weights, the Team page tier, the by-id cache, the season Power Score (they keep their own rules; see `docs/untangle-decision-log.md`). No number changes today, because no division is missing (reported). **Database first, then merge**: `docs/OPERATIONS.md` section 6f. | The new tests: `src/utils/career/__tests__/divisionBonusWeight.test.ts`, `src/services/career/__tests__/calculateCareerPowerScore.test.ts` (fixtures 5 and 6 and the unrated block), the career fetch and cache tests, and `supabase/tests/career_power_score_parity.sql` (same fixtures in SQL). The read-only check is `supabase/scripts/check_unrated_divisions.sql`. |
| 2026-11-16 | A game against a Hidden team on the Team page: he took the recommendation ("leave it out", like Career). | **Superseded 2026-11-16 (same day) by the next row. BUILT in `d325bc1`, then UNDONE** (commit "Undo: leave games against Hidden teams out of the Team-page split (wrong rule)"). It treated Hidden as "administrative". That belief was wrong. What stays true: the Team page reads the opponent division FOR THAT SEASON (`team_season_stats.division_name`, one row per team per season). | The per-season pin stays: `src/hooks/teams/seasonBreakdown/__tests__/processSeasonMatches.test.ts` ("reads the opponent division for the season being processed"). |
| 2026-11-16 | Hidden is where an admin moves a team AFTER it drops out. Its games are real games. (Doug read this from his live data; the earlier "leave them out" answer was built on a wrong belief.) | **Leaving Hidden games out was wrong.** The move overwrites the old division with no history (migration `20260812130000` header), so the opponent was in a real division when they played. Today: the Power Score finds the real division for each game (see League rules); Career drops them; the Team page counts them as Competitive (wrong tier for some). Doug's data: 22 games against 8 Hidden teams; **all 22 have a known real division** (13 from `v_team_last_known_division`, 9 from Doug's memory, not in the database; see League rules). **Nothing built.** The proper fix is its own slice, and needs supabase-data and Doug: WHERE to keep a dropped-out team's division for a given season (the season stats row is overwritten with Hidden; the archive row may be too). | Nothing enforces it yet. Open item: `docs/untangle-decision-log.md`, "Slice 6 result", "Open". The Career comment that calls Hidden "administrative" (`calculateDivisionRecords.ts:21`) holds the same wrong belief; not changed. |
| 2026-11-16 | Team page sweep rate: he took the recommendation ("leave ties out", like Career). | **BUILT 2026-11-16 (Slice 6).** The Team page sweep rate is sweeps divided by matches with a winner (wins plus losses). A tied match (completed, no winner) is no longer in the bottom number. Example: 8 completed matches, 4 wins (2 sweeps), 3 losses, 1 tie: 2/8 = 25.0% became 2/7 = 28.6%. A team with no tie does not change. The same number feeds the Report Card "Offense" grade (1 of 9.5 weight) and the weekly recap grades, so a team with a tie goes up and other teams can shift one place; published recaps keep their stored facts. The Season Breakdown row was already tie-free, so the two numbers now agree. | Enforced by tests: `src/utils/teamDetailsUtils/__tests__/teamDetailsUtils.test.ts` ("leaves a tied match out of the sweep rate bottom number", "reports a zero sweep rate when every completed match was a tie"). Code: `sweepRateUtils.ts:12-17`. |
| 2026-11-16 | Create Bracket form order: first told "it sorts by raw score", then asked again after the code showed the list was A to Z. He chose best-first, the same order as the saved bracket. | **BUILT 2026-11-16 (Slice 6).** The Create Bracket team list shows teams best first: displayed power score (one decimal), then division tier, then win %, then name; a team with no score last. This is the order `createBracket` uses for teams with no manual seed. **Before, the list was A to Z** (the hook sorted by raw score, but the container showed the unsorted `teams` prop). Why it matters: one drag in `SeedOrderList.tsx` renumbers every listed team in the SHOWN order and sends those as manual seeds, so one drag used to lock A to Z. Not changed: `bracket-creator.ts` (the saved seeds), the hook's own sort and `seedAssignment.ts`. **Follow-ups Doug approved the same day:** the score chip shows one decimal (`formatPowerScore`) and no chip for a score of 0; the "#" is the team's place in the list shown, 1 to N (see the next row). **Disclosed:** the list is cached 5 minutes; a team with no score reads 0 in the picker (the team service does `?? 0`) but sinks last in the saved bracket; admins lose "find a team A to Z". | Enforced by tests: `src/utils/rankingUtils/__tests__/seedOrder.test.ts`, `src/components/playoffs/form/__tests__/BracketFormTeamsContainer.test.tsx` ("List order", with the `teams` prop) and `src/services/__tests__/bracket-creator.seedOrderParity.test.ts` (same teams through `createBracket` and the util give the same order) and `src/components/playoffs/form/__tests__/TeamSelectionForm.test.tsx` (the one-decimal chip, no chip for 0). Code: `src/utils/rankingUtils/seedOrder.ts`, `BracketFormTeamsContainer.tsx:153`, `TeamSelectionForm.tsx` (chip). |
| 2026-11-16 | The "#" on each team in the Create Bracket picker (Select tab): Doug chose "place in the shown list, 1 to N". Before, it showed a stored `teams.seed` if the team had one, else its place. 47 teams have stored seeds (live count) that the bracket ignores. | **BUILT 2026-11-16.** The "#" is the team's place in the list shown, 1 to N, the order the bracket uses. A division list starts at #1. A team with no stored seed shows its place, not "#0". Stored seeds show only in the Seeds tab and Manage Seeds, which keep renumbering on drag. The bracket honours only a seed the admin types or drags in the same session, not the stored one (`BracketCreationDialog.tsx:142-147`). | Enforced by tests in `src/components/playoffs/form/__tests__/TeamSelectionForm.test.tsx` (`"#" badge`: stored seeds 7, 9, 2 show #1, #2, #3 in row order; a short list and a seed of 0 start at #1). Code: `TeamSelectionForm.tsx` (`renderTeamButton`, `seed={index + 1}`). |
| 2026-11-16 | Head-to-head edge cases: Doug ran the two read-only checks. | **Nothing built; behaviour left as it is and now pinned.** Check 1 (a completed match with a winner and no loser): **0 rows** live. Check 2 (a playoff match with a winner and loser whose status is not completed): **8 rows, all Fall 2025**, each with a winner and a score, status "in_progress" or "pending". Both readers count those 8 today. So the two readers still disagree on one edge: a winner with a NULL `loser_id` is dropped by the view (`get_head_to_head_records`) and counted by `get_batch_head_to_head`. If Doug says any of the 8 were never played, that is a new question. | Enforced by `supabase/tests/head_to_head_records.sql` (the "Today's behaviour, pinned" block; run on Postgres 16, CI uses 15). |
