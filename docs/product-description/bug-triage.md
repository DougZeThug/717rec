# Bug triage

A consolidated list of the defects and inconsistencies the feature documents
raised, in their bodies and in their "Open questions and verification" sections.
Each entry is read from this repo's code and tests at commit `ea5c8f4`. The three
confirmed against the running app carry a **Status** line. The list exists so the
league can decide, item by item, whether to fix, to document as intended, or to
leave.

Nothing here has been filed as an issue.

## Summary

The 58 documents raised roughly 190 suspected defects and open questions. After
merging by root cause they come to **39 entries**: 13 high, 20 medium, and 6 low.

Two clusters account for most of the high ones.

**Writes that do not do what their control says.** Approving a score submission
never results the match. Auto-scheduled matches save at midnight. In each case
the app reports success and the league's data does not change the way the admin
was told it had.

**Work that is silently lost.** A failed round save discards what the scorer
tapped. A decided live match that is never saved counts for nothing and nothing
anywhere surfaces it. A second membership row permanently breaks every ability a
member has.

One entry has since been **cleared**: B-06 claimed head-to-head win
percentages were a 0–1 fraction printed as a percentage. Checked against the
running app, they are not — see that entry for the evidence. It is kept in the
list, and in the counts above, as a record of the investigation.

Two structural themes run under the medium entries: **destructive admin actions
with no confirmation** (six of them, in one entry) and **failure messages that
throw away the reason the server gave** (app-wide, in one entry). Both are
patterns rather than single mistakes, and both would be cheap to fix in one pass.

| ID | Title | Severity | Area | Decision needed | Issue |
| --- | --- | --- | --- | --- | --- |
| B-01 | Approving a score submission never records the result on the match | high | scores, admin | **fixed** | — |
| B-02 | No **existing** season can be activated from the admin screens | medium | admin | **fixed** | — |
| B-03 | Auto-scheduled matches are saved at midnight | high | admin | fix | — |
| B-04 | A decided live match that is never saved counts for nothing, and nothing surfaces it | high | live-scoring | **fixed** | — |
| B-05 | A failed round save throws away what the scorer tapped | high | live-scoring | fix | — |
| B-06 | Head-to-head win percentages and rivalry labels are computed on the wrong scale | high | history, stats | **not a bug** | — |
| B-07 | A second membership row permanently breaks every member ability | high | foundations, teams | fix | — |
| B-08 | A failed profile read silently demotes an admin | high | foundations | fix | — |
| B-09 | There is no way to resolve a tie | high | scores, admin | **fixed** | — |
| B-10 | Two contact channels, neither aware of the other | high | help, admin | product call | — |
| B-32 | Live-scored matches award no badges | high | live-scoring, stats | fix | — |
| B-33 | Nine of the twenty badge types can never be awarded | high | stats | fix | — |
| B-37 | Creating a season without archiving first left two active seasons | high | admin | **fixed** | — |
| B-39 | The head-to-head details dialog never opened: its database function raised on every call | high | history, stats | **fixed** | — |
| B-11 | Six destructive admin actions have no confirmation | medium | admin | fix | — |
| B-12 | Failure messages discard the reason the server gave | medium | all | fix | — |
| B-13 | Only one toast is shown at a time, so paired messages are lost | medium | all | fix | — |
| B-14 | Scroll position carries across every in-app navigation | medium | foundations | fix | — |
| B-15 | The support and score-report functions refuse the app's own dev origin | medium | help, scores | fix | — |
| B-16 | A visitor sees an empty message board and is told to be the first to post | medium | message-board | fix | — |
| B-17 | Reopening a live game needs no confirmation and tells nobody | medium | live-scoring | product call | — |
| B-18 | Rejecting a membership deletes the row, so the person is never told | medium | admin, getting-started | fix | — |
| B-19 | Live corrections can leave a match disagreeing with itself | medium | admin | fix | — |
| B-20 | Archived seasons are editable through live corrections | medium | admin | fix | — |
| B-21 | Eight controls do nothing when pressed | medium | admin, teams | fix | — |
| B-22 | Reduced-motion is honoured in one stylesheet and ignored everywhere else | medium | cross-cutting | fix | — |
| B-23 | The mobile menu is not a dialog | medium | cross-cutting | fix | — |
| B-24 | Bracket administration is unreachable on a phone | medium | playoffs, admin | fix | — |
| B-25 | Anyone signed out can report a score for any match | medium | scores | product call | — |
| B-34 | Four standings columns silently sort by power score instead | medium | stats | fix | — |
| B-35 | A stale fourth career power-score formula decides one badge | medium | stats | fix | — |
| B-36 | Two grades on the team report card are not real measurements | medium | stats | fix | — |
| B-38 | The head-to-head dialog shows the wrong W/L badge on half of every team's matches | medium | history, stats | **fixed** | — |
| B-26 | Session replay records one visit in ten with no notice | low | cross-cutting | product call | — |
| B-27 | Several actions raise two success toasts, and the second destroys the first | low | admin, teams | fix | — |
| B-28 | Message timestamps show a clock time with no date | low | message-board | fix | — |
| B-29 | Results are distinguished by colour alone in two places | low | schedule, teams | fix | — |
| B-30 | Small copy and labelling slips | low | several | fix | — |
| B-31 | Two dead features are visible in the interface | low | admin | fix | — |

---

## High

### B-01: Approving a score submission never records the result on the match

- **Where the user meets it:** an admin reviews a team's reported score in the
  admin dashboard and presses Approve.
- **What happens / what was expected:** a toast says "Score submission approved
  successfully" and the row leaves the queue. **The match itself is untouched.**
  It stays incomplete, no winner is recorded, and standings, team records, power
  scores and badges do not move. The admin has been told the result is recorded
  and it is not.
- **Reproduce:** 1. As a player, report a score for a completed match. 2. As an
  admin, open the score submissions queue and press Approve. 3. Open `/schedule`
  and `/stats`. The match is still without a result and the standings are
  unchanged.
