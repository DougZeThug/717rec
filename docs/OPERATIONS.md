# Operations Runbook

Audience: Doug at 9pm on a Tuesday. Plain language. If something in here is out of date, fix it before you close the laptop.

Companion docs:

- [`PRODUCTION_SETTINGS.md`](PRODUCTION_SETTINGS.md) — the checked baseline of every dashboard setting (expected value + last-verified date). This doc is the _actions_; that one is the _settings_.
- [`SECRETS.md`](SECRETS.md) — which env vars exist and how to rotate them.
- [`RELEASE_AND_DEPLOYMENT.md`](RELEASE_AND_DEPLOYMENT.md) — version bumps, publish steps, rollback.
- [`E2E_REAL_BACKEND.md`](E2E_REAL_BACKEND.md) — real-backend end-to-end tests.

---

## 1. Production settings inventory

The full inventory of every out-of-repo dashboard setting — Supabase Auth,
passwords, rate limits, backups/PITR, API schemas + RLS, edge-function secrets,
the pg_cron job, hosting/DNS/HTTPS, monitoring — now lives in one place:

**➡️ [`PRODUCTION_SETTINGS.md`](PRODUCTION_SETTINGS.md)** — the checked baseline
(setting · where · expected value · why · last verified).

It's kept separate so there's a single source of truth for "what should each switch
be set to," and this runbook can stay focused on "what do I do when something
breaks." When you re-verify a setting, date the row **there**, not here.

---

## 2. League-night playbook

Symptom-first. Skim the bold lines; drop into the sub-steps only when you're the one clicking.

### 2a. A score won't submit (public score-report form)

The public form has an app-level rate limit: **5 submissions per 10 minutes per IP**, after which it returns "Too many requests. Please try again later." (HTTP 429). This is enforced in the `submit-score-report` edge function, not a dashboard setting.

1. **Did it maybe already go through?** Check the pending queue first: **Admin → League Night Status → Pending queues → Score reports** (or the Scores tab). A submitted-but-unapproved report sits there — it isn't lost.
2. **Rate-limited?** If they've retried several times within a few minutes, they've likely hit the 5-per-10-min cap. Wait it out, or just enter the score yourself via **Mass Score Entry**.
3. **Nothing lands at all, for anyone?** Treat it as "Site is down" (§2f) and check Supabase status.

### 2b. Live scoring is stuck (round won't advance, throws don't register)

1. **Refresh the scorer's browser once.** Realtime channels re-subscribe on mount; a stale WebSocket is the most common cause.
2. **Check Supabase Realtime status** — Dashboard → Project status. If red, wait; nothing on our side to do.
3. **Open Admin → Live Corrections for that match.** You can edit or delete any round. If the match is already finalized, fix the rounds first and then press **Reopen & re-save result** on the same panel — it runs `reopen_live_match` and `finalize_live_match` in that order, which is mandatory because finalize refuses to run on a match that still has a result. It asks first; both teams' records are reversed and re-applied. If the games no longer decide a winner, the old result is reversed and the save is refused: the toast says so and the match is left open for you to fix. A match that ended in a **tie** (completed with no winner) reopens the same way — it moves no team records, because `mark_match_as_tie` already removed them, and it clears the confirmed-tie stamp.
   **An archived season is read-only here** — the controls are absent and the write is refused.
4. **Last resort: Mass Score Entry.** Enter the final game scores manually. This bypasses live scoring entirely and reverses/re-applies stats.

### 2c. Wrong score was approved

**First: was it live-scored?** If the match is listed in **Admin → Live Corrections**, yes. Scores and Live Corrections take off the old result and put on the new one in the same save. You do not undo anything first.

**Wrong winner or wrong 2–0 / 2–1 (not live-scored)**
1. **Admin → Scores**. Pick the night with **Filter by Date**.
2. On the match card, tap the correct button: **2–0**, **2–1**, **1–2** or **0–2**. "Edited" shows.
3. Tap **Submit (1) Changes**. It does not ask first. Both teams' records and the standings change in that save.

**Wrong result on a live-scored match.** Do not use Scores for this. Scores changes the result but not the rounds, so the match lands on **League Night → "Matches that disagree with their rounds"**, and a later re-save puts the old result back.
1. **Admin → Live Corrections**. Check **Season** and **Night**, then tap the match.
2. Fix the bad round (pencil → **Save changes**), or tap **Change winner** on the game → **Set winner**.
3. Tap **Reopen & re-save result** → **Reopen & re-save**. Wait for "Result re-saved". If the games no longer give a winner, the match stays open. Fix the games and re-save.

**It should have been a tie.** **No button in the app does this.** Scores has no tie choice, and Live Corrections will not save a result with no winner. Leave the result as it is and get a developer: the fix is the database function `mark_match_as_tie`, run as an admin user. Do not run it yourself without help — a wrong match ID changes a different match. Afterwards, **Admin → Score approvals → Unresolved matches → It was a tie** clears it from that list.

**Wrong teams.** A finished match has no Edit pencil.
1. **Admin → Scores** → bin on the card → **Delete**. Both teams' records are reversed. Live rounds are deleted too.
2. **Admin → Match Creation**. Pick the Thursday, both teams and a timeslot → **Create Matches**.
3. **Admin → Scores**. Tap the result → **Submit (1) Changes**.

**Standings** change in the database in the same save. Your own screen refreshes by itself. Other people's phones can keep showing old numbers until they reload the page.

### 2d. Standings look wrong (a team's W-L doesn't match its games)

Stored win/loss counters can drift from the real match history after manual DB edits, a restore, or a bulk import. There's a built-in checker — no SQL required:

**First, rule out a wrong result.** Check **Admin → League Night Status →
"Matches that disagree with their rounds"**. If a match was corrected and never
re-saved, its recorded result and its rounds say different things. The card names
it; **Reopen & re-save result** in Live Corrections fixes it. Clear that before
reconciling counters, or you will reconcile to a result that is itself wrong.

1. **Admin → League Night Status → "Standings counters" card.** It reads the `v_counter_drift` view and tells you, in plain language, whether every team is in sync or lists the ones that aren't.
2. If any are out of sync, click **Repair now** — it recomputes every team's wins/losses/game counts from completed matches (`reconcile_team_counters()`) and refreshes the stats cache. Safe to run any time; it does nothing when counters already match.
3. **Prefer SQL, or no admin UI handy?** The equivalent reconciliation query and the manual `UPDATE` fix are in §3b.

### 2e. A submitter reports a score dispute and it looks like a duplicate got swallowed

Dedupe key is `(match_id, md5(message), submitter_name)` — two different submitters with the same text are kept separately. If a genuine dupe from the same submitter needs to be re-opened, delete it from `score_submissions` in the SQL editor and ask them to re-submit.

### 2f. Site is down

1. **Is it just you?** Open `https://717rec.app` in an incognito window on cellular.
2. **Lovable status:** https://status.lovable.dev
3. **Cloudflare status:** https://www.cloudflarestatus.com
4. **Supabase status:** https://status.supabase.com — if the database/API is down, the site loads but nothing saves.
5. **Rollback:** if a recent publish broke things, follow `RELEASE_AND_DEPLOYMENT.md` → Rollback → Option A (redeploy previous tag from Lovable). Two clicks.

### 2g. Who to contact

- Lovable support: in-app chat, or support@lovable.dev
- Supabase support: dashboard → Help
- Doug: you're reading this

---

## 3. Recovery basics

### 3a. Restoring from a Supabase backup

1. Dashboard → Database → Backups.
2. Pick the most recent backup **before** the incident (or the PITR timestamp).
3. Click **Restore**. Supabase restores to a new database; you then swap it in. **This takes minutes to an hour.** Don't do it casually.
4. After restore, run the reconciliation query in §3b and record the result.

### 3b. Standings reconciliation query

Run any time you've done manual DB surgery, a restore, or a bulk import. Expected result on a clean database: **zero rows**. Any rows mean the `teams.wins / losses / game_wins / game_losses` counters have drifted from the underlying `matches` data (regular season only — playoff matches carry a `bracket_id` and are excluded).

```sql
WITH agg AS (
  SELECT t.id,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.loser_id  = t.id THEN 1 ELSE 0 END), 0) AS losses,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.team1_id = t.id THEN m.team1_game_wins
                      WHEN m.iscompleted AND m.team2_id = t.id THEN m.team2_game_wins
                      ELSE 0 END), 0) AS game_wins,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.team1_id = t.id THEN m.team2_game_wins
                      WHEN m.iscompleted AND m.team2_id = t.id THEN m.team1_game_wins
                      ELSE 0 END), 0) AS game_losses
  FROM teams t
  LEFT JOIN matches m
    ON (m.team1_id = t.id OR m.team2_id = t.id)
   AND m.bracket_id IS NULL
  GROUP BY t.id
)
SELECT t.id, t.name,
  t.wins        AS stored_w,  agg.wins        AS calc_w,
  t.losses      AS stored_l,  agg.losses      AS calc_l,
  t.game_wins   AS stored_gw, agg.game_wins   AS calc_gw,
  t.game_losses AS stored_gl, agg.game_losses AS calc_gl
FROM teams t
JOIN agg ON agg.id = t.id
WHERE t.wins        <> agg.wins
   OR t.losses      <> agg.losses
   OR t.game_wins   <> agg.game_wins
   OR t.game_losses <> agg.game_losses;
```

