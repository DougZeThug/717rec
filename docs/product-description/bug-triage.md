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
merging by root cause they come to **39 entries**: 12 high, 21 medium, and 6 low.

Two clusters account for most of the high ones.

**Writes that do not do what their control says.** Approving a score submission
never results the match. The app reports success and the league's data does not
change the way the admin was told it had.

**Work that is silently lost.** A decided live match that is never saved counts
for nothing and nothing anywhere surfaces it. Four are now **fixed**: a second
membership row used to take away every ability a member has, see B-07; a
failed round save used to discard what the scorer tapped, see B-05; a match
scored live earned no badges at all, see B-32; and closing a season switched off
every badge in the league while never awarding six of the twenty types, see
B-33.

One entry has since been **cleared**: B-06 claimed head-to-head win
percentages were a 0–1 fraction printed as a percentage. Checked against the
running app, they are not — see that entry for the evidence. It is kept in the
list, and in the counts above, as a record of the investigation.

One entry has been **corrected and then fixed**: B-03 said every auto-scheduled
match saved at midnight. None ever did. It needed Dual Match Mode switched off,
that mode is on by default, and even then the save was refused by the duplicate-
team check before any time was written — so nothing was ever corrupted. The real
defect on that path was that the save always failed. It moved from `high` to
`medium` and is now fixed.

A third theme ran under them and is now fixed across four entries:
**the app telling the user something that is not true.** B-15 failed the contact
form and the score report for every contributor running from source, and reported
it as an ordinary failure. B-16 told a signed-out visitor the message board was
empty when they simply could not read it, and its refresh button reported that
messages had been loaded. B-17 changed a game under the other team's scorer with
no explanation. B-18 deleted a refused join request, so the person could not tell
refusal from a request never received. Two of the four reports were also
inaccurate in ways that mattered — B-15 named two functions of three, and missed
the one its own reproduction steps reach; B-17 described one button where there
are two — and B-18 turned out to be constrained by a schema with no third state
and a unique index allowing one row per person. See each entry's *Corrected on
review* note.

Two structural themes ran under the medium entries: **destructive admin actions
with no confirmation** (B-11) and **failure messages that throw away the reason
the server gave** (B-12). Both are now fixed, and both entries were wrong in
part. B-11 listed six actions; two of them turned out not to be defects as
described, and one of those was re-filed as a different, smaller bug. B-12's
proposed fix — propagate the reason the way live scoring does — would have made
the app less safe, because the function it named does not sanitise and the
service layer had already lost the reason it was meant to surface. See each
entry's *Corrected on review* note.

| ID | Title | Severity | Area | Decision needed | Issue |
| --- | --- | --- | --- | --- | --- |
| B-01 | Approving a score submission never records the result on the match | high | scores, admin | **fixed** | — |
| B-02 | No **existing** season can be activated from the admin screens | medium | admin | **fixed** | — |
| B-03 | With Dual Match Mode off, the auto-scheduler's save is always refused (reported as "saved at midnight") | medium | admin | **fixed** | — |
| B-04 | A decided live match that is never saved counts for nothing, and nothing surfaces it | high | live-scoring | **fixed** | — |
| B-05 | A failed round save throws away what the scorer tapped | high | live-scoring | **fixed** | — |
| B-06 | Head-to-head win percentages and rivalry labels are computed on the wrong scale | high | history, stats | **not a bug** | — |
| B-07 | A second membership row permanently breaks every member ability | high | foundations, teams | **fixed** | — |
| B-08 | A failed profile read silently demotes an admin | high | foundations | **fixed** | — |
| B-09 | There is no way to resolve a tie | high | scores, admin | **fixed** | — |
| B-10 | Two contact channels, neither aware of the other | high | help, admin | **fixed** | — |
| B-32 | Live-scored matches award no badges | high | live-scoring, stats | fix | **fixed** |
| B-33 | Six of the twenty badge types can never be awarded | high | stats | fix | **fixed** |
| B-37 | Creating a season without archiving first left two active seasons | high | admin | **fixed** | — |
| B-39 | The head-to-head details dialog never opened: its database function raised on every call | high | history, stats | **fixed** | — |
| B-11 | Four destructive admin actions have no confirmation | medium | admin | **fixed** | — |
| B-12 | Failure messages discard the reason the server gave | medium | all | **fixed** | — |
| B-13 | Only one toast is shown at a time, so paired messages are lost | medium | all | **fixed** | — |
| B-14 | Scroll position carries across every in-app navigation | medium | foundations | **fixed** | — |
| B-15 | The support and score-report functions refuse the app's own dev origin | medium | help, scores | **fixed** | — |
| B-16 | A visitor sees an empty message board and is told to be the first to post | medium | message-board | **fixed** | — |
| B-17 | Reopening a live game needs no confirmation and tells nobody | medium | live-scoring | **fixed** | — |
| B-18 | Rejecting a membership deletes the row, so the person is never told | medium | admin, getting-started | **fixed** | — |
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

### B-03: With Dual Match Mode off, the auto-scheduler's save is always refused