- **Why (from the code):** `updateScoreSubmissionStatus`
  (`src/services/matches/MatchWriteService.ts:214-232`) writes only `status`,
  `reviewed_by` and `reviewed_at` on the `score_submissions` row. It never
  touches `matches`. `useScoreSubmissions` (`src/hooks/useScoreSubmissions.ts:37-44`)
  calls nothing else. The functions that *would* do it — `approveMatchResult`
  and `markMatchAsTie` — exist and are unreachable; see [B-09](#b-09-there-is-no-way-to-resolve-a-tie).
- **Severity:** `high`. The league's standings silently diverge from its results,
  and the admin has no way to notice.
- **Decision needed:** `fix`. **Done.** Note the original proposal — call
  `approveMatchResult` with "the submission's winner and game wins" — was not
  possible: `score_submissions` has no winner or game-wins columns, and the
  reporter's form is a free-text box, so there was no number to pass.
  `approveMatchResult` was also the wrong function, because its SQL only acts on
  an already-completed match with `winner_id IS NULL`.
  **What was done instead:** Approve opens a dialog showing the match, the teams
  and the reporter's message, and offers the four results a best-of-three match
  can end in — reusing `SCORE_OPTIONS`, the same set the admin Scores tab uses, so
  an impossible score such as 0-0 or 3-2 cannot be entered. Confirming writes the result through the existing
  `useMatchSubmission` → `resubmit_match_result` path (which also sets
  `iscompleted`), and only then stamps the submission approved. A failed write
  leaves the submission pending. The submissions query now joins the match and
  both team names, because the queue previously showed no way to tell which match
  a report was for.
- **Raised by:** [`scores/confirm-or-dispute-a-score.md`](scores/confirm-or-dispute-a-score.md#open-questions-and-verification),
  [`scores/pending-scores.md`](scores/pending-scores.md#open-questions-and-verification),
  [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification).

### B-02: No **existing** season can be activated from the admin screens

> **Scope corrected when this was fixed.** This was originally raised as "no
> season can be activated from the admin screens", severity `high`, on the
> assumption that the app could not perform a changeover at all. That was too
> strong. The live database defaulted `seasons.is_active` to **true** at the
> time (changed to false by migration `20260826120000` — see B-37), so
> **creating** a season has always activated it, and the ordinary changeover
> (archive the old season, create the next one) worked throughout. The real
> defect was narrower, and the severity is `medium`.

- **Where the user meets it:** an admin wants to switch to a season that already
  exists — going back to a previous season, starting one created earlier, or
  recovering after archiving without creating a replacement.
- **What happens / what was expected:** there was no reachable control. The
  activation dialog existed and could never open, and the panel that would host
  it was only rendered for the season that was **already** active. Creating a
  season still activated it, so the everyday changeover was unaffected.
- **Reproduce:** 1. Sign in as an admin. 2. Open the seasons section of
  `/admin`. 3. Try to activate a season other than the current one **without
  creating a new one**.
- **Why (from the code):** in `src/components/admin/seasons/SeasonActions.tsx`,
  `showActivationDialog` was declared at line 16 and the only call to its setter
  was `setShowActivationDialog(false)` at line 37. Nothing ever set it true, so
  `SeasonActivationDialog` never opened. `SeasonActions` was itself rendered only
  as `{activeSeason && <SeasonActions season={activeSeason} />}`
  (`src/components/admin/seasons/SeasonManagementTab.tsx:90`), so even a working
  dialog would have been attached to the wrong season. The underlying
  `activateSeason` / `activateSeasonWithPartialArchive` mutations
  (`src/hooks/useSeasonMutations.ts:54,64`) were sound and had no other caller.
- **Severity:** `medium`. The everyday changeover worked; switching and recovery
  did not.
- **Decision needed:** `fix`. **Done.** The trigger went on **each season card**
  in `src/components/admin/seasons/SeasonsList.tsx` — shown when
  `!season.is_active && !season.is_archived` — rather than on `SeasonActions` as
  first proposed, because `SeasonActions` also holds the "Current Active Season"
  badge and the Archive Season button, which are correct only for the active
  season. The dead `showActivationDialog` state and the unreachable dialog render
  were deleted from `SeasonActions.tsx`. Two related corrections shipped with it:
  `SeasonActivationDialog`'s confirm button was missing `preventDefault`, so the
  dialog closed instantly and a failure could not be retried; and
  `supabase/migrations/00000000000000_baseline.sql` had the `is_active` default
  reconstructed as `false`, which is what made this bug look larger than it was.
- **Raised by:** [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification),
  [`foundations/seasons.md`](foundations/seasons.md#open-questions-and-verification).

### B-03: Auto-scheduled matches are saved at midnight

- **Where the user meets it:** an admin generates a night's schedule with the
  auto-scheduler and saves it. Every match then shows the wrong time on
  `/schedule` for every player.
- **What happens / what was expected:** the generated matches carry the
  scheduler's internal block name — `Early`, `MidEarly`, `SuperLate` — where a
  time should be. That name is then parsed as a time, fails to parse, and
  becomes 00:00. Expected: the match saves at the time the block represents.
- **Reproduce:** 1. As an admin, run the auto-scheduler for a date. 2. Save the
  proposed schedule. 3. Open `/schedule` for that date and read the times.
- **Why (from the code):** `usePairingOperations.ts:276` sets
  `timeslot: timeBlock` on every proposed match. `parseTimeString`
  (`src/utils/timezone/parsers.ts:7-30`) initialises `hours = 0, minutes = 0` and
  returns those defaults whenever its regex finds no digits, which a block name
  never has. The in-form scheduler converts correctly
  (`src/hooks/scheduling/utils/matchConversionUtils.ts`), so the two paths
  disagree. The timeslot picker offered on a generated match
  (`src/components/admin/auto-schedule/EditableMatchCard.tsx:29`) lists 6:00 PM
  to 10:00 PM, none of which matches a block name, so it shows empty and cannot
  be used to correct the value either.
- **Severity:** `high`. It corrupts the schedule for the whole league, silently,
  through the tool built to save the admin work.
- **Decision needed:** `fix`. Map the block to its real start time before
  building the match, in the same way the in-form scheduler does.
- **Raised by:** [`admin/build-the-schedule.md`](admin/build-the-schedule.md#open-questions-and-verification).

### B-04: A decided live match that is never saved counts for nothing, and nothing surfaces it

- **Where the user meets it:** two teams finish a match on live scoring. The
  screen says who won. Nobody presses "Save official result", because the match
  is over and everybody has gone home.
- **What happens / what was expected:** the league's standings never learn the
  match was played. No list, no reminder, no admin screen shows a match sitting
  in this state. Expected: something, somewhere, says "this match was played and
  its result was never recorded".
- **Reproduce:** 1. Score a match to two game wins on `/matches/:matchId/live`.
  2. Close the tab without pressing "Save official result". 3. Look at
  `/schedule`, `/stats`, and every admin queue.
- **Why (from the code):** the decided state is derived from the games each time
  the screen is drawn (`src/utils/liveScoring/bestOfThree.ts:13`,
  `deriveMatchState`) and is never stored. The admin's league-night queues key on
  score submissions and on `iscompleted`, and a decided-but-unsaved match is
  neither: `OpsHealthService.fetchPendingOpsCounts` counts only pending score
  submissions, pending team requests and new contact requests, and `games` was
  never joined against `matches` anywhere in the app.
- **Correction to the original write-up (1):** it said the state "is never
  stored, **so nothing can query for it**". The derived *flag* is not stored, but
  the evidence is. `games` persists `status`, `winner_team_id` and `completed_at`
  (`supabase/migrations/20260708120000_live_scoring.sql:64-69`), and
  `finalize_live_match` already counts exactly that to decide whether a match may
  be resulted (same file, lines 558-563). The state was always derivable, which
  is why the fix needed no schema change and no new column.
- **Correction to the original write-up (2):** it said no list anywhere shows the
  match. Two places showed a trace, and **both were worse than silence**. Sixteen
  hours after its scheduled time the match appears on the public home page
  "Pending Scores" card through `v_pending_matches`
  (`supabase/migrations/20250821121435_*.sql:19-23`), indistinguishable from a
  match nobody played, and its button files a free-text score report that an
  admin then approves down a *different* write path which can disagree with the
  games actually played. Live Corrections lists the match too, distinguishable
  only by the absence of the word "finalized"
  (`src/components/admin/live-corrections/LiveCorrectionsSection.tsx:100-103`).
  The accurate claim is that nothing told a match that was **played and lost**
  apart from a match **nobody played**.
- **Severity:** `high`. It loses a whole match's result with no signal, and the
  window in which it can happen is every match.
- **Decision needed:** `fix`. **Done.** `UnsavedLiveMatchesService` counts
  completed `games` rows per team for matches with no recorded result and keeps
  those where a side reached `GAMES_TO_WIN_MATCH`, reusing the live-scoring rule
  constant so the threshold cannot drift from `deriveMatchState` or
  `finalize_live_match`. `UnsavedLiveMatchesCard` shows the result on the admin
  **League Night Status** tab, next to the counter-drift detector it is modelled
  on, and links each row to that match's live scoring screen. It is scoped to the
  **active season**: `archive_season` archives and deletes only completed matches
  and then zeroes every team's counters
  (`supabase/migrations/20260408173631_*.sql:436-449`), so a decided-but-unsaved
  match from an archived season survives rollover, and finalizing it would add an
  old result to the current season's records — `finalize_live_match` updates
  `teams` with no season filter. Raised on review by Codex and fixed before
  merge. The card is a
  detector only — an admin still checks the games and presses "Save official
  result", so no league record is written without a human looking at it.
- **Deliberately left out of the fix:** the **scorers** are still not warned
  before they close the tab, and `/schedule` still shows a played-but-unsaved
  match as an upcoming **0-0** fixture with a countdown
  (`src/components/schedule/MatchCard.tsx:188-192`). The Pending Scores card
  still steers such a match into the manual score-report path. Each is a separate
  change.
- **Raised by:** [`live-scoring/finish-the-match.md`](live-scoring/finish-the-match.md#open-questions-and-verification).

### B-05: A failed round save throws away what the scorer tapped

- **Where the user meets it:** scoring a live match at a venue with poor signal.
  The scorer taps both scores, answers the bags question, presses Save Round, and
  the request fails.
- **What happens / what was expected:** the score grids were cleared the instant
  Save was pressed, so the tapped numbers are gone and the scorer must re-enter
  the round from memory. Expected: a failed save leaves the input as it was, the
  way every other form in the app does.
- **Reproduce:** 1. Open a live match as a scorer. 2. Go offline. 3. Tap a score
  for each side and press Save Round.
- **Why (from the code):** `RoundScoreInput.handleSubmit`
  (`src/components/live-scoring/RoundScoreInput.tsx:60-68`) calls `onSubmit` and
  then immediately `setTeam1(EMPTY); setTeam2(EMPTY)`, unconditionally. The
  rollback in `useRoundMutations` (`src/hooks/live-scoring/useRoundMutations.ts:88`)
  restores the round list but has no way to restore the input, which is local to
  the component.
- **Severity:** `high`. It loses the user's work, in the one feature designed to
  be used where the connection is worst.
- **Decision needed:** `fix`. Clear the grids in the mutation's success path
  rather than on press.
- **Raised by:** [`live-scoring/enter-a-round.md`](live-scoring/enter-a-round.md#open-questions-and-verification).

### B-06: Head-to-head win percentages and rivalry labels are computed on the wrong scale

**Not a bug. Investigated and cleared against the running app.** The original
finding read a superseded migration.

- **What was claimed:** that `win_pct` is a 0–1 fraction printed with a `%`, so a
  team that has won three of four shows "0.8%", and that every opponent met three
  or more times is labelled "Nemesis" while "Dominated" and "Favorite" can never
  appear.
- **Why it is wrong:** the claim cites
  `supabase/migrations/20250905203634_*.sql:84`, which is **not** the definition
  in force. Three later migrations redefine `v_head_to_head` the same day. The
  last of them,
  `supabase/migrations/20250905204611_b2581e49-8f33-4470-b91a-0bccdc2f03ef.sql:90-94`,
  computes `ROUND(... / NULLIF(COUNT(*), 0) * 100, 1)` — a **0–100** value to one
  decimal. Nothing after it touches the view.
  `get_head_to_head_records`, `HeadToHeadService`, and `useHeadToHead` all pass
  the value through without arithmetic, so the 0–100 scale reaches the UI intact
  and matches the thresholds in `rivalryUtils.ts`.
- **Confirmed against real data:** a team page screenshot shows 83.3%, 55.6%,
  41.7%, 33.3% and 25.0% — each equal to that row's own W–L record — with
  "Dominated" on eleven rows, "Rival" on four, and "Tough Matchup" on one. Both
  labels the report said could never appear are either present or reachable;
  "Favorite" needs a 70–83% record with a win/loss gap wider than one (3–1, for
  example), which this team simply does not have.
- **What was really behind it:** two stale fixtures on the dead 0–1 scale in
  `src/utils/matchUtils/__tests__/getMatchHeadToHead.test.ts`. They are inert —
  `getMatchHeadToHead.ts` never reads `win_pct` — and have since been put on the
  0–100 scale so they cannot mislead again.
- **Decision needed:** none. No code change was required.
- **Raised by:** [`history/head-to-head.md`](history/head-to-head.md#open-questions-and-verification).
  That document listed the finding as unverified and asked for it to be confirmed
  against real data before filing; this is that confirmation. The
  `teams/team-details.md` citation was an error — that document never made the
  claim.

### B-07: A second membership row permanently breaks every member ability

- **Where the user meets it:** a player who has asked to join a team twice, or
  who has been on two teams.
- **What happens / what was expected:** their membership read throws instead of
  returning a row. `/my-team` collapses, the next-match card disappears, and they
  cannot score their team's matches. Nothing tells them why and nothing they can
  do fixes it. Expected: one membership is chosen, or the second is prevented.
- **Reproduce:** needs a deliberately constructed account with two rows in
  `team_memberships` for one user.
- **Why (from the code):** `fetchTeamMembership`
  (`src/services/teams/TeamMembershipService.ts:28-29`) uses `.maybeSingle()`,
  which throws when more than one row matches. The unique index that would
  prevent it is **partial**, on `is_approved = true`
  (`supabase/migrations/20260820105942_*.sql:1`), so two *pending* rows are
  allowed and a second request creates one.
- **Severity:** `high`. It is unrecoverable from inside the app and it removes
  every ability the account has.
- **Decision needed:** `fix`. Either make the index total, or read with a
  deterministic order and take the first row.
- **Raised by:** [`getting-started/join-a-team.md`](getting-started/join-a-team.md#open-questions-and-verification),
  [`teams/my-team.md`](teams/my-team.md#open-questions-and-verification),
  [`cross-cutting/permissions.md`](cross-cutting/permissions.md#open-questions-and-verification).

### B-08: A failed profile read silently demotes an admin

- **Where the user meets it:** an admin whose profile request fails once — a
  dropped connection, a slow moment.
- **What happens / what was expected:** admin status is derived from the loaded
  profile, so a failed load reads as "not an admin". The admin is shown "Access
  Denied" and redirected home. On a reload no toast is raised at all, so it can
  happen silently. Expected: a failed read is distinguishable from a definite
  "not an admin".
- **Reproduce:** 1. Sign in as an admin. 2. Block the profile request. 3. Open
  `/admin`.
- **Why (from the code):** `useAdminAccess` (`src/hooks/useAdminAccess.ts:17`)
  computes `authInitialized && !!user && profile?.is_admin === true`. A failed
  fetch leaves `profile` null (`src/hooks/auth/index.ts:201-211`), which is
  indistinguishable from a non-admin profile.
- **Severity:** `high`. It locks a legitimate admin out of the tool with a
  message that says they do not have the rights, which is false.
- **Decision needed:** `fix`. Track the profile's load state separately from its
  contents and treat "not loaded" as neither admin nor not-admin.
- **Raised by:** [`foundations/accounts-and-roles.md`](foundations/accounts-and-roles.md#open-questions-and-verification),
  [`cross-cutting/permissions.md`](cross-cutting/permissions.md#open-questions-and-verification).

### B-09: There is no way to resolve a tie

- **Where the user meets it:** a match ends without a winner. The glossary and
  the admin documents describe it as waiting for an admin decision.
- **What happens / what was expected:** there is no surface. The hook holding the
  tie queue, the approve action, and the mark-as-tie action are imported by
  nothing. Expected: an admin queue that lists ties and resolves them.
- **Reproduce:** 1. As an admin, look for any control that resolves a match
  completed with no winner. There is none.
- **Why (from the code):** `src/hooks/usePendingMatches.ts` has no importer
  anywhere in `src/`. It is the only caller of `approveMatchResult` and
  `markMatchAsTie` (`src/services/matches/MatchWriteService.ts:251,274`). The
  admin dashboard's "Pending" tab shows **score submissions**, not ties
  (`src/components/admin/AdminSidebar.tsx:115` →
  `PendingMatchesSection` → `ScoreSubmissionsList`), despite its name.
- **Severity:** `high`. It is the missing half of [B-01](#b-01-approving-a-score-submission-never-records-the-result-on-the-match):
  the code that results a match exists and nothing calls it.
- **Decision needed:** `fix`. **Done.** The admin **Pending** tab now renders a
  second section, **Unresolved matches**, backed by the existing
  `usePendingMatches` hook. Each card offers the two winners and "It was a tie",
  wired to `approveMatchResult` and `confirmMatchTie`. Note `markMatchAsTie` —
  the function this entry named — could **not** serve the tie button: it returns
  early when `winner_id` is null, which is true of every match in this queue, so
  it would have reported success while changing nothing. Confirming a tie stamps
  the match's `metadata` instead, and the queue skips stamped matches. Note this
  did **not** fix
  B-01 on its own, as expected here: a score submission is about a match that is
  not yet completed, so it never enters this list. B-01 was fixed separately.
- **Raised by:** [`scores/pending-scores.md`](scores/pending-scores.md#open-questions-and-verification),
  [`admin/the-admin-dashboard.md`](admin/the-admin-dashboard.md#open-questions-and-verification),
  [`admin/enter-scores-in-bulk.md`](admin/enter-scores-in-bulk.md#open-questions-and-verification).

### B-10: Two contact channels, neither aware of the other

- **Where the user meets it:** anyone contacting the league. There are two ways
  to do it and they go to two different places.
- **What happens / what was expected:** the form at `/contact` is emailed to
  `admin@717rec.com` and stored as a support ticket. The panel at the foot of the
  home page is stored in the admin Contact Inbox and never emailed. **An admin
  watching only the inbox never sees a single `/contact` message.** Neither
  surface says the other exists. Expected: one channel, or two that are clearly
  labelled and both visible in one place.
- **Reproduce:** 1. Send a message from `/contact`. 2. Send one from the home
  page panel. 3. As an admin, open the Contact Inbox. Only the second is there.
- **Why (from the code):** `src/services/support/ContactService.ts:19` invokes
  `send-support-email`; `src/services/contact/ContactRequestService.ts:24`
  invokes `submit-contact-request`. They write to different tables and neither
  reads the other's.
- **Severity:** `high`. Messages to the league are lost, and the sender is told
  they were received.
- **Decision needed:** `product call`. Either merge them, or show both in the
  admin inbox and say on each form where it goes.
- **Raised by:** [`help/contact-the-league.md`](help/contact-the-league.md#open-questions-and-verification),
  [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification),
  [`home/the-home-page.md`](home/the-home-page.md#open-questions-and-verification).

### B-32: Live-scored matches award no badges

- **Where the user meets it:** a team plays a match, it is scored live, the
  result is saved, and no badge is earned from it. The same match reported
  through the ordinary score path would have earned one.
- **What happens / what was expected:** badge processing runs on one of the two
  paths that result a match and not the other. Two teams playing the same fixture
  therefore end the season with different badges depending on how their score
  reached the league — which is invisible to them and unrelated to how they
  played. Expected: both paths award the same badges.
- **Reproduce:** 1. Score a match live to a result that should earn a streak
  badge. 2. Save the official result. 3. Open the team's page and look at its
  badges. 4. Compare with a team that earned the same pattern through a reported
  score.
- **Why (from the code):** the ordinary path calls `BadgeProcessingService`
  explicitly (`src/hooks/matches/utils/matchDatabaseUtils.ts:1,78`). The live
  path goes through the `finalize_live_match` routine
  (`supabase/migrations/20260709120308_*.sql`), which contains no badge call at
  all. As live scoring becomes the normal way to score, badges quietly stop being
  awarded.
- **Severity:** `high`. It is silently wrong, it worsens as the league adopts
  live scoring, and nothing surfaces it.
- **Decision needed:** `fix`. Call the same badge processing from the finalise
  routine.
- **Raised by:** [`stats/badges.md`](stats/badges.md#open-questions-and-verification),
  [`live-scoring/finish-the-match.md`](live-scoring/finish-the-match.md#open-questions-and-verification).

### B-33: Nine of the twenty badge types can never be awarded

- **Where the user meets it:** a team that finishes second or third in its
  division never receives a badge for it.
- **What happens / what was expected:** the badge types exist — runner-up and
  third place, in each of the three divisions — and nothing writes six of them.
  Third place has never had a writer at all. Archiving a season writes champions
  only. Expected: the badges the product defines are the badges it can award.
- **Why (from the code):** `badge_type` in
  `src/integrations/supabase/types.ts:7218` defines twenty. `archive_season`
  (`supabase/migrations/20260617142402_*.sql:256`) writes champion badges and no
  others. The same routine also **deactivates every active badge league-wide,
  with no season filter**, which is a second defect in one line.
- **Severity:** `high`. Teams are denied recognition the product says it gives,
  and the unfiltered deactivation can strip badges from seasons that were not
  being archived.
- **Decision needed:** `fix`. Write the placing badges from the final standings,
  and scope the deactivation to the season being archived.
- **Raised by:** [`stats/badges.md`](stats/badges.md#open-questions-and-verification),
  [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification).

---

## Medium

### B-11: Six destructive admin actions have no confirmation

- **Where the user meets it:** across the admin dashboard, six actions destroy or
  overwrite data on the first press.
- **What happens / what was expected:** no dialog, no undo, and in two cases no
  success message either. Expected: the same confirmation the other destructive
  actions on the same screens already use.
- **The six:**
  - Deleting a contact request — `src/components/admin/contact/ContactInboxSection.tsx:174`.
    Permanent, no dialog, no toast.
  - Deleting an admin notification — `src/pages/admin/NotificationsAdmin.tsx:225`.
    The notification is in the bell on every page.
  - Re-scoring a completed match in the mass tool —
    `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts:126`. One
    press reverses the recorded result, moves both teams' records and
    recalculates power scores.
  - Deleting a saved Challonge fallback —
    `src/components/admin/challonge-fallback/ChallongeFallbackSection.tsx:118`.
  - Changing a team's division — `src/components/admin/teams/TeamTableDesktop.tsx:55`.
    Because hiding a team *is* setting its division to Hidden, one mis-click
    removes a team from the public site.
  - Duplicating a hero card — `src/components/admin/hero-cards/HeroCardsList.tsx:87`.
    Pressed twice it makes two cards with the same slug.
- **Severity:** `medium`. Each is recoverable by hand, but the re-score and the
  division change move league-wide numbers.
- **Decision needed:** `fix`. One shared confirmation, matching the ones already
  in use.
- **Raised by:** [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification),
  [`admin/send-notifications.md`](admin/send-notifications.md#open-questions-and-verification),
  [`admin/enter-scores-in-bulk.md`](admin/enter-scores-in-bulk.md#open-questions-and-verification),
  [`admin/run-the-playoffs.md`](admin/run-the-playoffs.md#open-questions-and-verification),
  [`admin/manage-teams-and-divisions.md`](admin/manage-teams-and-divisions.md#open-questions-and-verification),
  [`admin/site-settings.md`](admin/site-settings.md#open-questions-and-verification).

### B-12: Failure messages discard the reason the server gave

- **Where the user meets it:** any failed write, anywhere in the app except live
  scoring.
- **What happens / what was expected:** the server sends a specific reason — too
  many messages in ten minutes, too many links, a value too long, a permission
  refused — and the app replaces it with a fixed per-feature sentence, usually
  ending "Please try again." For a rate limit and for an over-length value, **a
  retry can never succeed**, and the user is told to retry. Expected: the reason
  reaches the user, as it already does in live scoring.
- **Reproduce:** 1. Submit six contact-form messages within ten minutes. 2. Read
  the sixth toast: "Failed to send message. Please try again."
- **Why (from the code):** `src/pages/Contact.tsx:76` catches and discards; the
  same shape recurs across `src/hooks/`. Live scoring is the exception and shows
  how it should look — `getUIErrorMessage(error)` is passed straight through
  (`src/hooks/live-scoring/useRoundMutations.ts:101`).
- **Severity:** `medium`. Recoverable, but it costs the user time and it makes
  every failure look the same.
- **Decision needed:** `fix`. Adopt live scoring's pattern app-wide.
- **Raised by:** [`help/contact-the-league.md`](help/contact-the-league.md#open-questions-and-verification),
  [`foundations/messages-to-the-user.md`](foundations/messages-to-the-user.md#open-questions-and-verification),
  and eleven other documents.

### B-13: Only one toast is shown at a time, so paired messages are lost

- **Where the user meets it:** anywhere two messages are raised close together.
- **What happens / what was expected:** the second replaces the first
  immediately. Creating a bracket shows "Bracket Created Successfully" and then
  "Data Refreshed" within a second, so the success message is never read
  (`src/components/playoffs/BracketCreationDialog.tsx:164,185`). A bulk score
  batch raises its summary toast and the refresh that follows raises its own,
  stealing it (`useScoreEntryData.ts:221` then `:235`). Expected: messages queue,
  or a second message does not fire.
- **Why (from the code):** `TOAST_LIMIT = 1` in `src/hooks/useToast.ts:6`, with
  the reducer slicing to that limit at line 81.
- **Severity:** `medium`. It hides confirmations rather than causing wrong data.
  Worth noting the bulk score tool survives it by design: it reports one summary
  plus a persistent banner and per-row errors, which is the right pattern.
- **Decision needed:** `fix`. Raise the limit to two or three, or stop raising
  the second message.
- **Raised by:** [`foundations/messages-to-the-user.md`](foundations/messages-to-the-user.md#open-questions-and-verification),
  [`admin/enter-scores-in-bulk.md`](admin/enter-scores-in-bulk.md#open-questions-and-verification),
  [`admin/run-the-playoffs.md`](admin/run-the-playoffs.md#open-questions-and-verification).

### B-14: Scroll position carries across every in-app navigation

- **Where the user meets it:** anyone scrolled down a long page who then follows
  a link.
- **What happens / what was expected:** the new page opens at the old page's
  scroll position, often below all of its content, so it looks blank until the
  user scrolls up. Expected: a new page opens at the top.
- **Reproduce:** 1. Open `/schedule` and scroll down. 2. Click an in-app link to
  `/help`. 3. The new page is still scrolled down.
- **Why (from the code):** nothing in `src/App.tsx` resets scroll on a route
  change, and React Router does not do it by itself. Four routes call
  `useScrollRestoration` to restore *their own* position — `/teams`, `/stats`,
  `/history`, `/insights` — which is a different behaviour and does not help
  anyone arriving at the other sixteen.
- **Severity:** `medium`. It affects every navigation in the app and is most
  confusing for a user who cannot see the page has changed.
- **Decision needed:** `fix`. Reset scroll on navigation, except where a route
  has deliberately restored its own.
- **Raised by:** [`foundations/navigation.md`](foundations/navigation.md#open-questions-and-verification),
  [`teams/browse-teams.md`](teams/browse-teams.md#open-questions-and-verification),
  [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification).
- **Status:** **confirmed** on 2026-08-25 against commit `ea5c8f4`, by driving
  Chromium against the dev server. Scrolled to 337px on `/schedule`, clicked an
  in-app link to `/help`, still at 337px. Checklist item `NAV-01`.

### B-15: The support and score-report functions refuse the app's own dev origin

- **Where the user meets it:** anyone running the app from source. The contact
  form and the score report both fail.
- **What happens / what was expected:** the browser blocks the request before it
  is sent, and the user gets the generic failure toast. Expected: the app's own
  documented dev address works.
- **Reproduce:** 1. `npm run dev`. 2. Open `http://localhost:8080/contact`. 3.
  Fill in and submit the form.
- **Why (from the code):** the allowed-origin lists name `https://717rec.app`,
  the Lovable preview addresses, `http://localhost:3000` and
  `http://localhost:5173` — `supabase/functions/send-support-email/index.ts:24-30`
  and `supabase/functions/submit-score-report/index.ts:20-26`. The dev server
  runs on **8080** (`vite.config.ts:25`, and the README's own instructions).
- **Severity:** `medium`. Production is unaffected; it costs every contributor a
  broken feature and a confusing debugging session.
- **Decision needed:** `fix`. Add `http://localhost:8080` to both lists.
- **Raised by:** [`help/contact-the-league.md`](help/contact-the-league.md#open-questions-and-verification),
  [`scores/submit-a-score.md`](scores/submit-a-score.md#open-questions-and-verification).
- **Status:** **confirmed** on 2026-08-25. A preflight sent with
  `Origin: https://717rec.app` returns `access-control-allow-origin:
  https://717rec.app`; the same preflight with `Origin: http://localhost:8080`
  returns no such header, and a browser fetch from the dev server fails with
  "TypeError: Failed to fetch". Checklist item `CONTACT-05`.

### B-16: A visitor sees an empty message board and is told to be the first to post

- **Where the user meets it:** anyone not signed in who opens `/message-board`.
- **What happens / what was expected:** the page renders, the database returns no
  rows to a signed-out reader, and the visitor is shown "No Messages Yet — Be the
  first to start a conversation!". The board may be busy. The refresh button
  reports "Messages refreshed — Latest messages have been loaded". Expected:
  either the messages, or an honest statement that signing in is needed to read
  them.
- **Reproduce:** 1. Open `/message-board` in a private window.
- **Why (from the code):** the only SELECT policy on `messages` is granted `TO
  authenticated` (`supabase/migrations/20251010171351_*.sql:4-7`). The page has no
  route guard and its empty state does not distinguish "none" from "not allowed"
  (`src/components/message-board/MessageFeed.tsx:66-78`).
- **Severity:** `medium`. It tells the user something false about the league.
- **Decision needed:** `fix`. Show a sign-in prompt in place of the empty state
  when nobody is signed in. The app's own help page already describes the board
  as requiring an account, so the copy is the thing that is wrong.
- **Raised by:** [`message-board/read-the-board.md`](message-board/read-the-board.md#open-questions-and-verification),
  [`cross-cutting/permissions.md`](cross-cutting/permissions.md#open-questions-and-verification),
  [`foundations/accounts-and-roles.md`](foundations/accounts-and-roles.md#open-questions-and-verification).

### B-17: Reopening a live game needs no confirmation and tells nobody

- **Where the user meets it:** a live match, after a game has been ended.
- **What happens / what was expected:** a ghost button reading "Reopen Game N to
  fix a score" acts on the first press. It is available to **any** scorer, which
  includes the opposing team's scorer, and it is silent — the other scorer's
  screen changes with no explanation. Undoing a single round, which is far less
  surprising, does ask for confirmation. Expected: the more surprising action
  asks at least as much as the less surprising one.
- **Reproduce:** 1. Two scorers on one match, one from each team. 2. End a game.
  3. The losing team's scorer presses "Reopen Game N". 4. Watch the other screen.
- **Why (from the code):** `src/components/live-scoring/LiveMatchView.tsx:246`
  calls `reopenGame.mutate` directly from `onClick` with no dialog;
  `useGameFlow.reopenGame` (`src/hooks/live-scoring/useGameFlow.ts:65`) raises no
  success toast. The gate is `canScore`, not admin.
- **Severity:** `medium`. Recoverable, but it is an opposing-team action with no
  friction and no trace.
- **Decision needed:** `product call`. Either add a confirmation and a message to
  both screens, or restrict it to an admin as reopening the *match* already is.
- **Raised by:** [`live-scoring/correct-a-round.md`](live-scoring/correct-a-round.md#open-questions-and-verification).

### B-18: Rejecting a membership deletes the row, so the person is never told

- **Where the user meets it:** somebody who asks to join a team and is refused.
- **What happens / what was expected:** the request row is deleted. The person's
  screen goes back to looking as though they never asked, with no message. They
  cannot tell refusal from "it was never received", and re-requesting looks brand
  new to the admin. Expected: a refused state that both sides can see. The
  confirmation's wording is also wrong — it says "The user will be removed from
  the team", which describes an approved membership, not a pending request.
- **Why (from the code):** `src/services/teams/TeamMembershipService.ts:175-178`
  deletes rather than marking a status. Nothing notifies the requester, and
  memberships have no realtime subscription.
- **Severity:** `medium`.
- **Decision needed:** `fix`. Mark the row refused and show it to the requester.
- **Raised by:** [`getting-started/join-a-team.md`](getting-started/join-a-team.md#open-questions-and-verification),
  [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification).

### B-19: Live corrections can leave a match disagreeing with itself

- **Where the user meets it:** an admin fixing a scoring mistake on a match whose
  result is already recorded.
- **What happens / what was expected:** the correction changes the rounds and
  never changes the recorded result. Deleting a round does not re-decide the
  game, and setting a game winner does not re-decide the match. An amber warning
  is the only safeguard, and nothing lists matches left in this state. Expected:
  either the result follows the rounds, or the app tracks which matches no longer
  agree.
- **Why (from the code):** `src/services/liveScoring/AdminCorrectionsService.ts:95`
  deletes a round without re-running winner detection;
  `src/components/admin/live-corrections/MatchCorrectionsPanel.tsx:91` shows the
  warning. Reopening and re-saving is the correct sequence and it is manual,
  ordered, and easy to half-finish.
- **Severity:** `medium`. The match review then shows a recorded winner above
  round totals that say something else.
- **Decision needed:** `fix`. A list of matches whose rounds and result disagree
  would make the state visible; re-deciding automatically would remove it.
- **Raised by:** [`admin/correct-a-live-match.md`](admin/correct-a-live-match.md#open-questions-and-verification),
  [`live-scoring/finish-the-match.md`](live-scoring/finish-the-match.md#open-questions-and-verification).

### B-20: Archived seasons are editable through live corrections

- **Where the user meets it:** an admin browsing live corrections and picking an
  old season.
- **What happens / what was expected:** the rounds of an archived season are
  listed and can be changed. [`foundations/seasons.md`](foundations/seasons.md)
  describes archived seasons as frozen, and the power-score machinery treats them
  that way. Expected: archived seasons are read-only here too, or the freeze is
  documented as applying only to computed numbers.
- **Why (from the code):**
  `src/components/admin/live-corrections/LiveCorrectionsSection.tsx:31,52` filters
  by season with no archived check.
- **Severity:** `medium`.
- **Decision needed:** `fix`. Refuse edits on an archived season, or say plainly
  in the UI what "frozen" covers.
- **Raised by:** [`admin/correct-a-live-match.md`](admin/correct-a-live-match.md#open-questions-and-verification),
  [`foundations/seasons.md`](foundations/seasons.md#open-questions-and-verification).

### B-21: Eight controls do nothing when pressed

- **Where the user meets it:** across the admin screens and `/my-team`.
- **The eight:**
  - The Double Header switch on `/timeslots` — the page never passes a handler
    (`src/pages/Timeslots.tsx:163-169` vs
    `src/components/timeslots/TimeslotAssignment.tsx:119-123`). No write, no
    toast, no error.
  - "9:30 PM" in the timeslot picker — it is not the primary of any pair, so the
    write always throws (`src/utils/autoSchedule/constants.ts:96-113`,
    `src/services/timeslots/TimeslotBatchService.ts:76-82`).
  - "Edit Bracket" — opens the *Create New Playoff Bracket* dialog and edits
    nothing (`src/components/playoffs/views/AdminView.tsx:76,91`).
  - The Create Team tab's Cancel button, wired to a no-op
    (`src/components/admin/teams/TeamManagementTab.tsx:23,109`).
  - "Go to Batch Matches" and "Open Full Auto Schedule" — both set a URL fragment
    nothing listens to (`ExportTab.tsx:112`, `AutoScheduleSection.tsx:108`).
  - The Save button on a division row with a blank name or a non-positive weight
    — silently does nothing, with no message
    (`src/components/admin/divisions/DivisionRow.tsx:69`).
  - The join-team control's team-switch path, unreachable because the control
    only renders when there is no membership
    (`src/components/teams/TeamMembershipSection.tsx:131-176`).
- **Severity:** `medium`. Each wastes the admin's time and two of them look like
  data loss.
- **Decision needed:** `fix`. Wire them up or remove them.
- **Raised by:** [`admin/manage-timeslots.md`](admin/manage-timeslots.md#open-questions-and-verification),
  [`admin/run-the-playoffs.md`](admin/run-the-playoffs.md#open-questions-and-verification),
  [`admin/manage-teams-and-divisions.md`](admin/manage-teams-and-divisions.md#open-questions-and-verification),
  [`admin/build-the-schedule.md`](admin/build-the-schedule.md#open-questions-and-verification),
  [`teams/my-team.md`](teams/my-team.md#open-questions-and-verification).

### B-22: Reduced-motion is honoured in one stylesheet and ignored everywhere else

- **Where the user meets it:** a user who has asked their operating system to
  reduce motion.
- **What happens / what was expected:** the bracket theme respects it. The home
  page's 200-flake snowfall, every page transition, and 68 animated components do
  not. Expected: the setting is respected throughout.
- **Why (from the code):** the only `prefers-reduced-motion` rule is
  `src/styles/brackets-viewer-717rec-theme.css:357`.
  `src/components/effects/WinterSnowfall.tsx:24` and the page transitions have no
  check.
- **Severity:** `medium`. For a user with vestibular sensitivity the app is
  unpleasant to use and the setting they rely on appears to do nothing.
- **Decision needed:** `fix`.
- **Raised by:** [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification),
  [`cross-cutting/on-a-phone.md`](cross-cutting/on-a-phone.md#open-questions-and-verification).

### B-23: The mobile menu is not a dialog

- **Where the user meets it:** anyone opening the navigation menu on a phone with
  a keyboard or a screen reader.
- **What happens / what was expected:** focus is not moved into the menu, focus
  is not trapped, Escape does not close it, and the button does not say whether
  it is open. Expected: the behaviour every other dialog in the app already has.
- **Why (from the code):** `src/components/layout/navbar/MobileMenu.tsx:32-66` is
  a plain conditional block rather than a dialog component, with no
  `aria-expanded` on the trigger.
- **Severity:** `medium`.
- **Decision needed:** `fix`. Use the same dialog primitive as the rest of the
  app.
- **Raised by:** [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification).

### B-24: Bracket administration is unreachable on a phone

- **Where the user meets it:** an admin running the playoffs from the venue.
- **What happens / what was expected:** all six bracket admin controls are hidden
  below 768 pixels. Playoff night is the likeliest moment to need them and a
  phone the likeliest device. Expected: reachable on a phone.
- **Why (from the code):** every control in
  `src/components/playoffs/BracketDetail.tsx` carries `hidden md:flex`.
- **Severity:** `medium`.
- **Decision needed:** `fix`.
- **Raised by:** [`admin/run-the-playoffs.md`](admin/run-the-playoffs.md#open-questions-and-verification),
  [`playoffs/read-a-bracket.md`](playoffs/read-a-bracket.md#open-questions-and-verification),
  [`cross-cutting/on-a-phone.md`](cross-cutting/on-a-phone.md#open-questions-and-verification).

### B-25: Anyone signed out can report a score for any match

- **Where the user meets it:** the Pending Scores card on the home page, which a
  visitor can see and use.
- **What happens / what was expected:** the score-report function does not
  require a signed-in caller, so a visitor can submit a report naming any teams
  and any score. It lands in the admin queue looking like any other. Expected:
  either a sign-in requirement, or a clear mark on unverified reports.
- **Why (from the code):** `supabase/config.toml` sets `verify_jwt = false` for
  `submit-score-report`; the card is rendered unconditionally at
  `src/pages/Index.tsx:142`. Reports do carry a verified flag when the sender was
  signed in, so the information exists.
- **Severity:** `medium`. It needs an admin to approve before anything happens,
  and [B-01](#b-01-approving-a-score-submission-never-records-the-result-on-the-match)
  means approval currently does nothing — but that is not a defence.
- **Decision needed:** `product call`. A recreational league may want reports
  from anyone. If so, show the verified flag in the queue so an admin can weigh
  it.
- **Raised by:** [`scores/submit-a-score.md`](scores/submit-a-score.md#open-questions-and-verification),
  [`cross-cutting/permissions.md`](cross-cutting/permissions.md#open-questions-and-verification).

### B-37: Creating a season without archiving first left two active seasons

- **Where the user meets it:** an admin creates next season while the current one
  is still running, instead of archiving first. Then **every** visitor sees it,
  not just the admin.
- **What happens / what was expected:** the app throws "Data integrity violation:
  2 active seasons found" and every page scoped to the active season fails.
  Expected: one season active at a time, always.
- **Reproduce:** 1. Sign in as an admin with a season active. 2. Create a new
  season without archiving the old one. 3. Open Standings or Schedule.
- **Why (from the code):** `public.seasons.is_active` defaulted to `true`, but
  the trigger that enforces a single active season,
  `trg_ensure_single_active_season`
  (`supabase/migrations/20250614154922-f22b7af9-18e5-4f38-b29b-ab5932818118.sql:25-29`),
  is declared `BEFORE UPDATE` — never `INSERT`. So nothing deactivated the
  previous season, and `SeasonQueryService.fetchActiveSeason`
  (`src/services/seasons/SeasonQueryService.ts:38-42`) throws a
  `BusinessLogicError` when it finds more than one. Confirmed by replaying every
  migration on a fresh Postgres and inserting a season while one was active.
- **Severity:** `high`. It breaks the app for everyone, not only the admin who
  did it. It stayed hidden because the usual changeover archives first, which
  leaves nothing active at the moment of the insert.
- **Decision needed:** `fix`. **Done.** Creating and starting a season are now
  separate steps. `SeasonLifecycleService.createSeason` sends `is_active: false`
  explicitly, and migration `20260826120000_seasons_created_inactive.sql` sets
  the column default to `false` for paths app code cannot reach. The explicit
  flag matters because migrations are applied by hand
  (`docs/OPERATIONS.md` §6), so the app must be correct before the SQL is run.
  A season is started with the **Activate** control added in B-02, which routes
  through `activate_season()` and deactivates the previous season atomically.
  Guarded by `supabase/tests/seasons_created_inactive.sql`.
  The same migration also **repairs** a database already in the broken state:
  two earlier migrations (`20250801183139`, `20251001184630`) each insert a
  season with `is_active = true`, so a full replay left a freshly rebuilt
  database with two active seasons that would throw on the first read. It now
  keeps exactly one — preferring an un-archived season, then the latest start
  date — and is a no-op wherever a single season is already active, so a healthy
  live database is untouched.
- **Not covered:** the trigger is still `BEFORE UPDATE` only, so a hand-written
  SQL `INSERT` that sets `is_active = true` can still produce two active seasons
  from that point on. Nothing in the app does that, and the repair above clears
  any such state the next time the migration is applied.
- **Raised by:** found while fixing B-02.

### B-39: The head-to-head details dialog never opened: its database function raised on every call

- **Where the user meets it:** a team's page. Press an opponent row in the
  head-to-head table, expecting the **Head-to-Head vs …** dialog.
- **What happens / what was expected:** nothing happens. No dialog, no error, no
  spinner — the press produces no visible change at all. Expected: the dialog
  opens with the summary cards and the *Recent Matches* list.
- **Reproduce:** 1. Open any team page and expand Head-to-Head. 2. Press an
  opponent row, or its **View Details** control.
- **Why (from the code):** `get_opponent_match_history` unions three sources.
  `public.matches.team1_score` and `matches_archive.team1_score` are `integer`,
  but `public.playoff_matches.team1_score` and `team2_score` are `numeric`
  (`supabase/migrations/00000000000000_baseline.sql:298,301` against `:135,136`).
  `UNION ALL` resolves those output columns to `numeric`, which does not match
  the `integer` the function declares, so **every call** raised
  `structure of query does not match function result type`. This is decided when
  the statement is planned, so it failed whether or not a playoff match existed.
  `HeadToHeadService.getOpponentHistory` turns that into a thrown
  `DatabaseError`, the query has no data, and
  `OpponentHistoryModal` returns `null` on `!history?.summary` — hence the
  silent nothing. Present since the function was created in
  `20250906000458_*.sql`.
- **Severity:** `high`. A control on a page teams care about did nothing at all,
  for a year, with no error surfaced to the user.
- **Decision needed:** `fix`. **Done.** The playoff branch now casts its scores
  to `integer` in
  `supabase/migrations/20260826190000_opponent_match_history_winner_id.sql`,
  matching the other two sources and the declared return type.
- **Status:** confirmed by reproduction. Found when the smoke test added for
  B-38 failed in CI; reproduced locally by replaying every migration into a
  fresh Postgres, where the **pre-existing** definition raises the same error on
  a bare call. `supabase/tests/opponent_match_history_winner_id.sql` now seeds a
  playoff match and asserts its scores come back as integers, and CI runs it
  after replaying every migration.
- **Raised by:** found while fixing B-38; not raised by any feature document.
  `history/head-to-head.md` recorded the symptom as "View Details looks
  unresponsive" without identifying the cause.

### B-34: Four standings columns silently sort by power score instead

- **Where the user meets it:** anyone sorting the standings table by Games, Game
  %, Streak, or the `#` column.
- **What happens / what was expected:** the table re-sorts, so the control looks
  like it worked — but it sorts by power score every time. The user is looking at
  a different order from the one they asked for and has no way to tell. Expected:
  the column sorts by its own values, or is not sortable.
- **Why (from the code):** `src/utils/rankingUtils.ts:49` has a `default:` case
  that falls back to `powerScore`, and those four keys have no case of their own.
  The headings are wired as sortable at
  `src/components/stats/desktop/DivisionRankingsSection.tsx:150,204,215,231`.
  Two smaller faults sit alongside: the chosen sort order is written to browser
  storage and never read back (`RankingsTable.tsx:84`), and the headings are
  `<th>` elements with click handlers, so **the table cannot be sorted by
  keyboard at all** (`DivisionRankingsSection.tsx:148`).
- **Severity:** `medium`. Wrong but visible on inspection, and recoverable.
- **Decision needed:** `fix`.
- **Raised by:** [`stats/standings-and-rankings.md`](stats/standings-and-rankings.md#open-questions-and-verification).

### B-35: A stale fourth career power-score formula decides one badge

- **Where the user meets it:** the King Slayer badge, awarded for beating a
  strong opponent.
- **What happens / what was expected:** the badge is decided by a career
  power-score formula written in the database that is not the formula the app
  uses. It applies linear bonuses, a flat cap of 15, and hardcoded weights, none
  of which match `src/utils/career/calculateCareerPowerScore.ts:130`. Expected:
  one definition of career power score.
- **Why (from the code):**
  `supabase/migrations/20260225200000_fix-badge-logic.sql` carries its own
  calculation. Three other definitions exist elsewhere.
- **Severity:** `medium`. It affects one badge, but a number with four
  definitions will drift again.
- **Decision needed:** `fix`. Have the badge read the stored career power score.
- **Raised by:** [`stats/power-score.md`](stats/power-score.md#open-questions-and-verification),
  [`stats/badges.md`](stats/badges.md#open-questions-and-verification).

### B-36: Two grades on the team report card are not real measurements

- **Where the user meets it:** a team's report card, which shows six letter
  grades side by side as though they were six measurements.
- **What happens / what was expected:** in Season mode the **Clutch** grade is a
  hardcoded neutral 50 for every team, and the **sweep rate** behind another
  grade is estimated from game win percentage for every team except the one being
  viewed — so a team is graded against estimates rather than against its
  opponents' real figures. Neither is marked as different from the four real
  grades. Expected: a grade that cannot be computed is shown as unavailable, the
  way points per round already shows a dash rather than a zero.
- **Why (from the code):** `src/hooks/useAllTeamReportCards.ts:105` sets the
  clutch value to a constant; `src/hooks/useTeamReportCard.ts:132` estimates the
  sweep rate for the comparison population.
- **Severity:** `medium`. It presents a placeholder as a result.
- **Decision needed:** `fix`. Compute them, or show them as unavailable.
- **Raised by:** [`stats/team-and-player-stats.md`](stats/team-and-player-stats.md#open-questions-and-verification).

### B-38: The head-to-head dialog shows the wrong W/L badge on half of every team's matches

- **Where the user meets it:** a team's page. Press an opponent row in the
  head-to-head table to open the **Head-to-Head vs …** dialog, then read the W
  and L badges down the *Recent Matches* list.
- **What happens / what was expected:** the badge marks the match won whenever
  the **second-named** team won, no matter whose page it is. So on every match
  where the viewing team happens to be named first, a win reads **L** and a loss
  reads **W**. A match completed with no winner also reads **L**. Expected: the
  badge reflects the viewing team's own result, and a tie is not called a loss.
- **Reproduce:** 1. Open a team page and expand Head-to-Head. 2. Press any
  opponent row. 3. Count the **W** badges in *Recent Matches* and compare with
  the **Wins** card at the top of the same dialog. They disagree whenever the
  team appears first in a fixture.
- **Why (from the code):** `OpponentHistoryModal.tsx` decided the result with
  `match.winner_name === (teamId === match.team1_name ? match.team1_name :
  match.team2_name)`. `teamId` is a **uuid** and `team1_name` is a **name**, so
  that comparison is never true and the ternary always yielded
  `match.team2_name`. The rows returned by `get_opponent_match_history`
  (`supabase/migrations/20250906000458_*.sql:2-14`) carry names only, no ids, and
  its `winner_name` is `NULL` for a match with no winner. No test covered the
  badge, and the one fixture in `OpponentHistoryModal.test.tsx` was a loss that
  the old code rendered as a win, so nothing failed.
- **Severity:** `medium`. It is a wrong result presented as fact, but the same
  dialog shows the correct W–L totals directly above it, so a reader has a way to
  notice.
- **Decision needed:** `fix`. **Done.** The result is decided by **team id**:
  `winner_id === teamId` is a win, `NULL` is a tie, anything else is a loss.
  This holds whichever side of the fixture the viewing team is on.
  `get_opponent_match_history` returned names only, so migration
  `supabase/migrations/20260826190000_opponent_match_history_winner_id.sql`
  adds `team1_id`, `team2_id` and `winner_id` (normalised to `NULL` for a tie,
  exactly as `winner_name` always was). `winner_name` stays for display.
- **Why not compare names:** `public.teams.name` has **no unique constraint**
  and the create and update services both allow duplicates. With two teams
  sharing a name, `winner_name` equals the opponent's name for *both* outcomes,
  so a name comparison reads every non-tie as a loss — trading one wrong badge
  for another. A rename landing between the two reads could flip a result the
  same way. Raised on the pull request by the Codex reviewer.
- **Status:** confirmed by test at both levels. Seven component tests cover
  both fixture slots, both results, the tie, and two teams sharing a name; the
  cases that expose the bug were shown red against the old code first.
  `supabase/tests/opponent_match_history_winner_id.sql` asserts the same at the
  database level using two teams deliberately given one name, and CI replays
  every migration before running it.
- **Raised by:** [`history/head-to-head.md`](history/head-to-head.md#edge-cases).

---

## Low

### B-26: Session replay records one visit in ten with no notice

- Roughly 10% of all visits, and 100% of visits in which an error occurs, are
  recorded as screen replays by the error-monitoring service
  (`src/utils/sentry.ts:69-70,211`). Nothing in the product mentions it and there
  is no opt-out.
- **Severity:** `low` as a defect; it works as configured.
- **Decision needed:** `product call`. Decide whether it needs a privacy note.
- **Raised by:** [`cross-cutting/what-the-league-sees.md`](cross-cutting/what-the-league-sees.md#open-questions-and-verification).

### B-27: Several actions raise two success toasts, and the second destroys the first

- Team creation (`src/hooks/useTeamMutations.ts:26` and
  `TeamManagementTab.tsx:169`), batch match creation
  (`useBatchMatchForm.ts:151` and `BatchMatchFormContainer.tsx:48`), and sign-up
  (`useAuthMethods.ts:77` and `useAuthForm.ts:90`) each raise two. The sign-up
  pair also disagree with each other: one says "confirm", the other "verify", and
  the survivor tells an already-signed-in user to check their email.
- **Severity:** `low`. A symptom of [B-13](#b-13-only-one-toast-is-shown-at-a-time-so-paired-messages-are-lost);
  listed separately because the fix is to remove the duplicate, not to raise the
  toast limit.
- **Decision needed:** `fix`.
- **Raised by:** [`getting-started/sign-in-and-sign-up.md`](getting-started/sign-in-and-sign-up.md#open-questions-and-verification),
  [`admin/manage-teams-and-divisions.md`](admin/manage-teams-and-divisions.md#open-questions-and-verification),
  [`admin/build-the-schedule.md`](admin/build-the-schedule.md#open-questions-and-verification).

### B-28: Message timestamps show a clock time with no date

- A message posted three weeks ago reads "3:42 PM" (`src/components/home/utils.ts:16`,
  used by `src/components/message-board/MessageItem.tsx:37`). On a board that is
  never cleared, this makes an old conversation look current.
- **Severity:** `low`. **Decision needed:** `fix`.
- **Raised by:** [`message-board/read-the-board.md`](message-board/read-the-board.md#open-questions-and-verification).

### B-29: Results are distinguished by colour alone in two places

- The winner on a completed match card is marked only by emerald text
  (`src/components/schedule/MatchCard.tsx:97-114`), and the profile page's
  name-availability tick and warning are unlabelled icons
  (`src/components/profile/ProfileForm.tsx:142`).
- **Severity:** `low`. **Decision needed:** `fix`. Add a word or a label.
- **Raised by:** [`schedule/a-match-card.md`](schedule/a-match-card.md#open-questions-and-verification),
  [`getting-started/set-up-your-profile.md`](getting-started/set-up-your-profile.md#open-questions-and-verification),
  [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification).

### B-30: Small copy and labelling slips

- "Top 10 Teams" heading over a grid of four (`src/components/home/TopTeams.tsx:139`).
- The mobile "My Teams" button links to the whole-league list
  (`src/components/home/HeroSection.tsx:104`).
- An empty state offering to adjust "your date range or team selection" on a
  screen with no team filter (`MatchesTable.tsx:79`).
- An empty state offering filters and a search that the page does not have
  (`src/components/teams/TeamList.tsx:44`), whose button also calls
  `window.location.reload()`.
- A history empty state linking to `/rules`, which is not a route, through a raw
  anchor that reloads the whole app into Page Not Found
  (`src/components/history/HistoryPageContent.tsx:64`).
- The help page describing team-page "tabs" that are collapsible sections
  (`src/components/help/sections/TeamsSection.tsx:12-21`).
- The delete-match confirmation not mentioning that statistics are reversed
  (`src/components/schedule/DeleteMatchDialog.tsx:34`).
- A batch date picker allowing Thursdays only, beside text saying "or another
  date for special events" (`ThursdayDatePicker.tsx:18`).
- `/oauth/consent` missing from the route-name map, so it is announced as "Page
  Not Found page" (`src/utils/routeName.ts:20`).
- **Severity:** `low`. **Decision needed:** `fix`.
- **Raised by:** eleven documents.

### B-31: Two dead features are visible in the interface

- **Notification expiry.** An expiry date is displayed, timed, and re-checked,
  and the EXPIRED tag is rendered — but nothing in the app can set one
  (`src/services/notifications/NotificationService.ts:13,33` vs
  `NotificationsAdmin.tsx:178,180`).
- **Team confirmation.** The `confirmation_open` season flag is read
  (`src/services/seasons/SeasonQueryService.ts:80`) and written by nothing
  anywhere in `src/`, so the feature it gates can never be switched on.
- Also here: `/admin/notifications` has no link anywhere in the app and must be
  typed (`src/App.tsx:213`), and `useErrorHandler`'s "Network error. Please check
  your connection and try again." has no importer, so that sentence has never
  been shown to anyone (`src/hooks/useErrorHandler.ts:21`).
- **Severity:** `low`. **Decision needed:** `fix`. Remove them, or finish them.
- **Raised by:** [`admin/send-notifications.md`](admin/send-notifications.md#open-questions-and-verification),
  [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification),
  [`cross-cutting/errors-and-offline.md`](cross-cutting/errors-and-offline.md#open-questions-and-verification).