**Demonstrated output:** run against the production DB on 2026-07-15 returned `[]` (zero drift rows — re-verified during PR-13 walk-through). Manufactured-drift check: `UPDATE teams SET wins = wins + 1 WHERE id = '<any-id>'` in a scratch DB produces exactly one row with `stored_w = calc_w + 1`; roll it back with the reverse update.

If drift is found, the fix is a targeted `UPDATE teams SET wins = <calc>, losses = <calc>, game_wins = <calc>, game_losses = <calc> WHERE id = '<id>';` per drifted row. Verify by re-running the query — expect zero rows.

---

## 4. Verification checklist

The dashboard-settings checklist — every Auth, backup, API, secret, cron, and
hosting row, in one walk — lives with the settings it verifies:

**➡️ [`PRODUCTION_SETTINGS.md` §8](PRODUCTION_SETTINGS.md#8-verification-checklist-doug)** —
do it once when adopting the doc, then quarterly (§9 there sets the cadence).

One data-integrity check belongs here rather than there, because it's about the
database's contents, not a dashboard toggle:

- [ ] SQL editor: run the reconciliation query in §3b. Expect zero rows. Record the date.

Nothing here changes code. If any step surfaces a surprise, open an issue instead of fixing it silently — future-you will thank present-you.

---

## 5. Merge gate: how code reaches `main`

Goal: **no commit lands on `main` unless CI has passed on that exact code.** Everyone — Doug, coding agents, and Lovable — goes through a pull request, and GitHub keeps the merge button locked until the required checks are green. This is the PR-02 setup from the 2026-07 quality review (`docs/quality-review-2026-07/briefs/PR-02-branch-protection-and-lovable-merge-gate.md`).

### 5a. The checks, by exact name

Branch protection matches checks by their **exact job name**. These are the current names from `.github/workflows/ci.yml` and `.github/workflows/supabase-ci.yml`:

| Check name (exact)                                                                   | What it runs                                                                                                                                                       | Required?                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Quality and tests`                                                                  | lint, typecheck, the full unit/integration test suite, knip dead-code scan                                                                                         | **Yes**                                                                                                                                                 |
| `DeepSource coverage`                                                                | full test run with coverage **thresholds** (fails if coverage drops below the floors in `vitest.config.ts`), then uploads to DeepSource                            | **Yes**                                                                                                                                                 |
| `Build and bundle size`                                                              | production build + bundle size budgets (`.size-limit.json`)                                                                                                        | **Yes**                                                                                                                                                 |
| `Browser smoke, a11y, and Lighthouse`                                                | Playwright smoke tests, axe accessibility scan, Lighthouse                                                                                                         | **Yes**                                                                                                                                                 |
| `React Doctor`                                                                       | third-party advisory scan                                                                                                                                          | No — advisory                                                                                                                                           |
| `E2E (real Supabase)`                                                                | real-backend e2e — **not currently defined in `ci.yml`**; the spec (`e2e/real-backend.spec.ts`) runs locally only. Re-adding the job is tracked in the PR-03 brief | No — n/a until PR-03 re-adds the job                                                                                                                    |
| `supabase db lint`, `Apply migrations + SQL smoke tests`, `Edge function Deno tests` | database CI — runs only when `supabase/**` changes                                                                                                                 | No — must stay advisory: the workflow is path-filtered, so requiring any of these would freeze every non-database PR on "Expected — waiting for status" |
| `npm audit`, `Gitleaks`, `No committed local env files`                              | security workflow — runs only when dependency/security-related files change                                                                                        | No — must stay advisory (also path-filtered, same freeze risk)                                                                                          |

**On the main-entry budget.** `.size-limit.json` caps the eagerly-loaded entry
chunk. It sat at 150 kB while the branch built at 149.99 kB — ten bytes of
headroom, so the gate rejected any new eager code regardless of merit. It is
155 kB now, chosen to leave room rather than to fit one change. Raising it is
the last resort, not the first: when this check goes red, find what newly
entered the entry before touching the number. The quickest way is to diff the
entry chunk's own sourcemap between the two builds —

```bash
npm run build
python3 -c "import json,glob;print('\n'.join(sorted(json.load(open(sorted(glob.glob('dist/assets/index-*.js.map'), key=lambda f: -len(open(f).read()))[0]))['sources'])))"
```

— which is how a navbar import was caught dragging the admin section table, and
its fourteen icons, into every visitor's download.

**Naming note:** the review brief says to require a check called "Quality, tests, and coverage". That job has since been split in two: the tests live in `Quality and tests` and the coverage thresholds moved to `DeepSource coverage`. Require **both** — together they are the old check.

**Caveat on `DeepSource coverage`:** the thresholds themselves are checked locally on the runner, but the last step uploads to deepsource.com. If DeepSource has an outage, this job goes red and blocks merging even though nothing is wrong with the code. If that ever blocks something urgent: Settings → Branches → edit the rule → temporarily untick just that check, merge, then re-tick it.

**On `React Doctor` and the auth effect.** This job reports
`effect-needs-cleanup` against `src/hooks/auth/index.ts` on every pull request
that touches the file. **The report is wrong, and it has been checked.** That
effect starts one timer and one subscription, and its cleanup cancels both. The
proof is a test — `src/hooks/auth/__tests__/useAuth.test.ts`, "cancels the timer
it scheduled when the effect is torn down" — which asserts on the _pending timer
count_ after unmount. That is the only assertion that separates a cancelled
timer from one merely left to fire into a guard: both callbacks check
`isCancelled` and do nothing either way, so "the callback did not run" would
pass in both cases. Remove the cancel and the test fails with
`expected 1 to be +0`.

The report survived four commits during PR #1469, including three correct forms
of the cleanup — tracking the timers, naming the id in a plain loop, and adding
the test. Do not rewrite that cleanup again to satisfy it.

**Do not switch the rule off to silence this.** The action takes no input that
disables a rule or excludes a path, and react-doctor's own `doctor.config.ts`
sets which rules run for the whole project — so the only available "off" is
everywhere, and the rule catches a real class of bug. The job is advisory
(`blocking` defaults to `none`), so it never blocks a merge; the only thing this
costs is the time it takes to re-investigate, which is what this note is for.

**"1 new issue vs `main`" often means "new to the diff", not "new in the code".**
The scan runs with `scope: changed`, so it only looks at files a pull request
touches. A finding that has sat in a file for months appears the first time any
PR edits that file, labelled as new. Before rewriting anything, measure it —
the checker runs locally, and comparing the file before and after takes a
minute:

```bash
npx react-doctor@0.9.14 --no-supply-chain --json \
  --json-out /tmp/after.json src/path/to/File.tsx
git show origin/main:src/path/to/File.tsx > /tmp/before.tsx   # then swap it in and repeat
```

This has already happened twice. The `effect-needs-cleanup` report above is one.

The other was `no-high-complexity-react-function` on
`CareerRankingsSection.tsx`, reported as new when that file was consolidated —
measured at cyclomatic 22 / cognitive 21 both before and after the change, so
the edit had added none of it. **Measuring is for deciding whether you broke it,
not for deciding whether to fix it.** That one was pre-existing and got fixed
anyway: the theme ternaries moved to `career/careerCardStyles.ts` and the header
to `career/CareerRankingsHeader.tsx`, which cleared the finding and took the
file from 168 lines to 101. Two earlier cards had already been through the same
split — `fullRankingsStyles.ts` with `StandingsCardHeader.tsx`, and the private
helpers in `AllTeamsCareerPowerScoreChart.tsx` — so when this rule fires on a
themed card, that is the move, and there are three worked examples of it.

### 5b. One-time setup (Doug, ~10 minutes, all in web UIs)

**Lovable side:**

1. Lovable → Project → Settings → GitHub: switch Lovable to commit to a **dedicated branch** (e.g. `lovable/edits`) instead of `main`. Every Lovable edit then arrives as a pull request and faces the same checks as everyone else.

**GitHub side** (repo → Settings → Branches → Add branch protection rule):

1. Branch name pattern: `main`
2. Tick **Require a pull request before merging**, and leave its "Require approvals" sub-box **unticked** — that is how you get zero required approvals (solo maintainer: the checks are the gate, not human review). Don't tick it by mistake: GitHub won't let you approve your own PR, so requiring even one approval would block every PR you open yourself.
3. Tick **Require status checks to pass before merging**, and under it tick **Require branches to be up to date before merging**.
4. In the status-check search box, add the four required checks by exact name: `Quality and tests`, `DeepSource coverage`, `Build and bundle size`, `Browser smoke, a11y, and Lighthouse`. The box can only offer checks that have actually reported on this repo in roughly the last week — it does **not** accept typed-in names. If one is missing, open (or re-run checks on) any recent pull request — the PR that added this section works — wait for CI to finish, then reload the settings page. After saving, re-open the rule and confirm all four names are listed: a silently missing one means the gate is weaker than you think.
5. Tick **Do not allow bypassing the above settings**. Do not add any app or bot to a bypass list — the whole point is that Lovable's bot goes through the gate too.
6. Leave force-push and branch-deletion protection at their defaults (blocked).

Last verified: _fill me in_

### 5c. Why CI runs on every PR now (even docs-only ones)

GitHub has no "required only when these files change" concept. `ci.yml` used to skip PRs that touched only docs; combine that with required checks and a docs-only PR would sit forever on "Expected — waiting for status" with the merge button locked. So the `pull_request` trigger in `ci.yml` deliberately has **no `paths:` filter** — every PR runs and reports all four required checks. A docs-only PR burns some free runner minutes; a permanently unmergeable PR costs more.

Related trap, for future-you: don't "optimize" this with `if:` conditions on the jobs — GitHub counts a **skipped job as satisfying a required check**, which quietly turns the gate into a rubber stamp. (Same reason the PR-03 brief prefers deleting a job over disabling it.)

The Supabase workflow keeps its `supabase/**` path filter — that's fine, because none of its jobs are required.

### 5d. Prove the gate works (do once after setup)

- [ ] Branch off `main`, make one unit test fail on purpose (flip an assertion), push, open a PR → merge button disabled, "Required statuses must pass".
- [ ] Fix the test, push again → button unlocks once checks go green.
- [ ] Try a direct `git push origin main` with a trivial commit → GitHub rejects it.
- [ ] Make a small Lovable edit → it appears as a PR from `lovable/edits`, **not** a commit on `main`.
- [ ] A week later: `git log --oneline -10 main` shows only commits that came through a PR — each one either starts with "Merge pull request #…" or ends with a PR number like `(#1060)` (squash merges). Bot-authored commits are fine _if_ they carry a PR number; what must not appear is a commit with no PR behind it.

### 5e. Known limits, fallback, rollback

- **Lighthouse is still warn-only** inside the Browser check until PR-03 lands — a Lighthouse score drop alone won't block a merge yet. Failing tests, build, bundle budgets, smoke, and axe all hard-block already.
- **If Lovable can't commit to a branch** (Option B in the PR-02 brief): note that the 5b rule as written would hard-block Lovable — it rejects _all_ direct pushes to `main`, so the bot's edits would fail outright rather than sneak through. Running Option B means deliberately punching a hole for the bot: set the protection up as a repository **ruleset** instead of a classic rule, with the Lovable app on the ruleset's bypass list (a classic rule can't exempt one app from required status checks). Then add a fast-repair routine (open an issue or fix PR within the hour whenever `main` goes red). That is a stop-gap, not a gate — record here that the gate is not fully in force, and revisit when Lovable ships branch support.
- **Rollback:** delete the branch protection rule (Settings → Branches) and revert the docs/workflow commit. Nothing in the product changes either way.

---

## 6. Applying database migrations to production

New files in `supabase/migrations/` do **not** reach the live database on
their own. Only schema changes made _through Lovable_ are applied by
Lovable; the database CI job ("Apply migrations + SQL smoke tests", see
`docs/SUPABASE_CI.md`) replays migrations in a throwaway container to check
they run — it never touches the real project.

So whenever a PR merged through GitHub adds a migration file, someone must
apply it to production by hand:

1. Open the Supabase dashboard → SQL Editor.
2. Paste the contents of each new migration file, oldest timestamp first.
3. Run each one. Repo migrations are written to be idempotent
   (`IF NOT EXISTS` / `CREATE OR REPLACE`), so re-running is safe.
4. If the migration changed tables or columns, the next Lovable schema
   change will refresh the auto-generated
   `src/integrations/supabase/types.ts`; until then that file lags the live
   schema (compile-time only — runtime is unaffected).

Skipping this step leaves the app's code ahead of the database. That is
exactly what broke bracket creation on 2026-07-23: PR-13's two migrations
(`20260722160000`, `20260722170000`) were merged on GitHub but never
applied, so every bracket-creation insert failed with PGRST204 "Could not
find the 'opponent1_position' column of 'match'".

> ### Applying the name check function `is_username_taken` — **done**
>
> Applied on 2026-09-28 through Lovable, which wrote and applied its own
> migration, `20260928121245_0920861a-….sql`, rather than the repo's, and
> regenerated the types. Its parameter is `_username`, so `ProfileService`
> calls `supabase.rpc('is_username_taken', { _username: username })` directly.
> The PR's own migration (parameter `p_username`) and its temporary cast were
> dropped.
>
> **The lesson:** asked to apply a repo migration, Lovable may write its own
> copy, under a new file name and with its own parameter names. Postgres cannot
> rename a parameter with `CREATE OR REPLACE`, so two copies of one function
> that name it differently break the migration replay in CI. After Lovable
> applies a migration, compare its copy with the repo's, keep one, and call the
> function with the parameter names in the regenerated `types.ts`.
>
> Verify in the SQL editor that `has_function_privilege('anon',
> 'public.is_username_taken(text)', 'EXECUTE')` is false and the same check for
> `authenticated` is true. `supabase/tests/username_availability.sql` covers the
> function in the `db-apply-and-smoke` CI job.

> ### Applying `20260922120000_start_game_with_roster.sql` (B-67) — **done**
>
> Applied to production on 2026-09-22, before the change merged, and the types
> were regenerated straight after. The temporary cast is gone and
> `LiveMatchService` calls `supabase.rpc('start_game_with_roster', …)`
> directly. Kept here as the worked example for the next migration that a
> release depends on.
>
> **The ordering is the transferable part: database first, code second.** The
> migration only *adds* a function, so applying it early changes nothing for
> players. Merging first does not work the same way: the moment the code is
> live it calls a function that may not exist, and Start Game fails — cleanly,
> as "live scoring is not enabled" via `PGRST202`, but it fails.
>
> 1. Open the Supabase dashboard → SQL Editor. Paste the **full** contents of
>    `supabase/migrations/20260922120000_start_game_with_roster.sql` and Run.
>    The file is `CREATE OR REPLACE`, so re-running it is safe.
> 2. Regenerate the types. In Lovable, ask it verbatim: _"Apply the SQL migration file
>    `supabase/migrations/20260922120000_start_game_with_roster.sql` from the
>    GitHub repo to the project database, then regenerate the Supabase types."_
> 3. Verify, in the SQL editor:
>
>    ```sql
>    SELECT proname FROM pg_proc WHERE proname = 'start_game_with_roster';
>    ```
>
>    One row. Then open a live match in the app and tap **Start Game**: both
>    sides must show their players in the thrower bar. Neither may read
>    "No players selected" — that empty state is the symptom B-67 was about.
>
> 4. Delete the temporary cast and call `supabase.rpc` directly.
>    `npm run typecheck` is the check that it worked: it only passes once the
>    regenerated types actually carry the function.
>
> A cast like that is what keeps CI green in the window between a migration
> being written and the types catching up — `types.ts` is generated and must
> not be hand-edited, and `Database` is a type alias, so it cannot be augmented
> from another file either. Write the removal into the runbook when you add
> one, or it stays for good.
>
> `supabase/tests/start_game_with_roster.sql` covers the invariants and runs in
> the `db-apply-and-smoke` CI job.

> **Applying the 2026-08 power-score rollout** (`20260811205000` –
> `20260812140000`) has its own runbook, because it rewrites stored history and
> ships a tested way back: **`docs/POWER_SCORE_ROLLOUT.md`**. Run the backup
> migration first, and do not skip its verification output.

> **Applying the power score weight sandbox** (`20260820120000`) also has its
> own runbook: **§6b** below.

> **Applying the archive counter-reset guard** (`20260909120000`) is urgent
> whenever the Seasons screen is deployed with its per-card **Archive** button.
> Before this migration, `archive_season` and `partial_archive_season` reset
> **every** team's live wins, losses and game counts, whichever season was being
> archived. That is correct for the active season and destructive for any other,
> and it was safe only because the UI would not let an admin archive anything
> else. Apply the migration **before** the code that offers the button, or an
> admin closing out an old season will zero the current season's standings for
> the whole league.

> **Applying the tie rule for Win %** (`20261006120000`) has its own runbook:
> **§6e** below. It changes stored scores in every season, archived included,
> so run its backup script first.

> **Applying the career power score fix** (`20260901120000`) has its own
> runbook too: **§6c** below. It changes who holds the King Slayer badge, so
> read what players will notice before you run it.

> **Applying the unrated-division career bonus** (`20261117120000`) has its own
> runbook: **§6f** below. **Database first, then merge.** It changes no number
> today, and it ships a check and a way back.

> **Seasons are created inactive** (`20260826120000_seasons_created_inactive.sql`).
> One statement, no runbook: it sets `public.seasons.is_active` to default
> `false`. Existing rows are untouched, so whichever season is active stays
> active. Until it is applied, a season inserted directly in the SQL Editor
> without an explicit `is_active` comes out **active** and can sit alongside the
> running season — which makes every season-scoped page throw "Data integrity
> violation" (B-37). The app itself is already safe: `createSeason` sends
> `is_active: false` explicitly.

## 6a. Power-score unification: review, revert, reapply

The power-score unification (migrations `20260809*`) put every page on one
formula: playoff games count, byes do not, and historical ratings are
division-weighted. Because `upsert_team_season_stats()` re-derives **all**
seasons, Career Statistics on `/stats` re-orders when it is applied. The old
numbers are snapshotted first into two RLS-locked backup tables
(`team_season_stats_pre_unification`, `team_details_power_pre_unification`).

Migration `20260810120000` adds the admin controls for that change, surfaced
in the admin panel under **Operations → Power Score Review**:

- **Status banner** — whether the unification is applied, reverted, or not on
  the live database at all, plus when the backup was taken and how many rows
  it holds. A friendly "not applied yet" card (never an error) shows until the
  migrations reach production (see §6 for why merged ≠ applied).
- **Career Standings comparison** — old rank → new rank, old/new career power
  score, per-team deltas, and an expandable per-season breakdown. "Before" is
  computed by feeding the backup through the same career calculators `/stats`
  uses, so it shows the site as of the backup date. Teams created since are
  flagged "New since backup"; backup rows of deleted teams are ignored. The
  comparison is shown while the new formula is applied; in the reverted state
  the live site _is_ the old formula, so the tab explains that instead of
  showing an old-vs-old table.
- **Revert / Re-apply** — one click each, behind a confirmation dialog.
  Revert does **not** copy backup rows back: it restores the old view
  definitions and recomputes every season from match history, so games played
  after the backup are kept, not lost. Re-apply is the mirror image. Both also
  prune stored season rows the active formula no longer produces (a team whose
  only playoff result was a bye has a row under the old formula but not the
  new one). Both are idempotent and admin-only (`Admin access required` for
  everyone else).

Caveats:

- **Do not press Revert or Re-apply after §6e is applied.** Both buttons
  rebuild the views from text saved in `20260812171710`, which still counts a
  tie as a loss in Win % and the Power Score. Either one quietly undoes §6e.
  This is a pre-existing problem with those controls and needs its own fix.
- **Do not press this Revert (the §6a one). §6g is applied.** It puts back the old
  formula, which never reads `power_score_division_override`, and rewrites every
  stored season with it. The override step in the rated view stays, but nothing
  reads it. See §6g. (The Sandbox weights **Revert** in §6b is a different button:
  it only goes back to the previous three weights, and it keeps the fix.)
- The homepage **Movers** section diffs against last week's
  `power_score_snapshots` row, so it can look skewed for up to a week after a
  revert or re-apply. It self-corrects at the next weekly snapshot (or run the
  `capture-power-snapshots` edge function manually).
- The backup tables are safe to drop only once the new numbers have been
  reviewed and accepted on the live site. After that the tab hides the Revert
  button and the comparison and says the backup is gone, rather than offering
  actions that would fail.

### Archived seasons are frozen (from 2026-08-12)

`upsert_team_season_stats()` no longer updates `power_score`, `sos` or
`division_name` for a season once `seasons.is_archived` is true. This closes the
defect where changing a team's division — or re-weighting a division — silently
rewrote finished seasons, because the rating used to resolve every opponent
through their _current_ division.

Consequences to know:

- **A data repair on an archived season will not show up on its own.** Run
  `SELECT public.admin_recompute_season_power('<season_id>');` (admin only). It
  returns the number of rows updated.
- **The Revert / Re-apply formula controls are exempt.** Both end with
  `upsert_team_season_stats(true)`, which bypasses the freeze, so a formula
  change still reaches archived seasons. Without that opt-in the controls would
  report success while History and Career silently kept the previous formula.
  Every other caller uses the zero-argument form and stays frozen.
- **The one-time backfill already ran** in migration
  `20260812130000_power_score_historical_opponent_division.sql`, before the
  freeze was installed. Pre-change values are in
  `team_season_stats_pre_division_history`.
- **Movers will show a one-time jump** the week that migration ships, because
  `power_score_snapshots` rows are deliberately left alone — they record what
  was true that week and rewriting them would erase the trend history. It
  self-corrects at the next weekly snapshot.

Three related tables are worth knowing about:

- `division_weight_history` — every division's weight over time, maintained by a
  trigger on `divisions`. A match is rated with the weight in effect on its
  date. History starts at the migration above; earlier weight edits were never
  recorded and cannot be recovered.
- `division_archive_distrust` — seasons whose `team_details_archive.division_id`
  must not be trusted as a point-in-time division. Summer 1 and Summer 2 2025
  are seeded, because theirs were backfilled in Jan 2026 from then-current
  values. Add a row (with a reason) rather than editing a view if another season
  turns out to be affected.
- `power_score_division_override` — the division one team had in one season,
  read first by the rated view. **Applied on 2026-11-18.** See §6g.

## 6b. Power score weight sandbox: preview, save, revert

The **Power Score Sandbox** (Admin → Scores & Stats → Power Score Sandbox)
lets you change how much the three parts of the Power Score count — match
wins, strength of schedule, game wins. The standard (default) mix is 40/45/15.
The mix that was live on 2026-11-17 is 40/50/10 (applied 2026-09-03). You can
preview any mix safely: nothing changes until you press **Save & rescore**.

### One-time setup (its migration, applied by hand — see §6 for why)

1. Merge the PR. The site deploys the new tab first. The tab shows a friendly
   "controls aren't on the live database yet" card. Previews still work
   (against the standard 40/45/15), Save stays locked, and nothing changes for
   players. Doing this step and step 2 in the other order is also fine.
2. Open the Supabase dashboard → SQL Editor. Paste the **full** contents of
   `supabase/migrations/20260820120000_power_score_weight_sandbox.sql` and
   Run. Success looks like:

   ```
   NOTICE: power score weight sandbox installed: weights 40/45/15, NNN season rows
   ```

   The weights in that line are the latest row of `power_score_weight_history`.
   40/45/15 is what they were when the Sandbox was first installed. The live
   numbers are in `power_score_weight_history` (40/50/10 on 2026-11-17).

   Prefer Lovable? Ask it, verbatim: _"Apply the SQL migration file
   `supabase/migrations/20260820120000_power_score_weight_sandbox.sql` from
   the GitHub repo to the project database, then regenerate the Supabase
   types."_ That also refreshes `src/integrations/supabase/types.ts`, which
   otherwise lags harmlessly (compile-time only).

3. Verify, still in the SQL editor — all three:
   - `SELECT * FROM get_power_score_weights();` → one row, the live weights (`40 / 45 / 15` at the first install; `40 / 50 / 10` on 2026-11-17)
   - `SELECT power_score_100(1, 1, 1);` → `100`
   - `SELECT * FROM admin_audit_coverage_drift();` → no rows
4. Reload the admin panel. The tab now shows the live-weights banner and Save
   works. **No scores have changed yet** — the starting numbers were 40/45/15,
   the same as the site used when the Sandbox was installed. The live numbers
   now are in `power_score_weight_history` (40/50/10 on 2026-11-17).
   Re-running the migration later is safe: it re-reads the latest weights
   instead of resetting them.

### Using it day to day

- Type a new mix (the three numbers must add up to 100 — **Balance SOS**
  fills in whatever is left) and watch both previews re-rank live: the
  current season by division, and the full Career standings. The preview is
  computed in the browser; the database is untouched.
- **Save & rescore** applies the mix for real: every stored season is
  recomputed under it, **archived seasons included**, in one transaction.
  Who changed what, when, and any note you typed is recorded in
  `power_score_weight_history` (append-only — nothing is ever overwritten).
- **Revert** goes back to the previous mix the same way, and reverting a
  revert toggles back again.
- **Any save rewrites the stored scores of every season** from the live rules.
  Before 2026-11-18 a save would have changed 62 team-seasons in the three oldest
  seasons (older rule changes never recomputed). **That warning is gone: §6g was
  applied on 2026-11-18 and those seasons are recomputed. A save now uses the new
  rules** (the rated view reads the override table), so **it keeps the fix.** It
  still rewrites every season, and on the live database it writes `power_score` and
  `sos` with 3 decimals (see §6g, "Rounding"). The Save button is off when the typed
  numbers equal the live numbers, so a save with the same weights (the screen says
  "reasserted") needs a stale tab or a second admin. Revert works the scores out
  again from the live rules: it does not restore old stored numbers. See
  `docs/untangle-decision-log.md`, "Power Score check result (2026-11-17)" and "Job
  C result".

Caveats:

- The homepage **Movers** section compares against last week's
  `power_score_snapshots` row, which is deliberately never rewritten, so it
  can look off for up to a week after a save or revert. It corrects itself at
  the next weekly snapshot (or run the `capture-power-snapshots` edge function
  manually). The tab's confirmation dialog warns about this too.
- The §6a **Revert** control restores the old pre-unification views, which
  carry their own built-in numbers — while that state is active, sandbox
  weights have no effect. (Known, pre-existing, and not caused by the
  sandbox: §6a's **Re-apply** lacked the newer `career_power_score` column
  until migration `20260820184423` patched `admin_reapply_power_score_unification()`.
  Confirm that migration is applied on the live database before anyone uses
  the §6a controls.)

## 6c. Career power score: making the badge agree with the screen

The King Slayer badge is decided in the database, and its career power score
had drifted from the one shown on the Career standings — far enough to award
and refuse the badge on numbers nobody could see. Migration
`supabase/migrations/20260901120000_career_power_score_match_app.sql` makes
the database compute the same number the app does.

**Apply it the same way as §6b:** Supabase dashboard → SQL Editor → paste the
**full** contents of that file → Run. It is safe to re-run.

What it does, in order:

1. Adds `resolve_division_bonus_weight(name)`, which reads division weights
   from the `divisions` table instead of the copy that used to be written into
   the function.
2. Replaces `calculate_career_power_score(team_id)` with the app's formula.
3. Re-checks the **King Slayer** badge for every team in the active season, so
   badges do not stay as the old formula left them until each team next plays.

**What players will notice.** Some teams gain King Slayer and some lose it, on
the next page load. Nothing else moves: this function is used by that badge and
nothing else, and it writes to no table other than `team_badge_events`. Power
scores, standings and the Career table are untouched.

**How to check it worked.** Open a team holding King Slayer and the team it
beat, and compare their two career power scores on the Career standings. The
gap should be 25 or more. Before this migration it did not have to be.

**If it needs undoing.** Re-run
`supabase/migrations/20260310140000_fix_career_power_score_double_count.sql`,
which restores the previous function body, then re-run the badge recheck block
at the foot of the newer migration. Note that this puts the badge back on a
number that disagrees with the screen.

**Since 2026-11-16** a division with no known weight is left out of the bonus
instead of counting as 0.85. See **§6f**.

## 6d. Publishing a weekly content pack

Plain-language runbook for **Admin → Weekly Content Pack**. Full behaviour:
[`docs/product-description/admin/weekly-content-pack.md`](product-description/admin/weekly-content-pack.md).

### The normal week

1. Open **Admin → Weekly Content Pack**.
2. Pick the season and the week that just finished. Press **Generate draft**.
3. **Read the warnings.** They are specific on purpose:
   - _No power score snapshot for week N_ — publishing is blocked. Either the
     week has no snapshot, or no team in it has a power score. Run the
     `capture-power-snapshots` edge function, then generate again.
   - _Compared against week M_ — a snapshot is missing, so the movement covers
     more than one week. Fine to publish; the page says which week it used.
   - _N matches still have no result_ — enter the missing scores first if you
     want the recap to be complete.
   - _The power rankings will show no movement_ — there is no earlier week to
     compare against, so every team shows a dash instead of an arrow. Fine to
     publish; the ranks and grades are still correct.
   - _N teams joined the rankings this week_ — they were not in last week's
     snapshot, so they show a dash rather than a climb from nowhere.
4. Rewrite the headline. Add a Commissioner's note — the database knows who won,
   not who finally beat their brother.
5. **Write it for me** for a livelier caption, then edit it. The line under the
   box says where the current text came from.
6. In **Power rankings**, press **Write blurbs for me** to fill every team's
   line in one go, then edit any of them. Every team starts with a plain line
   built from its own results, so this step is optional.
7. **Download graphics**, post them, **Publish**.

### Fixing a published recap

Generate the same week again, correct what is wrong, and press **Publish
correction** with a short note. The version that was live is kept — the
database has no UPDATE or DELETE on versions at all — and the public page shows
"Published <date>, corrected <date>".

If it needs to come down instead, press **Unpublish**. The home page goes back
to its live recap card and nothing is deleted.

### When something is wrong

| Symptom                                     | Cause                                                      | Fix                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Publish is greyed out                       | No snapshot, no scored team, or nothing happened that week | Run `capture-power-snapshots`, then generate again                                                             |
| "AI captions are not set up"                | `ANTHROPIC_API_KEY` is not set                             | Add it in Supabase → Edge Functions → Secrets, or write the caption by hand                                    |
| "AI blurbs are not set up"                  | The same key is not set                                    | As above. The plain lines built from the results are used until then, and you can edit any of them             |
| A team's blurb is missing after generating  | The writer skipped it, or named a team that does not exist | Unknown teams are dropped on purpose. That team keeps whatever line it had; write one yourself                 |
| A downloaded PNG has the wrong fonts        | The font files did not load                                | Reload the page and download again                                                                             |
| A team's logo is missing from a graphic     | The image could not be fetched                             | The graphic draws that team's initials instead; check the logo in Admin → Teams                                |
| A shared link previews with the league logo | The `og-recap` worker is not deployed                      | See [`workers/og-recap/README.md`](../workers/og-recap/README.md). Optional — everything else works without it |

### What is frozen, and why it matters

A published edition stores the numbers it was built from. A later score
correction does **not** change what was published — that is the point. If a
published recap is wrong, publish a correction; do not expect it to fix itself.

## 6e. A tie does not count in Win % or the Power Score

Doug's rule (2026-10-06): **Win % = wins ÷ (wins + losses).** A tie is left
out of the top and the bottom. Migration
`supabase/migrations/20261006120000_exclude_ties_from_win_rate.sql` applies the
same rule to the Power Score's match-win term, so every screen agrees. History
and Career already worked this way. The game-win term and SOS still count a
tie: the games were played and the opponent was faced.

**What players will notice.** Teams with at least one win **and** a tie move
up. A team with no wins does not change: its Win % and its match term stay 0
under both rules. (A few teams with no tie can also move once; see step 0
below.)

- Their Standings Win % goes up (a tie no longer counts as a loss).
- Their Power Score goes up, in every season, **archived seasons included**
  (Doug: "fine if they change").
- Win % is a Standings tie-break, so two teams level on power score can swap
  places. **New** brackets seed from the new order. Brackets already created
  do not move.
- **Movers** on the homepage shows a one-time jump for those teams, because
  last week's `power_score_snapshots` rows are left alone. It corrects itself
  at the next weekly snapshot.

### Applying it (Supabase SQL Editor, not Lovable)

0. **Before you apply**, list the teams that will move for a reason other
   than a tie. Migration `20261003183939` changed how an opponent's division
   is found, but it did not recompute the stored season scores. This migration
   recomputes every season, so those old scores catch up now too. The query
   only reads. It changes nothing:

   ```sql
   SELECT se.name AS season, s.season_id, t.name AS team,
          s.power_score AS stored, a.power_score AS computed_now
   FROM team_season_stats s
   JOIN v_team_season_agg a USING (season_id, team_id)
   JOIN seasons se ON se.id = s.season_id
   JOIN teams t ON t.id = s.team_id
   WHERE (s.power_score IS NULL) <> (a.power_score IS NULL)
      OR abs(s.power_score - a.power_score) > 1e-9
      OR (s.career_power_score IS NULL) <> (a.career_power_score IS NULL)
      OR abs(s.career_power_score - a.career_power_score) > 1e-9
      OR (s.sos IS NULL) <> (a.sos IS NULL)
      OR abs(s.sos - a.sos) > 1e-9
   ORDER BY se.name, t.name;
   ```

   **Save or screenshot the result.** You need it in step 4. No rows is a
   good result: it means only tie teams will move.

1. Paste the **full** contents of
   `supabase/scripts/backup_before_tie_exclusion.sql` and Run. Success looks
   like `NOTICE: tie-exclusion backup: NNN rows saved, NNN rows live`. The two
   numbers must match.
2. Paste the **full** contents of the migration above and Run. Success looks
   like `NOTICE: ties excluded from win rate: NNN season rows recomputed`.
   Re-running it is safe.
3. Verify. This must return **no rows**:

   ```sql
   SELECT team_id FROM v_team_details
   WHERE wins + losses > 0
     AND abs(win_percentage - wins::numeric / (wins + losses)) > 1e-9;
   ```

4. Check before against after. Each row listed must be in one of two groups:
   - a team that has a tie in that season, or
   - a team in your step 0 list (same season and team). It moves even with
     no tie. That is expected.

   If a row is in **neither** group, stop. Use "If it needs undoing" below.

   ```sql
   SELECT s.season_id, t.name, b.power_score AS before, s.power_score AS after
   FROM team_season_stats s
   JOIN team_season_stats_pre_tie_exclusion b USING (season_id, team_id)
   JOIN teams t ON t.id = s.team_id
   WHERE s.power_score IS DISTINCT FROM b.power_score
      OR s.career_power_score IS DISTINCT FROM b.career_power_score
      OR s.sos IS DISTINCT FROM b.sos
   ORDER BY s.season_id, t.name;
   ```

5. When Doug accepts the new numbers, drop the backup:
   `DROP TABLE public.team_season_stats_pre_tie_exclusion;`

### If it needs undoing

Paste `supabase/scripts/revert_tie_exclusion.sql` and Run. It puts the old
view text back and recomputes every season from match history. It does
**not** copy scores from the backup table: that would erase the ratings of
every match played since. Then revert the PR, or the next person to apply
migrations by hand rolls forward again.

`supabase/tests/power_score_ties_excluded.sql` covers the rule in the
`db-apply-and-smoke` CI job.

## 6f. An unknown division is left out of the career bonus

Doug's rule (2026-11-13): when a division is genuinely unknown, **leave it out of
the career bonus.** Do not guess a weight. Migration
`supabase/migrations/20261117120000_unrated_division_career_bonus.sql` does this
in the database. The app code does the same, so the screen and the King Slayer
badge keep giving the same number.

A division is **unknown** (unrated) when its name is blank, matches no division,
or matches a division that has no weight. A weight of 0 is a real weight.

- A title or a runner-up finish in an unknown division adds 0 points. The title
  still shows in the champion count.
- An unknown playoff season is left out of the average of the team's other
  playoff seasons. Only when none of its playoff seasons has a weight is the
  team's current division used. If the team has no weight either, the playoff
  win-rate bonus is 0.
- The cap on the bonus uses the strongest known division. If there is none, it
  uses the team's current division. If there is none, the whole bonus is 0.

**What players will notice: nothing today.** Every live division has a weight
and every past division name matches one (live read, 2026-11-13). The rule matters
the day a division is **renamed**, because past seasons find their weight by the
division's NAME text. It also matters when an odd name is typed into the History
editor. A team with a title in an unknown division then loses those points.

### Applying it (Supabase SQL Editor, not Lovable)

**The order matters: database first, then merge the pull request.** The app code
and the database must give the same number. If the code is merged first, the
screen and the King Slayer badge can disagree for a team with an unknown division.

1. **Before.** Do two things. Do not score any match between step 1 and step 3.
   A scored match moves the current-season number and makes the check useless.
   - Paste the **full** contents of `supabase/scripts/check_unrated_divisions.sql`
     and Run. It only reads. **Expect 0 rows** ("Success. No rows returned"). At
     this point it can show teams, brackets and divisions with no weight. It
     cannot yet show a past season with an unknown name, because the old function
     still guesses 0.85. The check in step 3 is the real test.
   - Run this fingerprint and **save the two values** (count and md5):

     ```sql
     SELECT count(*),
            md5(string_agg(t.id::text || ':' || round(public.calculate_career_power_score(t.id), 6)::text,
                           ',' ORDER BY t.id)) AS fingerprint
     FROM public.teams t;
     ```

2. **Apply.** Paste the **full** contents of
   `supabase/migrations/20261117120000_unrated_division_career_bonus.sql` and Run.
   It is `CREATE OR REPLACE`, so re-running it is safe. It writes no table and
   re-checks no badge.
3. **After.** Run the fingerprint again. **The count and the md5 must be
   identical to step 1.** Then run:

   ```sql
   SELECT public.resolve_division_bonus_weight('Competitive') AS known,
          public.resolve_division_bonus_weight('zzz') AS unknown;
   ```

   `known` shows the live Competitive weight. `unknown` is empty. Run
   `check_unrated_divisions.sql` again. It must still return 0 rows, and now it
   also checks the past seasons.
4. **If the md5 is different, or the check shows a row, stop.** A division is
   unknown, and a team's score moved. Use "If it needs undoing" below. Read the
   rows from the check first: they say which season, which team and which name.
5. **Then merge the pull request.** Nothing looks different on any screen.

### Before you rename a division, or edit a past season

Past titles find their weight by division name. Run
`check_unrated_divisions.sql` **before** you rename a division and **after** you
use Edit Divisions on a past season. Any row it returns is a place where the bonus
has no weight to use. A title or runner-up finish there earns 0 points. An unknown
playoff season is left out of the average of the team's other playoff seasons.
Only when none of the team's playoff seasons has a weight is the team's current
division weight used. The playoff bonus is 0 only if that has no weight either.

One thing the check cannot see: a division with a name of two or more words, such
as "Competitive Low". If you rename it, old titles quietly use the weight of the
first word ("Competitive") instead, and nothing is flagged. A one-word name
(such as "Cuspers") is flagged. Tell the developer before you rename a
multi-word division.

### If it needs undoing

Paste `supabase/scripts/revert_unrated_division_bonus.sql` and Run. It puts both
old function bodies back, in one transaction. An unknown division counts as 0.85
again. It changes no table and does not re-check the badges (that would re-stamp
their dates). Then revert the pull request, or the next person who applies
migrations by hand rolls forward again, and the app and the database disagree.

`supabase/tests/career_power_score_parity.sql` covers the rule in the
`db-apply-and-smoke` CI job. It shares its numbers with
`src/services/career/__tests__/calculateCareerPowerScore.test.ts`.

One difference is known and left as it is: a division name with a **tab** or a
**non-breaking space** in it counts as unknown in the database, but the app still
reads it. Real names do not have these.

## 6g. Old Power Scores: rate each game by the opponent's division in THAT season

> **Status: APPLIED to the live database on 2026-11-18.** Doug ran every step himself
> in the Supabase SQL editor, and every final check passed (see "What was run on
> 2026-11-18" below). The steps further down stay as the runbook for a re-run (each
> script is safe to run again) and for the undo.

**Doug's rule (2026-11-17): "I want numbers to be accurate."** A game is rated by
the division the opponent had in **that season**, not today's division.

**Why.** Of 1,536 team-games in Spring 2025, Summer 1 2025 and Summer 2 2025,
364 are unrated and 916 are rated by a guess (the opponent's division today).
Seven newer games are unrated too: Fall 2025 x4 against Shut Your Cornhole,
Winter 1 2026 x1 against Red Roof Rockets, Winter 2 2026 x2 against The Tomato
Saucers. A team that changed division since 2025 is credited at the wrong weight.

**How.** One small table, `power_score_division_override` (team, season, the
division, the reason). The rated view reads it **first**. A game against a team
with a row is rated by that row's division. The weight is the weight that
division had on the game date. A row that points to a Hidden or an unweighted
division is ignored. **An empty table changes nothing.** The migration is
`supabase/migrations/20261117130000_power_score_division_override.sql`.

**Which rows (script 02).**

- Each opponent team-season of the three old seasons that has at least one game
  rated by a guess or not at all. A team-season answered by a weekly snapshot, the
  archive or a bracket gets **no** row.
- The division comes from the team's stored name for that season, through Doug's
  map. The stored name is a **label**, not a division: "Competitive" can hide
  Competitive Low, "Recreational" can hide Recreational High, and "Intermediate 1"
  and "Intermediate 2" come from alphabetical bracket titles. So Doug chose by hand:

  | Stored name    | Division          | Weight (read 2026-11-17) |
  | -------------- | ----------------- | ------------------------ |
  | Competitive    | Competitive       | 1.00                     |
  | Recreational   | Recreational      | 0.35                     |
  | Intermediate 1 | Intermediate High | 0.80                     |
  | Intermediate 2 | Intermediate Low  | 0.60                     |
  | Intermediate   | Intermediate      | 0.70                     |

  The Intermediate 1 and 2 order is **believed, not proven**, in **all three**
  old seasons (Spring 2025, Summer 1 2025 and Summer 2 2025). They have no playoff
  brackets, so nothing can confirm it. Any other stored name gets **no row** and is
  listed in the result.

- **Doug's exception wins over the map:** "Here for Fireball" was Recreational
  High in Summer 1 2025 and Summer 2 2025.
- Three explicit rows for the 7 newer games: Shut Your Cornhole (Fall 2025) is
  Competitive; Red Roof Rockets (Winter 1 2026) and The Tomato Saucers (Winter 2
  2026) are Recreational. They match `src/constants/dropoutDivisions.ts`. That list
  still decides the Team page. The SQL row decides the Power Score. Check L8 compares
  them.

**What players see.** Many scores in the three old seasons moved. **23 of the 100 old
team-seasons moved 5 points or more** (Spring 2025 2, Summer 1 2025 9, Summer 2 2025
12). Examples, stored to after: Buttery Nips Summer 2 2025 65.6 to 51.9 (rank 9 to
22); Burning Holes & Taking Souls Summer 2 2025 60.2 to 47.4; Mailmen Summer 2 2025
54.7 to 66.0 (rank 23 to 10); Bag Babies Summer 2 2025 56.8 to 66.3; The Great
Cornholios Summer 1 2025 45.4 to 33.7; Seize the Maize Summer 1 2025 67.7 to 77.0.
**Career rankings can move too**, because the career number reads the stored season
scores. Seven teams in the three newer seasons moved a little: Pepperoni Cheesers
+1.73, Came from Dicks +1.69, Jager Bombers +1.22 and Cuzzo's Clinic +0.65 (Fall
2025); Buttery Nips -0.60 (Winter 1 2026); Buttery Nips -0.46 and Happy Valley Hole
Hunters -0.14 (Winter 2 2026). Win-loss records, champions, playoff ranks and the
weekly snapshots did **not** change. The homepage Movers section is not affected.
**The site keeps pages in memory for 5 to 10 minutes**, so a screen can show the old
number until it reloads after that.

**Part of the change was NOT this fix.** A live check on 2026-11-17 found 62
team-seasons whose stored score already differed from the rules of that day (Spring
2025 20, Summer 1 2025 21, Summer 2 2025 21). Older rule changes were never
recomputed. The recompute caught those up too. The tie backup table
`team_season_stats_pre_tie_exclusion` was NOT FOUND on the live database, so
nothing says how much is the tie rule. The preview (script 03) separates the
parts with three numbers per team: **stored** (the site today), **live_rules** (what
today's rules give) and **after** (the fix).

**When Doug approved the final preview table (2026-11-18, "approved"), he ALSO
approved those catch-up changes** (about 62 team-seasons; they show in the
`live_rules` column, not in `fix_part`). They come from older rule changes, not from
this fix. The recompute wrote both.

**Checked on the live database (VERIFIED by Doug's live read, 2026-11-17).**

- The editor role is `postgres`. It bypasses row-level security and owns the rated
  view. The view has `security_invoker=on` and has the `division_history` step. The
  tables `team_division_history` and `division_archive_distrust` and the view
  `v_division_rateable` exist.
- **All six seasons** (Spring 2025, Summer 1 2025, Summer 2 2025, Fall 2025, Winter 1
  2026, Winter 2 2026) have `is_archived = true` and **0 games** with source
  `regular`. (From the view text, the live standings read only regular games and the
  playoff games of the current season, so they do not read these seasons. That is
  reasoned from the code, not part of Doug's read.)
- The six map divisions each have **exactly one** `division_weight_history` row.
  Weights: Competitive 1.00, Recreational 0.35, Intermediate High 0.80, Intermediate
  Low 0.60, Intermediate 0.70, Recreational High 0.60. So **today's weight applies
  exactly** to them for every old game date.
- Every old team-season has a stored name that is in the map (no unmapped row).

**Re-run script 00 right before step 3** (if you ever repeat it). Time passes, and a
season could be un-archived.

### What was run on 2026-11-18 (Doug, in the Supabase SQL editor)

| Step  | What                                      | Result                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Backup (script 01)                        | 185 rows saved = 185 live (Fall 2025 34, Spring 2025 31, Summer 1 2025 36, Summer 2 2025 33, Winter 1 2026 27, Winter 2 2026 24). All 185 carry a live-rules number. Verdict OK.                                                                                                                                                                                             |
| 2     | Migration `20261117130000`                | Applied. The fingerprint was the same before and after: 4,344 games, md5 `3043ab1d09f73f3f7889bc0b010b355f`. Every `resolved_by` count was the same (371 unresolved = 364 old + 7 newer).                                                                                                                                                                                    |
| 3a    | Precheck (script 00)                      | Every row PASS: the six seasons archived, not active, 0 regular games; the six divisions have one history row each.                                                                                                                                                                                                                                                          |
| 3b, 3 | Dry run (02a), then the data script (02)  | 83 candidate team-seasons. **86 rows inserted** (83 and the 3 explicit rows). By season: Fall 2025 1, Spring 2025 14, Summer 1 2025 36, Summer 2 2025 33, Winter 1 2026 1, Winter 2 2026 1. By division: Competitive 22, Intermediate High 23, Intermediate Low 23, Recreational 16, Recreational High 2 (Here for Fireball in Summer 1 and Summer 2 2025). Nothing skipped. |
| 4     | Checks (script 06)                        | L1 PASS (0 of 3,048 solid answers changed). L2, L3 (86 rows; 1,287 games rated by an override; 0 unrated), L3b (0 of 1,287), L5 (`v_team_details` fingerprint `69499fd9ba63c0c58ff644859035fced`, 51 rows), L6a, L6b, L6c, L6d (the 7 teams above), L7, L8 all PASS. L4 said FAIL: see "Rounding" below.                                                                     |
| 5     | Preview (script 03)                       | Doug approved the table, with the about 62 catch-up changes.                                                                                                                                                                                                                                                                                                                 |
| 6     | Recompute (script 04), one season per run | Winter 2 2026 (24 rows written), Winter 1 2026 (25), Fall 2025 (33), Spring 2025 (31), Summer 1 2025 (36), Summer 2 2025 (33). Every "moved" line matched the preview.                                                                                                                                                                                                       |
| 7     | Checks again                              | All PASS: L1, L2, L3, L3b, L4 (0 in the six seasons; 0 elsewhere, not counting the live season; 27 in the live season), L5 (same fingerprint), L6a to L6d, L7, L8.                                                                                                                                                                                                           |

### Rounding on the live database (found 2026-11-18)

On the live database `team_season_stats.power_score` is `numeric(8,3)` and `sos` is
`numeric(6,3)`: **3 decimals**. `career_power_score` is plain `numeric`. **The repo
migrations do not say this** (live differs from the repo; CI keeps full precision).
So the view (full precision) can never equal a stored value:

- After a recompute, a strict "rows still different from the rules" count showed
  the number of team-seasons (24, 25, 33 ...), although the numbers were right. The
  biggest gap was 0.000453 in power_score, 0.000500 in sos and 0.000000 in
  career_power_score.
- The recompute (script 04) writes about **every** row of the season (the rounded
  value), even where the real change is below rounding. So "ROWS CHANGED" can be about
  the number of teams in the season. The "moved" lines list only real changes.
- **Fixed in the scripts:** script 04's last line ("rows still different from the
  rules by more than rounding"), check L4 in script 06 and the line in script 05 that
  compares with the rules ("... differ from the RULES NOW by more than rounding (0
  after path 2)") now ignore a gap of 0.0006 or less in `power_score` and `sos`.
  Anything bigger is still counted. Script 05's line that compares with the backup
  stays exact: both sides are stored values with 3 decimals. Path 2's own recompute is
  the same UPDATE as script 04, so it rewrites about every row of the six seasons.
- Archived seasons outside the six (Spring 2026, Summer 1 2026, Summer 2 2026) also
  differ by up to 0.0005 for the same reason (Doug's L4 diagnostic query).

### The live season (Fall 2026) can drift

The **live** season's stored numbers can differ from the view between scored matches.
On 2026-11-18, 27 to 28 team-seasons differed, by up to about 0.06. **This is not
caused by the override.** Check L2 passed (no game row outside the override rows
changed), and override rows exist only in the six old seasons, so every input to Fall
2026 is the same as before. Its stored numbers refresh by themselves at the next
scored match. Check L4 lists them on their own line ("in the live season") and does
not fail on them.

### The steps (used on 2026-11-18; keep for a re-run or an undo)

Do the steps in this order. Run each script as a whole: paste the full file and
Run. Each one ends with one result table that says what happened. The editor shows
only the last result, so a note printed in the middle would not show.

| Step | What                                         | File                                                                   | Success looks like                                                                                                                                                                          |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Backup, **before** the migration             | `supabase/scripts/division_truth_01_backup.sql`                        | "OK: saved = live"                                                                                                                                                                          |
| 2    | Migration (table + view), table still empty  | `supabase/migrations/20261117130000_power_score_division_override.sql` | The fingerprint below is **the same** before and after                                                                                                                                      |
| 3a   | Precheck (read-only), **right before 3**     | `supabase/scripts/division_truth_00_precheck.sql`                      | Every row says PASS in the last column. See the box below.                                                                                                                                  |
| 3b   | Dry run (read-only), **right before 3**      | `supabase/scripts/division_truth_02a_dryrun.sql`                       | The list of rows script 02 would write. Doug reads the Intermediate 1 and 2 lists.                                                                                                          |
| 3    | Write the override rows                      | `supabase/scripts/division_truth_02_data.sql`                          | "ROWS INSERTED NOW" (86 on 2026-11-18), the same rows as the dry run. Read the "NOT inserted" lines.                                                                                        |
| 4    | Checks (read-only)                           | `supabase/scripts/division_truth_06_checks.sql`                        | No FAIL. L4 says INFO (the six seasons still differ by more than rounding).                                                                                                                 |
| 5    | Preview (read-only). **Doug approves here.** | `supabase/scripts/division_truth_03_preview.sql`                       | Every team in the six seasons (over 100 rows), then CAREER rows. Paste it to the developer.                                                                                                 |
| 6    | Recompute, **one season per run**            | `supabase/scripts/division_truth_04_recompute.sql`                     | "moved" lines list the real changes. "ROWS CHANGED" can be about the number of teams in the season (rounding, see above). The last line, "still different ... by more than rounding", is 0. |
| 7    | Checks again, after the last season          | `supabase/scripts/division_truth_06_checks.sql`                        | All PASS. L4 says PASS (0 in the six seasons; the live season is listed on its own line).                                                                                                   |

> ### BEFORE step 3 (writing the override rows; done on 2026-11-18, keep for a re-run)
>
> - **(a) Precheck.** Run `division_truth_00_precheck.sql` right before step 3. **Want,
>   for all six seasons:** `is_archived=true`, `is_active=false`, `playoffs_active=false`
>   and `regular_games=0`, and PASS on every row. If a row says CHECK, **STOP and tell
>   the developer.** Doug's live read on 2026-11-17 showed `is_archived` and the
>   regular games only. It did **not** show `is_active` or `playoffs_active`, so
>   **re-run script 00 right before step 3.** The live standings follow the season
>   that is active (or, failing that, the one whose playoffs are active), whether or
>   not it is archived.
> - **(b) What step 3 does.** Step 3 changes the **view** at once. The **stored
>   numbers and the public standings change only at step 6** (the recompute), **IF**
>   the precheck passed. If a season is **not** archived, the next match scored in
>   the league rewrites that season's stored numbers by itself (the function
>   `upsert_team_season_stats()` with no argument rewrites every season that is not
>   archived), with no preview.
>   **Four places read the view's answers before step 6** (found by searching the
>   code; **reasoned, not clicked through**):
>   1. the Team page split by opponent division (`fetchSeasonBreakdown.ts`),
>   2. Career and Compare, "Records by Division" (`CareerFetchService.ts` and
>      `CareerBulkFetchService.ts`),
>   3. the league Division Matchups card (`useLeagueDivisionMatchups.ts`).
>      These three all call `fetchRealDivisionOverrides`. They read the view only for
>      teams that are Hidden now. The 3 explicit rows say what Doug's list
>      `src/constants/dropoutDivisions.ts` says, and that list wins there, so they
>      should not change.
>   4. the admin Sandbox preview. Its Career preview reads `v_power_score_components`
>      (every team, every season), so it shows the new numbers from step 3 on. It
>      stores nothing.
> - **(c)** Run step 3 when **no match is being scored.**
> - **(d)** Between step 3 and step 6, do **not** press the Sandbox **Save & rescore**
>   or **Revert**, and do **not** press the §6a **Revert**. Each one rewrites every
>   stored season (a Sandbox save would have written the override numbers and the
>   catch-up changes in one go, with no per-season check).
> - **(e) Back out before step 6: FIRST INSTALL ONLY.** If the override table was
>   **empty before step 3** (the first time, as on 2026-11-18), you can undo step 3 with
>   `DELETE FROM public.power_score_division_override;`. Then nothing stored has changed
>   and the view is identical to the old one again. **That sentence is true for a first
>   install only.** After the 2026-11-18 rollout the table holds the 86 live rows. For a
>   **re-run, do NOT run that DELETE:** it would remove every live override. Script 02
>   does not record which rows a run added (the table keeps only a `created_at` time,
>   no run id, and a re-run that finds nothing new adds 0 rows). So there is no scoped
>   undo today. If a re-run added rows and they must go, ask the developer for a delete
>   limited to those rows. Compare with the dry run (script 02a) you ran just before.
> - **(f) Dry run.** Run `division_truth_02a_dryrun.sql` before script 02. It writes
>   nothing. It lists the exact rows script 02 would write, sorted by stored name,
>   then team. **Read the "Intermediate 1" and "Intermediate 2" lists.** That mapping
>   is believed, not proven. It also shows a "CHECK: script 02 would STOP" row if a
>   dropped-out team, a season or the backup is missing, or a name matches two rows.
> - **(g) Preview.** Script 03 also shows each team's **career** score before and
>   after, and the career rank.
> - **(h) Approval.** Approving the final preview table **also approves the about 62
>   catch-up score changes** from older rule changes (the `live_rules` column).

The fingerprint for step 2. Run it just before the migration and just after, and
**save the two numbers**. They must be identical. Do not score a match between the
two runs, or the live season changes the count.

```sql
SELECT count(*) AS games, md5(string_agg(x::text, '|' ORDER BY x::text)) AS fingerprint
FROM public.v_power_score_team_matches_rated x;
```

Also run this before and after. Every `resolved_by` count must be the same:

```sql
SELECT resolved_by, count(*) FROM public.v_power_score_team_matches_rated GROUP BY 1 ORDER BY 1;
```

**If a script stops with "STOP:", it changed nothing.** Read the message. It names
the cause: a missing backup, a division name that matches two divisions, or a team
name that matches two teams.

Recompute order (step 6): type the season id on the line marked TYPE HERE in
script 04. Doug did Winter 2 2026, Winter 1 2026, Fall 2025, Spring 2025, Summer 1
2025 and Summer 2 2025, in that order: the three newer seasons first (only a few
teams really move), the three 2025 seasons last. Check the result of each run. The
season ids are listed at the top of script 04.

### What the editor may ask

- The Supabase dashboard may ask you to **confirm** a statement it calls destructive:
  `DROP ... pg_temp...`, `DELETE FROM public.power_score_division_override` with no
  WHERE (script 05 path 2), `CREATE OR REPLACE VIEW` (script 05 path 2),
  `CREATE TABLE ... AS` (script 01) or `CREATE TABLE IF NOT EXISTS` (script 05 path 2).
  **That is expected for those scripts.** Each one
  is described in its header. If the question names something that is not in the
  script you pasted, stop.
- Scripts 04 and 05 need the **season id** (04) or the **path number** (05) typed on
  the line marked TYPE HERE. If you leave the placeholder, the script **stops safely**
  and changes nothing.
- Scripts 03 to 06 make **temporary** tables and views (names start with
  `division_truth_`). They vanish when the editor session ends. Nothing in the
  database is left behind except what the scripts say they write (the backup, the
  override rows, the recomputed scores, the pre_undo copy).

### Warnings

- **The Sandbox "Save & rescore" now keeps the fix.** The old warning ("do not press
  it until the old-season fix is done") is gone: the fix is done. The rated view reads
  the override table, so a save works every season out WITH the overrides. A save
  with the **same** weights changes nothing in the old seasons except rounding (it
  rewrites every season; on the live database `power_score` and `sos` keep 3
  decimals). A save with **new** weights moves every season, as before (on purpose).
  Scripts 04 and 05 take the same lock as a save, so they never run at the same
  moment.
- **The Sandbox weights "Revert" button also keeps the fix.** It only goes back to the
  previous three weights, then works every stored season out again from the live
  rules (the overrides included). It does not put back the old formula.
- **Do NOT press Revert in §6a.** It does not touch the rated view, so the override
  step stays. But it puts back the **old formula**, which rates every opponent by
  today's division and **never reads the override table**. It then rewrites the stored
  score of **every** season, archived ones included. That would undo this fix in the
  stored numbers. (Checked in `20260812171710`: it rebuilds `v_team_details`,
  `v_team_match_stats` and `v_team_season_agg`. It ends with
  `upsert_team_season_stats(true)`.) The §6a Re-apply button puts the new formula
  back and keeps the overrides.
- The overrides are rows, not code. A new season does not need one. A team that
  drops out **later** is rated by the weekly snapshot and by the division history,
  as before. Add an override row only if those cannot answer.
- To add one row by hand later, run an `INSERT` into `power_score_division_override`
  with a `reason` (no person's name in it: the table can be read through the public
  API). Then run the recompute for that season. **A row added by hand can silently
  replace a solid answer** (a weekly snapshot, the archive or a bracket). After any
  hand-written row, run script 06 and read **L1**.

### If it needs undoing

`supabase/scripts/division_truth_05_undo.sql` has **two paths**. Type 1 or 2 on the
line marked TYPE HERE.

- **Path 1: put the saved numbers back.** It copies `power_score`,
  `career_power_score`, `sos` and `recorded_at` of the six seasons from the backup
  (`team_season_stats_pre_division_truth`). This gives back **the stored numbers from
  before step 6, exactly.** It is safe because those six seasons are closed: no match
  is scored in them, so it cannot lose a newer score. It does **not** stop the
  overrides. The next recompute or Sandbox save writes the new numbers again.
- **Path 2: stop using the overrides.** It first copies the override rows to the
  locked table `power_score_division_override_pre_undo` (so a row added by hand is
  not lost). Then it deletes the override rows, puts the view text of migration
  `20261003183939` back, and recomputes the six seasons. This gives
  **the numbers the old rules give (no overrides)**. It is **not** the stored numbers
  from before step 6: the 62 team-seasons that differed then stay changed.
- **Path 2 stops (and writes nothing) if the override table holds a row for a season
  other than the six.** It recomputes only the six seasons, so the stored scores of
  another season would stay worked out with a row it deletes. The error names the
  season ids. Recompute those seasons by hand first, or remove those rows, then run
  path 2 again. Its copy and delete of the override rows is one statement, so a row
  is never deleted without being saved.
- **To go all the way back:** run path 2, then path 1.
- After undo, revert the pull request too. If the migration file stays in the repo,
  the next hand-apply of all migrations adds the override step again.

**Drop the backup table only when Doug accepts the new numbers. Doug decides, not the
developer.** Until then keep `team_season_stats_pre_division_truth` (it is the source
for undo path 1) and keep the undo script in the repo:
`DROP TABLE public.team_season_stats_pre_division_truth;`
(Script 05 still ends in its report after that: it says `backup unavailable` for the
line that compares with the backup.) If you run script 01 again later, it **never**
replaces the first backup. Its last line says OK (nothing changed), NOTE (stored
scores changed since the backup, which is expected after a recompute) or CHECK (the
team-seasons are not the same). In every case the first backup is the one to restore
from.

### Honest limits

**More correct, not perfect.**

- A game is rated by **the weight on the game date**. The weight history starts on
  2026-08-12, so an edit before that is not recorded. For the six map divisions
  Doug's live read (2026-11-17) shows one history row each, so **today's weight
  applies**.
- A team has **one** division per season here. A team that played in two divisions
  in one season gets one.
- Old playoff games use a best-effort date for the weight. The three old seasons
  have no playoff brackets, so check L9 (a team in two brackets of different
  divisions) cannot run.
- The stored name is a label. The map is Doug's decision, not proof. If a label hides
  the wrong division, a team moves by about 0.2 for each game it faced against a
  Competitive Low team mixed up with Competitive, and by about 1 for each game it
  faced and won against a Recreational High team mixed up with Recreational
  (INFERRED, by hand).
- The Intermediate 1 and 2 order is believed, not proven, in all three old seasons.
- The six seasons are archived and have 0 regular games (VERIFIED by Doug's live read,
  2026-11-17). If a season were un-archived or held a regular game, the standings
  (`v_team_details`) could move for that team at step 3, not at step 6. Script 00
  and check L5 show it.
- Stored `power_score` and `sos` have 3 decimals on the live database (see
  "Rounding" above), so a stored number differs from the view by up to about 0.0005.
  The live season's stored numbers can also drift from the view between scored
  matches, by more than that. That is not caused by the override.

The SQL tests `supabase/tests/power_score_division_override.sql` (the view and the
table) and `supabase/tests/division_truth_scripts.sql` (the real script files on a
fixture; the dry run lists exactly the rows script 02 writes) cover the mechanism
in the `db-apply-and-smoke` CI job. They prove the mechanism, not the live numbers.
The live numbers are Doug's checks above.