- **Status:** **fixed**. The original entry was **wrong about the outcome**, and
  is corrected below. It said every auto-scheduled save landed at midnight. No
  save ever did, and no match in the live season was ever stored at midnight.
  The midnight code path was real but **unreachable**, and the defect an admin
  actually met with Dual Match Mode off was different: **the save was refused
  every time**.
- **Where the user meets it:** an admin turns Dual Match Mode off, generates a
  night's schedule with the standalone auto-scheduler, and presses Save. The save
  fails with "Schedule validation failed: Team is scheduled for multiple matches
  at Early", and no match is written.
- **What happens / what was expected:** the generated matches carried the
  scheduler's internal block name — `Early`, `MidEarly`, `SuperLate` — where a
  time should be, and **every match in a block carried the same one**. The
  blossom pass runs two rounds per block, so each team plays twice; with both
  rounds at one identical timeslot value, `findTeamConflicts` reported every team
  as double-booked and `validateMatchSchedule` refused the save. Expected: the
  block's two rounds land at the block's two consecutive times, and the schedule
  saves.
- **Why midnight never happened:** the save was refused before
  `parseTimeString` was ever reached. Had a block name reached the insert it
  would have become 00:00, so the hazard was real — but blossom either gives
  every team two matches or throws (verified: four teams yield four pairings,
  two teams raise "2 teams don't have 2 matches"), so a viable standard-mode
  block always tripped the duplicate check first.
- **Reproduce:** 1. As an admin, **switch Dual Match Mode off**. 2. Run the
  auto-scheduler for a date with at least four teams in a block. 3. Press Save
  and read the error toast.
- **Why (from the code):** the two generators disagreed on what keys the pairing
  map. `src/hooks/scheduling/usePairingGenerator.ts:102` branches on
  `dualMatchMode`. Dual mode keys by the real clock time it assigned
  (`utils/dualBlockScheduler.ts:191-192`), so it was always correct. Standard
  mode passed the block key straight through (`utils/standardPairing.ts:61`), and
  those keys come from `getAllBackToBackTeams`, which is keyed by pair *name*
  (`src/utils/autoSchedule/teamLoaderUtils.ts:194`). `usePairingOperations.ts`
  then set `timeslot: timeBlock` with no lookup, and `parseTimeString`
  (`src/utils/timezone/parsers.ts:7-38`) returns its `hours = 0, minutes = 0`
  defaults whenever its regex finds no digits, which a block name never has.
- **Had it ever saved, it would have hidden itself:** a midnight row does **not**
  display as `12:00 AM`. `src/utils/timezone/formatters.ts:190-194` buckets it to
  a plausible **`6:00 PM`**. That is why the guard below matters even though
  nothing reached the database.
- **Severity:** `medium`, reduced from `high`. It never touched the default path,
  and it corrupted nothing; with Dual Match Mode off it made the tool unusable.
- **Fix:** three changes. `usePairingOperations.ts` now resolves the block name
  through the existing `getPairConfig` helper
  (`src/utils/autoSchedule/constants.ts:115`) **and spreads the block's two rounds
  over the block's two consecutive slots**, so each team plays once at each time
  and the schedule validates. A clock time has no pair config and passes through
  untouched, so Dual Match Mode is unaffected.
  `src/utils/autoSchedule/validation.ts` now rejects any timeslot without a
  readable `H:MM` before the insert, closing the whole class of silent-midnight
  bug rather than this one case. `EditableMatchCard.tsx` builds its picker from
  `BACK_TO_BACK_PAIRS` instead of a hardcoded list, which adds the missing
  5:00 PM and 5:30 PM and drops 10:00 PM, a time no block uses.
- **Why it survived a green suite:** `useAutoScheduleSave.test.ts` used an
  already-valid `'6:00 PM'` fixture and never asserted the resulting timestamp,
  and `usePairingOperations.test.ts` asserted `timeslot: 'Early'` — the buggy
  value — as expected. Both now assert the corrected behaviour.
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
  Save was pressed, so the tapped numbers were gone and the scorer had to
  re-enter the round from memory. Expected: a failed save leaves the input as it
  was, the way every other form in the app does.
- **Reproduce:** 1. Open a live match as a scorer. 2. Go offline. 3. Tap a score
  for each side and press Save Round.
- **Why (from the code):** `RoundScoreInput.handleSubmit` called `onSubmit` and
  then immediately `setTeam1(EMPTY); setTeam2(EMPTY)`, unconditionally.
  `submitRound.mutate()` returns at once and never throws, so the clear always
  ran before the save had a result. The rollback in `useRoundMutations` restores
  the round list but has no way to restore the input, which is local state
  inside the component.
- **Severity:** `high`. It loses the user's work, in the one feature designed to
  be used where the connection is worst.
- **Decision needed:** `fix`. **Done.** `RoundScoreInput.handleSubmit` now
  awaits `onSubmit` and clears the grids only once it resolves;
  `LiveMatchView` supplies that promise with `submitRound.mutateAsync`
  (`src/components/live-scoring/RoundScoreInput.tsx`,
  `src/components/live-scoring/LiveMatchView.tsx`). A failed save leaves the
  tapped scores on screen and the scorer presses Save Round again. Three
  details were needed beyond the one-line change this entry proposed.
  **One:** a `DuplicateRoundError` still clears the grids — that round *is*
  recorded, so the tapped scores are stale and keeping them would leave wrong
  numbers in the next round's grid. **Two:** when the optimistic round won the
  game, the whole panel unmounted behind the game-won banner and the rollback
  remounted it empty, so a game-winning round still lost its input; the panel
  now stays mounted until the save settles. **Three:** keeping the scores opened
  a new hazard — if another scorer records that round, the heading advances and
  a retry would file the old scores under the new round number. The selections
  are now dropped when the round identity changes, and the scorer is told, which
  also closes the second open question this document's source raised.
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

- **Where the user meets it:** a player whose account has ended up with two rows
  in `team_memberships`.
- **What happens / what was expected:** their membership read throws instead of
  returning a row. The next-match card disappears and they cannot score their
  team's matches. Nothing tells them why and nothing they can do fixes it.
  Expected: one membership is chosen, or the second is prevented.
- **Reproduce:** needs a deliberately constructed account with two rows in
  `team_memberships` for one user.
- **Why (from the code):** `fetchTeamMembership`
  (`src/services/teams/TeamMembershipService.ts`) filtered on `user_id` alone and
  ended in `.maybeSingle()`, which returns `PGRST116` when more than one row
  comes back (`@supabase/postgrest-js` 2.112.4). The unique index that would
  prevent the second row was **partial**, on `is_approved = true`
  (`supabase/migrations/20260820105942_*.sql:1`), so two *pending* rows were
  allowed.
- **Severity:** `high`. It is unrecoverable from inside the app and it removes
  every ability the account has.
- **Decision needed:** `fix`. **Done.** Two changes.
  **One,** the read is now deterministic: `fetchTeamMembership` orders by
  approved-first then oldest and takes one row, so a stray duplicate resolves to
  the same row the database's own one-approved-membership rule would pick. The
  identical query in `MatchCommentsService.fetchCommentAuthorInfo` got the same
  guard. This makes an affected account work again with no database change.
  **Two,** `20260827120000_one_membership_per_user.sql` removes existing
  duplicates — keeping the approved row, then the oldest, so nobody's team
  changes — and replaces the partial index with a total unique index on
  `user_id`. `joinTeamMembership` now reads `23505` and says "You already have a
  team request. Refresh the page to see it." instead of raising a raw database
  error. `supabase/tests/one_membership_per_user.sql` covers both halves.

  **Two claims in the original entry were wrong.** *"a player who has asked to
  join a team twice, or who has been on two teams"* — neither creates a duplicate
  on its own. A second request goes through the **update** branch of
  `joinTeamMembership`, which edits the same row. *"`/my-team` collapses"* — it
  does not crash. It renders the "you have no team" join form, because
  `TeamMembershipSection` reads only `membership` and never the `error` that
  `useTeamMembership` exposes. That was worse than a crash: the one control it
  offered inserted another row.

  **How a duplicate was actually created:** the insert branch runs only when the
  read returns nothing, which includes a read that **failed or was stale** while
  a row existed — a dropped request (the query retries once, `src/App.tsx`), or a
  second tab holding a cached "no membership" through its five-minute stale
  window. One press of Request to Join then inserted the second row.
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
- **Decision needed:** ~~`fix`~~ **fixed.** The load state is now tracked
  separately from the contents: `useAuthProfile` holds a `profileLoadFailed`
  flag, set only when the read throws (a missing profile row still returns
  `null` and is not a failure). The read is retried once, ~800ms apart, before
  the flag is set. `useAdminAccess` exposes `accessCheckFailed`, and
  `ProtectedAdminRoute` uses it for a fourth branch: a retry card reading "We
  could not load your profile. This is usually a connection problem, not a
  permissions problem." with **Try again** (wired to `refreshProfile`) and "Go
  home". The "Access Denied" toast and the redirect are both suppressed while
  that flag is set.
- **Note on the original report:** it said "on a reload no toast is raised at
  all". The *profile-error* toast was indeed missing (it only fired on
  `SIGNED_IN`), but the "Access Denied" toast did fire. So the message was wrong
  rather than absent.
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
- **Decision needed:** ~~`product call`~~ **fixed**, by the second option: keep
  both forms and make one place show everything. The two forms ask for different
  things — `/contact` is support (bugs, account problems, disputes), the home
  panel is league business (timeslots, scores, joining) — so merging the forms
  would have made both worse. `SupportTicketService` and `useSupportTickets`
  give `support_tickets` its first reader; `ContactInboxSection` merges both row
  shapes into one list behind an *All / League requests / Support* filter, with
  Delete on league rows only (the table has no DELETE policy);
  `submit-contact-request` now emails `admin@717rec.com` too, through a shared
  `_shared/email.ts`, best-effort so a failed send never turns a saved request
  into a 500; and both forms now say where the message goes.
- **Raised by:** [`help/contact-the-league.md`](help/contact-the-league.md#open-questions-and-verification),
  [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification),
  [`home/the-home-page.md`](home/the-home-page.md#open-questions-and-verification).

### B-32: Live-scored matches award no badges

- **Status:** **fixed**. Badge processing now runs in the database, in the same
  transaction as the result, on every path that results a match.
- **Where the user meets it:** a team plays a match, it is scored live, the
  result is saved, and no badge is earned from it. The same match reported
  through the ordinary score path would have earned one.
- **What happens / what was expected:** badge processing ran on one of the paths
  that result a match and not the others. Two teams playing the same fixture
  therefore ended the season with different badges depending on how their score
  reached the league — which is invisible to them and unrelated to how they
  played. Expected: every path awards the same badges.
- **Reproduce:** 1. Score a match live to a result that should earn a streak
  badge. 2. Save the official result. 3. Open the team's page and look at its
  badges. 4. Compare with a team that earned the same pattern through a reported
  score.
- **Why (from the code):** badge processing lived entirely in the browser.
  `matchDatabaseUtils.ts` fired fourteen sequential RPCs after a score was
  reported; `finalize_live_match` never went near that code, and neither did
  `approve_match_result`. Nothing on the server made up the difference: no
  trigger on `matches` awarded badges, and `resubmit_match_result` had no badge
  logic of its own.
- **Worse than first written.** Most badges are recomputed from a team's whole
  season history, so they silently self-correct the next time that team is
  scored the ordinary way — which made the bug intermittent rather than
  permanent, and harder to spot. **King Slayer is the exception**: it judges one
  specific pairing and is never re-derived, so a giant-killing scored live was
  lost for good.
- **Three paths, not two.** The entry named the live path and the ordinary path.
  `approve_match_result` — approving a submitted score report — was a third with
  the same gap.
- **Severity:** `high`. It was silently wrong, it worsened as the league adopted
  live scoring, and nothing surfaced it.
- **Decision needed:** `fix`. **Done** — `process_all_match_badges(match_id)` is
  one shared rulebook called by `finalize_live_match`, `resubmit_match_result`
  and `approve_match_result`. It calls the existing `award_*` functions, so no
  badge rule was reimplemented, and each check is trapped on its own so a failing
  badge check can never roll back a saved result. The fourteen browser calls are
  gone, which also fixes badges being lost when a scorer closed the tab
  mid-loop. A separate migration replays the King Slayer badges that were lost.
- **Follow-up, also done.** King Slayer was the one check that judged a single
  pairing rather than recomputing from history, which made it the only badge a
  voided result could strand — nothing could tell it was stale, because the badge
  records no match. It is now a history recompute like every other check, so
  every check in the rulebook is team-scoped, and **reopening a match or marking
  one a tie re-runs them**. That also fixes a second fault: a later narrow win
  used to revoke a badge an earlier giant-killing had earned, because whichever
  match ran last decided the outcome.
- **Raised by:** [`stats/badges.md`](stats/badges.md#open-questions-and-verification),
  [`live-scoring/finish-the-match.md`](live-scoring/finish-the-match.md#open-questions-and-verification).

### B-33: Six of the twenty badge types can never be awarded

- **Status:** **fixed**. The original entry's **title was wrong**: it said nine,
  and its own body said six. Six is right — nine is the number of *placement*
  types, and three of those, the champions, were always written.
- **Where the user meets it:** a team that finishes second or third in its
  division never receives a badge for it.
- **What happens / what was expected:** the badge types exist — Runner-Up and
  Third Place, in each of the three divisions — and nothing wrote those six.
  Third place had never had a writer at all. Closing a season wrote champions
  only. Expected: the badges the product defines are the badges it can award.
- **Why (from the code):** `badge_type` in
  `src/integrations/supabase/types.ts:7221` defines twenty. The badge block in
  `archive_season` (`supabase/migrations/20260617142402_*.sql:256`) wrote champion
  badges and no others. The same routine also **deactivated every active badge
  league-wide, with no season filter and no team filter**, which is a second
  defect in one statement.
- **Two routines, not one.** The entry named only `archive_season`.
  `finalize_playoffs` (`supabase/migrations/20260427150212_*.sql:300`) — the
  modern playoff-close path, and so the more important of the two — carried a
  byte-identical copy of both defects.
- **The deactivation was worse than described.** Every read path
  (`get_team_badges`, `get_all_team_badges`, `get_season_badges`) filters
  `is_active = true`, so closing one season hid **every previous season's
  championship badge** from every screen.
- **The fix was nearly free.** Both routines already work out second and third
  place a few lines earlier and store them in `team_season_stats`, together with
  the bracket's own division name. The badge block simply ignored them.
- **Severity:** `high`. Teams were denied recognition the product says it gives,
  and the unfiltered deactivation stripped badges from seasons that were not
  being closed.
- **Decision needed:** `fix`. **Done** — `award_season_placement_badges(season_id)`
  writes all three placings from the stored placements, and carries the
  `ON CONFLICT` clause the old champion INSERT lacked, so re-running a close no
  longer raises a unique violation. `rotate_season_badges(season_id)` scopes the
  deactivation to the season being closed and to the ten revocable types, so the
  nine permanent placement badges are never deactivated. Both routines call the
  two helpers, which also removes the duplicated block.
- **Third place in a single-elimination bracket.** `playoff_rank = 3` is the
  loser of the last losers-bracket match, and a single-elimination bracket has
  none — two teams lose in the semi-finals and it does not separate them. No
  third-place badge is awarded there, by decision rather than omission.
- **Raised by:** [`stats/badges.md`](stats/badges.md#open-questions-and-verification),
  [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification).

---

## Medium

### B-11: Four destructive admin actions have no confirmation

- **Where the user meets it:** across the admin dashboard, four actions destroy
  or overwrite data on the first press.
- **What happens / what was expected:** no dialog, no undo, and in two cases no
  success message either. Expected: the same confirmation the other destructive
  actions on the same screens already use.
- **The four:**
  - Deleting a contact request — `ContactInboxSection.tsx`. Permanent, no
    dialog, no toast.
  - Deleting an admin notification — `NotificationsAdmin.tsx`. The notification
    is in the bell on every page.
  - Deleting a saved Challonge fallback — `ChallongeFallbackSection.tsx`.
  - Changing a team's division — `TeamTableDesktop.tsx` and `TeamListMobile.tsx`.
    Because hiding a team *is* setting its division to Hidden, one mis-click
    removes a team from the public site.
- **Severity:** `medium`. Each is recoverable by hand, but the division change
  moves a team out of the standings, the schedule and its public page.
- **Decision needed:** `fix`. One shared confirmation, matching the ones already
  in use.
- **Status:** **fixed.** A shared `ConfirmDialog` (`src/components/ui/`) now
  guards all four. The division prompt lives in `ManageTeamsPane` so the desktop
  table and the mobile list share it; it needs no mirror state and cancelling
  needs no revert, because both Selects are controlled from server data. The
  two missing success toasts were added.
- **Corrected on review.** This entry originally listed **six** actions. Two of
  them do not hold up:
  - *Re-scoring a completed match in the mass tool* — **dropped, not a defect.**
    Every match the tool submits is completed by design; that is its entry
    condition (`submissionEligibility.ts` requires `isEdited && isValid &&
    iscompleted`). The admin must edit a score first and then press Submit, and
    gets a summary toast naming saved and failed counts. The tool's *delete*
    action already has a dialog.
  - *Duplicating a hero card* — **the claim was wrong.** It said two presses
    make two cards with the same slug. They cannot: `hero_cards.slug` is
    `TEXT UNIQUE NOT NULL`, so the database refuses the second insert. Re-filed
    as what it actually is, and fixed: the suffix was always `-copy`, so
    duplicating the same card a second time *ever* collided; the button had no
    `disabled` guard though the hook already exposed `isCreating`; and the
    unawaited rejection surfaced as an unhandled promise rejection on top of the
    error toast. The copy is created hidden, so it never reached the public site.
- **Raised by:** [`admin/handle-requests.md`](admin/handle-requests.md#open-questions-and-verification),
  [`admin/send-notifications.md`](admin/send-notifications.md#open-questions-and-verification),
  [`admin/enter-scores-in-bulk.md`](admin/enter-scores-in-bulk.md#open-questions-and-verification),
  [`admin/run-the-playoffs.md`](admin/run-the-playoffs.md#open-questions-and-verification),
  [`admin/manage-teams-and-divisions.md`](admin/manage-teams-and-divisions.md#open-questions-and-verification),
  [`admin/site-settings.md`](admin/site-settings.md#open-questions-and-verification).

### B-12: Failure messages discard the reason the server gave

- **Where the user meets it:** any failed write, anywhere in the app.
- **What happens / what was expected:** the server sends a specific reason — too
  many messages in ten minutes, too many links, a permission refused — and the
  app replaces it with a fixed per-feature sentence, usually ending "Please try
  again." For a rate limit **a retry can never succeed**, and the user is told to
  retry. Expected: the reason reaches the user.
- **Reproduce:** 1. Submit six contact-form messages within ten minutes. 2. Read
  the sixth toast: "Failed to send message. Please try again."
- **Severity:** `medium`. Recoverable, but it costs the user time and it makes
  every failure look the same.
- **Decision needed:** `fix`.
- **Status:** **fixed**, but not the way this entry proposed — see below.
  `getUIErrorMessage` now sanitises before it prefixes: it translates the
  Postgres codes a user can act on (a duplicate name, a missing permission),
  passes through the message of an authored typed error, and otherwise falls
  back to the caller's phrase. Edge-function responses are unwrapped at the
  service layer so their wording survives. Roughly fifty hardcoded handlers were
  migrated; pre-flight validation guards were left alone.
- **Followed up after review — the first cut was too blunt.** Making
  `DatabaseError` mean "may contain raw Postgres text" was right for the ~330
  errors `handleDatabaseError` builds, but it also swallowed messages written
  for a person, so a user was told to retry where a retry could not work:
  - Six TypeScript throws used a type the sanitiser treats as unsafe. "You
    already have a team request. Refresh the page to see it.", "This user
    already has a membership on another team. Remove that membership first."
    and "You must be signed in to submit season participation." all became
    "Something went wrong." They now throw `BusinessLogicError`,
    `AuthorizationError` or `ValidationError`, which carry their wording.
  - The database raises **222** hand-written messages and only **7** set an
    explicit `ERRCODE`, so the rest defaulted to `P0001` and went generic too —
    including the live-scoring guards a scorer used to read mid-match ("Match is
    not decided yet", "Not authorized to finalize this match", "Thrower does not
    play for team 1 of this match"). Those reached users *before* this entry was
    fixed, so this was a regression, not a missed improvement. Six guards now
    mark themselves `USING HINT = 'user-visible'`; everything unmarked stays
    generic, so "Match not found: &lt;uuid&gt;" and the row-count diagnostics
    remain hidden.
  - `AuthorizationError` also stopped replacing its own message with a canned
    line. It is only ever built by our own code, and raw permission failures
    arrive as Postgres `42501` on a separate branch.
- **Corrected on review.** The original proposal — "adopt live scoring's pattern
  app-wide" — would have made the app **less** safe, and would not have fixed
  the reproduce case above.
  - `getUIErrorMessage` did not sanitise anything. It was `error.message` plus a
    prefix, while `handleDatabaseError` builds its message from the **raw
    PostgrestError**. Live scoring's twenty call sites were therefore already
    showing users text like *"new row violates row-level security policy for
    table match_rounds"*. Propagating that pattern would have added ~50 more
    such sites. A sanitiser had to come first.
  - For the contact form the reason was lost **before** the toast.
    `supabase.functions.invoke` reports a non-2xx as a `FunctionsHttpError`
    whose message is the fixed string *"Edge Function returned a non-2xx status
    code"*; the real body is only on `error.context`, and no call site in the
    app read it. Fixing only the toast would have shown that placeholder —
    worse than the generic sentence it replaced.
  - Eighteen further leak sites were found that this entry never listed, in
    `useHeroCards`, `useChallongeFallback`, `useSeasonParticipation`,
    `useTimeslotMutation` (all seven of its catch blocks), `useMatchCreation`,
    `useMatchUpdate`, `useMatchDelete`, `useTeamMembership` and others, all
    interpolating the raw error message straight into a toast.
  - Three test suites mocked `getUIErrorMessage` with a stub that treated its
    second argument as a *fallback* when the real function treats it as a
    *prefix*, so any leak on those paths was invisible to the suite. The stubs
    were deleted before anything else changed.
- **Raised by:** [`help/contact-the-league.md`](help/contact-the-league.md#open-questions-and-verification),
  [`foundations/messages-to-the-user.md`](foundations/messages-to-the-user.md#open-questions-and-verification),
  and eleven other documents.

### B-13: Only one toast is shown at a time, so paired messages are lost

- **Where the user meets it:** anywhere two messages are raised close together.
- **What happens / what was expected:** the second replaces the first
  immediately. Creating a bracket shows "Bracket Created Successfully" and then
  "Data Refreshed" within a second, so the success message is never read
  (`src/components/playoffs/BracketCreationDialog.tsx`). Expected: messages
  queue, or a second message does not fire.
- **Why (from the code):** `TOAST_LIMIT = 1` in `src/hooks/useToast.ts`, with the
  reducer prepending and then slicing to that limit — a hard replacement, with no
  exit animation.
- **Severity:** `medium`. It hides confirmations rather than causing wrong data.
- **Decision needed:** `fix`. Raise the limit, or stop raising the second message.
- **Status:** **fixed.** The limit is now 3, the viewport got a gap, and the
  low-value "Data Refreshed" toast was removed — the dialog navigates away a
  second later, so making that message *visible* was not the same as making it
  worth reading. `TOAST_REMOVE_DELAY` had to move with the limit: Radix
  auto-closes a toast after ~5s, which only sets `open: false`, and the old
  1000000ms delay then kept the closed toast in state for 16.7 minutes, where it
  would have occupied one of the new slots. It is now 1000ms. This also gave
  `useToast` its first test coverage.
- **Corrected on review.** The second example in this entry does not exist. The
  claim was that a bulk score batch's summary toast is stolen by the refresh
  that follows (`useScoreEntryData.ts:221` then `:235`). Line 235 is
  `await fetchMatches(filters)`, not a toast, and the whole `finally` block
  raises none: exactly one toast fires on a successful batch. A refresh error
  toast can fire from `useMatchesFetching`, but only on a failure path. The
  entry's own severity note — that the bulk score tool survives this by design —
  was the accurate half.
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
- **Status:** **fixed.** Confirmed on 2026-08-25 against commit `ea5c8f4` by
  driving Chromium against the dev server — scrolled to 337px on `/schedule`,
  clicked an in-app link to `/help`, still at 337px. Checklist item `NAV-01`.
  A `ScrollToTop` component now sits beside `RouteAnnouncer`, modelled on
  `RouteFocusManager`: it skips POP so `useScrollRestoration` still wins on a
  back navigation, and watches `pathname` only, because several pages call
  `setSearchParams` with `replace` from an effect. `<ScrollRestoration>` was not
  an option — it needs a data router and the app uses `<BrowserRouter>`.
  One prerequisite was not in this entry: returning from a team page to `/stats`
  was a *forward* navigation (`navigate(state.from)` plus a 100ms smooth scroll),
  so a POP guard alone would not have covered it and the page would have jumped
  to the top and then glided back. That handler now pops history instead, which
  also deleted the timer and five dead `scrollPosition` link payloads.
- **Raised by:** [`foundations/navigation.md`](foundations/navigation.md#open-questions-and-verification),
  [`teams/browse-teams.md`](teams/browse-teams.md#open-questions-and-verification),
  [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification).

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
- **Status:** **fixed.** Confirmed on 2026-08-25. A preflight sent with
  `Origin: https://717rec.app` returns `access-control-allow-origin:
  https://717rec.app`; the same preflight with `Origin: http://localhost:8080`
  returns no such header, and a browser fetch from the dev server fails with
  "TypeError: Failed to fetch". Checklist item `CONTACT-27` — this entry
  previously cited `CONTACT-05`, which is a different item, about field focus.

  *Corrected on review.* The entry named two functions; there are **three**.
  `submit-contact-request/index.ts:21-27` had the same gap, and it is the one
  the reproduction steps above actually reach: `/contact` submits through
  `ContactRequestService.ts:25`, which invokes `submit-contact-request`, not
  `send-support-email`. All three now carry `http://localhost:8080`.

  A fourth function, `pageview/index.ts:8-15`, already had it. That was the
  evidence for the intended value: the list is copied into each function rather
  than shared, so one copy was updated and three were not. A shared
  `_shared/cors.ts` was considered and not built — the league chose the smaller
  change. The drift risk is now written down in
  [`docs/PRODUCTION_SETTINGS.md`](../PRODUCTION_SETTINGS.md) instead.

  No test anywhere asserted `Access-Control-Allow-Origin`, which is why this
  survived: every test helper sent an origin that was already on the list. Each
  of the three functions now has two cases — a preflight from
  `http://localhost:8080` gets the header, and a preflight from an unlisted
  origin gets none. Both were checked against the unfixed code first.

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
- **Status:** **fixed.** `MessageFeed` now takes an `isSignedOut` flag and shows
  "Sign in to read the board" with a Sign In button in place of the empty state;
  the page supplies it, because the page already knew — it has swapped the
  composer for a sign-in bar on the same condition all along
  (`src/pages/MessageBoard.tsx`). So a visitor was being told both "be the first
  to start a conversation" and "sign in to post messages" on one screen.

  The refresh toast was the second half of the same lie and is fixed with it: the
  read succeeds and returns nothing, so it never threw, and the visitor was told
  "Latest messages have been loaded". A visitor now gets "Sign in to read
  messages" instead.

  The flag is gated on `authInitialized`, not on `user` alone. Without that, a
  reload flashes the sign-in prompt at a signed-in member before the session is
  restored.

  No route guard was added — the page still opens for a visitor, and only the
  messages are withheld.

  *Corrected on review.* There are **two** SELECT policies on `messages`, not
  one: `20250614141604_*.sql:5-9` and the `20251010171351_*.sql:4-11` this entry
  cites, added a year apart by a migration titled "Fix: Add SELECT policy" that
  was seemingly unaware of the first. Both are `TO authenticated`, so the
  conclusion stands, but anyone changing the read rule must find both.

  The page-level test stub reproduced the buggy copy and asserted it, so it had
  to change with the component; the signed-out case is now covered against the
  real component too. The board tests also imported `MemoryRouter` from
  `react-router-dom` while the app uses `react-router` — a mismatch that only
  surfaced once the feed needed a router hook.

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
- **Status:** **fixed.** The league took the first option. Reopening stays open to
  any scorer on either team — a scorer at the field correcting a score should not
  have to find an admin — and gains the friction and the trace it was missing.

  The prompt is modelled on the undo-round dialog and names the game: "Reopen
  Game 2?", "This puts Game 2 back in progress so a score can be corrected. Its
  rounds are kept. The other team's scorer is told, and their screen changes
  too.", with "Keep game closed" and "Reopen game".

  The notice is raised by the live connection (`useLiveMatchRealtime`) when a
  game goes from completed back to in progress, not by the mutation. That is
  deliberate: every subscriber is told, including whoever pressed the button, so
  the person acting sees it once. A success toast on the mutation *as well* would
  have given them two and destroyed the first — which is B-27 in this same list.
  The previous status is read from the query cache rather than `payload.old`,
  because `postgres_changes` only carries the old row with `REPLICA IDENTITY
  FULL`, which `games` does not have.

  *Corrected on review.* The entry cites `LiveMatchView.tsx:246`; that line is
  the close of `renderScoring`. There are **two** reopen buttons, not one, at
  `:307-319` (between games) and `:347-359` (after the match is decided but not
  finalised), with duplicated JSX. Both now render one shared
  `ReopenGameButton`, so the prompt cannot drift between the two paths.

  Not fixed, and still open: there is no record of *who* reopened a game. The
  notice says a scorer did it, not which one.

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
- **Status:** **fixed.** Rejecting now stamps `rejected_at` and `rejected_by`
  instead of deleting. The requester's panel shows a red "Request declined" card
  in place of the yellow pending one, and the join form underneath so they can
  ask again. The dialog's wording is corrected: it describes a request to join,
  not a membership being ended.

  Two constraints shaped this, and neither was in the entry.

  **There was no status column.** `team_memberships` had one state column,
  `is_approved`, a non-null boolean. `false` already meant "pending", so
  rejecting genuinely could not be expressed by flipping it — the row had to go,
  or it would sit in the queue forever. The service's own comment said so. A
  migration adds `rejected_at` as the third state; the two queue reads now
  exclude it, which is what keeps the queue clear.

  **One membership row per user, ever.** `idx_one_membership_per_user`
  (`20260827120000`) is a *total* unique index on `user_id`, so a kept refused
  row occupies the person's only slot. Asking again therefore has to update that
  row rather than insert beside it. It already took the update path when a row
  existed; it now also clears the refusal and restamps `joined_at`.

  No RLS change was needed. The UPDATE policy (`20260818195805`) already lets a
  person update their own row while `is_approved = false`, which is exactly the
  path that clears a refusal. Its `WITH CHECK` still pins `is_approved = false`,
  `approved_by IS NULL` and `approved_at IS NULL`, so nobody can approve
  themselves.

  One thing had to be fixed to avoid a regression: four places read
  `membership?.team` without checking `is_approved` — the user menu's team link,
  the contact form's prefilled team, match-comment attribution, and the team
  stamped on a posted message. A refused row is truthy, so all four would have
  shown a team the person had just been refused from. They now read a derived
  `activeMembership`, which is null for a refusal. (They were already treating a
  *pending* row the same way; that is a separate, pre-existing question and was
  left alone.)

  `types.ts` is generated from the live database and could not be regenerated
  here. The two columns were added to it by hand, in the same commit as the
  migration that defines them, at the league's direction. **Re-running the
  generator after the migration is applied should produce no change; if it does,
  the generator wins.**

  *Corrected on review.* The entry cites `TeamMembershipService.ts:175-178`; the
  delete was at `:189-203`.

  *Second correction, on review of the pull request.* Keeping the row made a
  path reachable that never had been: `joinTeamMembership` updates the existing
  row, and `trg_prevent_team_membership_reassignment` (`20260713190745`) refuses
  every non-admin change to `team_id` with `42501`. Asking the **same** team
  again worked, so only "declined by team A, now ask team B" failed — the likely
  case, and a raw permission error rather than a message. Before the row was
  kept, a refused person had no row at all, so asking again inserted rather than
  updated and never met the trigger.

  `20260831010000` exempts a declined request from that lock: `team_id` may move
  when the old row is refused and not approved. Nothing else the trigger holds is
  loosened, and it grants nothing new — the person could already delete their own
  row and insert one for any team, so this is the atomic equivalent. `is_approved`
  is now pinned false on refusal so "declined" and "approved" can never coexist,
  which is what the exception keys on. `supabase/tests/declined_request_team_change.sql`
  pins both halves, and was checked against the unfixed schema first: it
  reproduces `team_id cannot be changed on an existing membership`.

  Not fixed, and deliberately: **the league still gets no history.** Asking again
  clears the mark, so a second request looks new to the admin. That follows from
  the decision to let a refused person ask again. There is also still no
  notification — `team_memberships` is not in the realtime publication and
  `admin_notifications` has no recipient column — so the declined card appears on
  the next refetch, up to five minutes, or at once on a reload.

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
  your connection and try again." had no importer, so that sentence was never
  shown to anyone. That hook and the `handleHookError` behind it have since been
  **deleted** as part of [B-12](#b-12-failure-messages-discard-the-reason-the-server-gave),
  whose sanitiser supersedes them.
- **Severity:** `low`. **Decision needed:** `fix`. Remove them, or finish them.
- **Raised by:** [`admin/send-notifications.md`](admin/send-notifications.md#open-questions-and-verification),
  [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification),
  [`cross-cutting/errors-and-offline.md`](cross-cutting/errors-and-offline.md#open-questions-and-verification).

---

## Note: what the DeepSource coverage check actually measures

Not a defect in the app — recorded so the next person does not spend a round
rediscovering it.

The coverage check reports **Failure** on pull requests while every metric is
*rising*. That is not a threshold breach:

- **Coverage thresholds are set in DeepSource's web UI**, per repository, not in
  `.deepsource.toml`. None are set for this repo, which is why every Threshold
  column reads `N/A`. A run fails on a threshold only when one is set *and*
  enforced.
- The status is driven by the count of **uncovered-line annotations**, and the
  analyzer annotates every file a pull request *touches*, not the lines it
  changes. A one-line edit to `useMessageBoard.ts` pulls all of that file's
  long-standing uncovered lines into the report.

So the check cannot be made green by covering the code a branch actually adds.
On the branch that fixed B-11 to B-14, of the ~180 uncovered lines reported,
**seven** were added by the branch; all seven are now tested, and the check
still reads Failure.

**The gate that does bind this repo is `vitest.config.ts`**, which enforces
per-area coverage floors — `src/components/**` and `src/pages/**` have their own
— and CI runs it. `coverage-baseline.txt` is a manual snapshot, promoted with
`npm run test:coverage:update-baseline`, not an enforced gate.

Two options if the check should mean something: set thresholds in the DeepSource
UI so it reflects a real bar, or accept that its status tracks the repo's
overall coverage debt rather than the change under review.

One related trap, since it cost a round here: **`.deepsource.toml` is read from
the default branch.** Config changes on a branch do not affect that branch's own
analysis — they take effect once merged.
