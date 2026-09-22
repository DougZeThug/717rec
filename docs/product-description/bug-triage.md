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
merging by root cause the original pass came to 42 entries. The list has grown
since, as later readings found defects the documents never raised, and now holds
**62 entries**: 15 high, 30 medium, 16 low, and B-06, which carries no severity
because it was cleared as not a defect. All of them are now closed. Several were **not raised as
defects by any document**. B-40, a `high`, was found while checking B-20. B-41, a
`medium`, was recorded in `home/the-home-page.md` as an open question and could
not be reached until
[B-31](#b-31-two-dead-features-are-visible-in-the-interface) added the control
that switches its feature on; it was fixed in that same change. B-49 to B-52 came
out of code readings rather than screens, as did B-54 to B-60 — seven defects
found by reading the code against these documents, all seven fixed in the change
that recorded them. B-61 came out of the review of that change, and was closed
as a product call: the league chose to accept the behaviour rather than change
it.

*The counts in this paragraph had gone stale.* They still read "42 entries: 13
high, 23 medium, and 6 low" long after the list had grown past them, and are
corrected here by counting the **Severity** line on each entry. Two things make a
count by eye come out wrong: B-06 has no severity line at all, and B-41 sits
under the `## Low` heading while being marked `medium`.

**All sixteen `low` entries are now closed.** Fifteen were fixed; B-26 was put
to the league as a product call and left as it is, documented rather than
changed.
Three — B-27, B-30 and B-53 — carried claims that had gone stale or were recorded
as open questions between the reading and the fix, and all three are corrected in
place. B-41 was fixed in the same change that made it reachable.

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

**Controls that cannot be reached where they are needed.** B-24 is now
**fixed**: every bracket admin control used to be hidden below 768 pixels, so
an admin running the playoffs from the venue — on a phone, the likeliest device
— could reach none of them. They now sit behind one overflow menu on a phone,
unchanged on a wide screen.

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

A third theme ran under them and is now fixed across seven entries:
**the app telling the user something that is not true.** Three of them are in
the stats pages, and all three were controls or figures that looked like
measurements and were not. B-34: four standings columns re-sorted the table on
every press and sorted by power score whichever was pressed. B-36: two of the
six letter grades on a team's report card were a placeholder and an estimate,
and the Clutch grade was a raw win rate printed as a percentile — a team 3–2 in
deciding games was labelled "60th". B-35: the King Slayer badge was decided by a
career power score that differed from the one on screen by 41 points on a
threshold of 25. Two of the three reports were themselves wrong in part — B-35
named a migration that had been dead since March and proposed reading a stored
value that does not exist, and B-36 named the wrong screen while missing a
larger fault underneath. See each entry's *Corrected on review* note.

The original four: B-15 failed the contact
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

A fourth theme appeared only once the code was read rather than the screens:
**an operation that has never worked at all.** B-40 was found while checking
B-20. `games.match_id` carried no delete rule, so the bin in the Scores tool and
the whole season-archive operation both failed on any match that had been scored
live. Nothing raised it, because nothing in the product says it should work —
the documents describe the bin as deleting the match, and it does not. It also
reshaped B-20: archiving deletes a season's finished matches, so what stays
editable in an archived season is its unfinished ones, which is a narrower and
sharper problem than that entry described.

A fifth theme was **controls that look live and are not.** B-21 gathered eight of
them across the admin screens and `/my-team`; all eight are now wired up rather
than removed, and two of them were not as the entry described — one failed
loudly rather than silently, and one was dead for a different reason than the one
given. Fixing the honest version of *Edit Bracket* also closed a hole the entry
did not anticipate: the mislabelled button was the only route to a second bracket
in a division, so a real Create control had to take its place.

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
| B-40 | Deleting or archiving a live-scored match fails on a foreign key | high | admin | **fixed** | — |
| B-44 | Approving a refused request leaves it refused, locking the member out | high | admin, teams | **fixed** | — |
| B-45 | A profile left behind by the previous user can grant admin | high | foundations | **fixed** | — |
| B-11 | Four destructive admin actions have no confirmation | medium | admin | **fixed** | — |
| B-12 | Failure messages discard the reason the server gave | medium | all | **fixed** | — |
| B-13 | Only one toast is shown at a time, so paired messages are lost | medium | all | **fixed** | — |
| B-14 | Scroll position carries across every in-app navigation | medium | foundations | **fixed** | — |
| B-15 | The support and score-report functions refuse the app's own dev origin | medium | help, scores | **fixed** | — |
| B-16 | A visitor sees an empty message board and is told to be the first to post | medium | message-board | **fixed** | — |
| B-17 | Reopening a live game needs no confirmation and tells nobody | medium | live-scoring | **fixed** | — |
| B-18 | Rejecting a membership deletes the row, so the person is never told | medium | admin, getting-started | **fixed** | — |
| B-19 | Live corrections can leave a match disagreeing with itself | medium | admin | **fixed** | — |
| B-20 | Archived seasons are editable through live corrections | medium | admin | **fixed** | — |
| B-21 | Eight controls do nothing when pressed | medium | admin, teams | **fixed** | — |
| B-22 | Reduced-motion is honoured in one stylesheet and ignored everywhere else | medium | cross-cutting | **fixed** | — |
| B-23 | The mobile menu is not a dialog | medium | cross-cutting | **fixed** | — |
| B-24 | Bracket administration is unreachable on a phone | medium | playoffs, admin | **fixed** | — |
| B-25 | Anyone signed out can report a score for any match | medium | scores | product call | — |
| B-34 | Four standings columns silently sort by power score instead | medium | stats | **fixed** | — |
| B-35 | A stale fourth career power-score formula decides one badge | medium | stats | **fixed** | — |
| B-36 | Two grades on the team report card are not real measurements | medium | stats | **fixed** | — |
| B-38 | The head-to-head dialog shows the wrong W/L badge on half of every team's matches | medium | history, stats | **fixed** | — |
| B-41 | The "Confirm your team" card has no sign-in check and lists hidden teams | medium | home | **fixed** | — |
| B-43 | Three links in a message are counted as six and refused as spam | medium | help | **fixed** | — |
| B-46 | A failed division-weights read empties the career rankings silently | medium | stats, teams | **fixed** | — |
| B-49 | A failed team list empties the career rankings table | medium | stats | **fixed** | — |
| B-48 | A won game can be ended on a round that is still on its way | medium | live-scoring | **fixed** | — |
| B-26 | Session replay records one visit in ten with no notice | low | cross-cutting | **documented** | — |
| B-27 | Several actions raise two success toasts | low | admin, teams | **fixed** | — |
| B-28 | Message timestamps show a clock time with no date | low | message-board | **fixed** | — |
| B-29 | Results are distinguished by colour alone in two places | low | schedule, teams | **fixed** | — |
| B-30 | Small copy and labelling slips | low | several | **fixed** | — |
| B-31 | Two dead features are visible in the interface | low | admin | **fixed** | — |
| B-47 | The scorer who reopens a game is sometimes the only one not told | low | live-scoring | **fixed** | — |

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
  only by the absence of the word "final"
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
- **See also:** [B-45](#b-45-a-profile-left-behind-by-the-previous-user-can-grant-admin),
  the opposite error on the same decision — this one made a failed read read as
  "not an admin"; that one let a leftover profile read as "yes, an admin".

### B-45: A profile left behind by the previous user can grant admin

- **Where the user meets it:** an ordinary member who signs in on a device or
  browser profile where an admin was signed in before, and whose own profile
  read then fails.
- **What happens / what was expected:** they are shown the admin interface.
  Expected: admin is decided from **their** profile, and a profile that cannot
  be read shows the "could not check" retry card.
- **Reproduce:** 1. Sign in as an admin. 2. Without signing out, sign in as a
  non-admin in the same browser. 3. Make the second profile read fail. 4. Open
  `/admin`.
- **Why (from the code):** `useAdminAccess` computed
  `authInitialized && Boolean(user) && profile?.is_admin === true` — it never
  checked that the profile it was reading **belonged to** `user`. The profile
  was dropped only when a session ended (`src/hooks/auth/index.ts`), so signing
  in as somebody else left the previous profile in place, and neither the
  listener's nor the bootstrap's failure branch cleared it.
- **Why it was more than a flicker:** `accessCheckFailed` required `!profile`.
  A leftover profile is not null, so the retry card was skipped and
  `ProtectedAdminRoute` fell straight through to its "granted" branch. Once the
  new user's read had failed, that was a **stable** state, not a brief window:
  `refreshProfile` — the retry action — also kept the old profile on failure.
- **How far it goes:** the server is not fooled. Every admin policy resolves
  admin-ness from the signed-in token through `current_user_is_admin()`, so the
  writes and admin reads behind that interface are still refused. What is
  exposed is the admin interface itself and admin-only client content. It is a
  real authorisation-on-stale-data defect and the only one on the client —
  `src/lib/mcp/tools/_supabase.ts` re-reads `is_admin` from the database keyed
  to the caller and is correct.
- **Severity:** `high`. An authorisation decision made from the wrong person's
  record, reachable without any deliberate act by the user.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **fixed**, in two halves. `useAdminAccess` now requires
  `profile.id === user.id` before granting, and counts a profile belonging to
  anyone else as a failed check rather than an answer, so the retry card is
  shown. The profile id was already fetched (`ProfileService` selects it), so
  no query changed. Separately, the auth hook stops *keeping* a foreign
  profile: one `keepProfileOnlyFor` updater is applied when a different user
  signs in, in both failure branches, and in `refreshProfile`.

  *Checked for the obvious regression.* An admin must not be bounced to the home
  page on an ordinary token refresh. `ProtectedAdminRoute` shows its spinner
  whenever `isLoading`, which is `!authInitialized || isProfileLoading`, and the
  user-change path sets `isProfileLoading` before it fetches — so the gap where
  the profile is cleared is covered by the spinner, never by the redirect. For
  the same user nothing is cleared at all. The change only ever tightens.

  Six tests. Four fail against the unfixed code: two on the hook (a foreign
  profile grants nothing; a foreign profile plus a failed read reports the
  failure) and two on the auth hook (the held profile is dropped when a
  different user signs in, and is not kept when the new user's read fails). The
  other two are non-regression guards — a failed read for the *same* user keeps
  that user's profile, which is what B-08's fix depends on. Every profile
  fixture in `useAdminAccess.test.ts` now carries an id, because a fixture
  without one could not express the bug.

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

### B-44: Approving a refused request leaves it refused, locking the member out

- **Where the user meets it:** a member whose join request was refused and then
  approved. Their account keeps behaving as though they have no team, and
  nothing in the app can put it right.
- **What happens / what was expected:** the row ends up approved **and** still
  stamped refused. Expected: a membership is pending, approved, or refused —
  never two at once.
- **Reproduce:** 1. Refuse a join request in *Member Approvals*. 2. Approve that
  same row. 3. Sign in as that member.
- **Why (from the code):** `updateMembershipApproval`
  (`src/services/teams/TeamMembershipService.ts`) had two branches and each wrote
  only its own half. Approve set `is_approved/approved_at/approved_by` and left
  `rejected_at` where it was; refuse set `is_approved/rejected_at/rejected_by`
  and left `approved_at` where it was. `joinTeamMembership` in the same file has
  always cleared both sides, so the two disagreed.
- **Why the member cannot recover:** `rejected_at` is the single thing the rest
  of the app reads as "this person has no team"
  (`src/hooks/useTeamMembership.ts:123`), so a non-null value removes every team
  ability and shows the red *Request declined* card. *Leave Team* is hidden in
  that state (`TeamMembershipSection.tsx:37`), so they cannot start over. Both
  admin queue reads filter on `.is('rejected_at', null)`
  (`TeamMembershipService.ts:128,148`), so no admin sees the row to fix it. And
  the RLS policy on `team_memberships` only lets a member update their own row
  while `is_approved = false`, so they cannot clear it themselves. A direct
  database edit is the only way back.
- **Severity:** `high`. A member is permanently locked out of their team by an
  ordinary admin action, with no route back through the product.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **fixed.** Each branch now clears the other's two stamps, which is
  what `joinTeamMembership` already did. The refuse side matters for a second
  reason: the member's own re-request is written under an RLS check that pins
  `approved_by` and `approved_at` to NULL, so a refused row still naming an
  approver would have its re-request refused.

  Two tests, one per branch, asserting the cleared fields. Both were checked
  against the unfixed code first and failed there with `expected undefined to be
  null` — the fields were simply absent from the patch.

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
- **One site was missed, and is migrated now.** `useMatchComments`' delete
  handler toasts from two branches on the same error. The rarer one — a realtime
  delete already confirmed — was migrated; the shared fall-through, which is the
  path an ordinary delete failure takes, kept the fixed sentence "Failed to
  delete comment". It reads the reason like the rest now.
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

  *Did not hold in practice.* "The person acting sees it once" was the point of
  raising the notice from the live connection, and it was not what happened: the
  same mutation's refetch can overwrite the status the check reads, leaving the
  actor told nothing. See
  [B-47](#b-47-the-scorer-who-reopens-a-game-is-sometimes-the-only-one-not-told).

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
  *pending* row the same way; that is a separate, pre-existing question, left
  alone here and since answered and fixed in
  [B-42](#b-42-a-player-waiting-for-team-approval-cannot-post-on-the-message-board-at-all).)

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
- **Status:** **fixed**, taking the entry's first option. The state is now
  tracked and it is now fixable in one press. The result is deliberately **not**
  re-decided automatically.

  **A third data-integrity card** sits on League Night Status beside the two that
  were already there: *Matches that disagree with their rounds*. It counts the
  disagreement rather than storing it, the way `UnsavedLiveMatchesService`
  counts a decided-but-unsaved match, and reports five kinds, worst first — the
  recorded winner the games do not support, stored game wins that do not match,
  a completed game whose winner its rounds contradict, a completed game whose
  stored score its rounds contradict, and a completed game with no rounds left.
  Each row names what is stored against what the rounds say.

  **The third kind first missed the case it was most needed for.** It only fired
  when the rounds decided somebody *else*, so a game whose rounds decide nobody —
  under 21, or at 21 by a single point — went unreported however its winner was
  recorded. `setGameWinner` is the way into that state and it also writes the
  fold as the game's score, so the fourth kind stayed quiet too and the match
  level counted the recorded winner as a real game win: the card said "all clear"
  on all three checks. The kind now reports a stored winner the rounds do not
  give the game to, nobody included. A stale score is still reported as a stale
  score: deleting a round from a finished game leaves the old totals in place on
  purpose, and naming that a wrong winner would outrank and bury it.

  **Written in TypeScript, not as a view.** `v_counter_drift` was the other
  precedent, but `rules.ts` says *"Change game rules only here"*, and a view
  would hard-code first-to-21-win-by-2 a second time and drift silently. The
  service reuses `foldGameTotals`, `checkGameWinner` and `deriveMatchState`.

  **Match-level checks only fire once a result is recorded**; game-level checks
  fire on any completed game, because `completeGame` writes the fold's totals and
  winner atomically, so a difference there is always a correction that was never
  carried through. Games still in progress are skipped: `reopenGame` leaves the
  old totals in place on purpose, so checking them would report noise. That
  distinction was not in the entry and is what keeps the card quiet.

  **`Reopen & re-save result`** now sits in the corrections panel itself, on a
  finalised match. It asks first, because reopening reverses both teams' records.
  It is one `reopenAndRefinalize` mutation rather than the two existing ones
  fired in turn, so the admin gets one toast and one cache refresh. The amber
  warning and both dialog descriptions point at it instead of the live view.

  The half-done case is reported honestly, which the entry did not anticipate:
  if reopening succeeds and the save is then refused — the games no longer decide
  a winner — the old result is already reversed and the match is left open. The
  toast says exactly that and what to do next, and the screens are refreshed
  anyway because the records have moved.

  **Deliberately not done: automatic re-deciding.** Making `deleteRound`
  re-decide the game and the match would reverse and re-apply both teams' records
  in the middle of a correction, moving the standings under an admin who is
  halfway through a multi-step fix. The entry offered it as the alternative; it
  was the wrong one.

  **Also deliberately limited: the card is scoped to the active season.** The fix
  for a row is a re-save, and `finalize_live_match` increments the `teams`
  counters with no season filter, so listing an archived season's match would
  invite an admin to add an old result to the current standings — the same reason
  the unsaved-matches card gives. A disagreement in any other season is therefore
  not listed. There is still **no audit trail**: the card shows the state, not the
  history, so once a match is re-saved nothing records that it was ever corrected.

  *Answered on review.* The raising document asked whether deleting the last round
  of a completed game leaves it completed with a winner and no rounds. **It does**,
  and that is now one of the five kinds the card reports.

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
- **Status:** **fixed**, taking the entry's first option. An archived season is
  read-only in Live Corrections. Its matches are still listed and still readable;
  what goes is the ability to change them.

  **The panel decides from the match, not the filter.** Archived-ness is read
  from `bundle.match.season_id`, not from the season picker, because a selected
  match stays open when the filter changes — the entry's own sibling edge case.
  `useSeasons` is already cached by the section, so this costs no extra request.
  On an archived season the pencil, the bin, **Change winner** and **Reopen &
  re-save result** are all absent, and a grey banner names the season and says
  what the freeze covers. The finalized warning is dropped there, since nothing
  can be edited to disagree with.

  **The service refuses as well**, so this is not only a UI trick: all three
  writes look up the match's season first and throw a `BusinessLogicError` naming
  it. That is one extra read on an operation an admin performs by hand a few
  times a season. `BusinessLogicError` is authored text, so `getUIErrorMessage`
  passes it to the toast unchanged.

  **The list says so before anything is selected.** The picker marks archived
  seasons — "*name* (archived — read-only)" — and every card belonging to one ends
  its counts line "archived, read-only", because the default "All seasons" filter
  applies no season filter at all and mixes them in without anyone choosing.

  *The entry understated the risk, and misjudged the exposure.* `archive_season`
  deletes a season's finished matches, so what survives for an archived season is
  its **unfinished** ones — not, as "a frozen season's rounds are editable here"
  implies, its whole history. Those survivors are exactly the set
  `useUnsavedLiveMatches` deliberately refuses to surface, because
  `finalize_live_match` bumps the `teams` counters with no season filter and
  saving one would add an old result to the current standings. Live Corrections
  was offering the admin the very matches its sibling card hides. So this was
  never only a tidiness question about the word "frozen".

  *Also worth recording:* the computed-number half of the freeze was already
  enforced in SQL. `upsert_team_season_stats` refuses to recompute an archived
  season's `power_score`, `sos` or `division_name` unless a deliberate repair
  passes `p_include_archived`. The gap was only ever the raw rows underneath.

  **Not covered, deliberately:** a season's name and dates are still editable
  like any other's, and the bulk Scores tool is still not season-scoped
  (see BULK-25). Both are separate surfaces and neither was in this entry.

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
- **Status:** **fixed**, all eight, each wired up rather than removed. Two of
  them turned out to be different from the entry's description; see *Corrected
  on review* below.

  **The Double Header switch** now writes. The page renders the assignment form
  **twice** — once for a narrow screen, once for a wide one — and *neither*
  passed the handler; the entry cites only the first. Both pass it now, reusing
  the mutation the admin Timeslots tab already used.

  **9:30 PM** is now offered only where it works. It is a real block time and a
  valid single assignment; it simply has no back-to-back partner, because
  nothing follows it. Double-header mode therefore lists only the times that
  start a pair, derived from `BACK_TO_BACK_PAIRS` so the list cannot drift from
  the pairs again. The component's own hardcoded copy of the times is gone,
  replaced by `ALL_BLOCK_TIMES` — that duplicate is *how* the picker and the
  pair table drifted apart, and B-03 fixed the same duplication in the other
  picker.

  **"Edit Bracket"** now edits. There was no update path in the service layer at
  all, so a typo in a bracket's name was permanent unless the whole bracket —
  and every match played in it — was deleted. **The scope is deliberately
  narrow: the title and the division, nothing else.** A bracket's format, size
  and team list define its generated stage, rounds and matches, so changing them
  means deleting and rebuilding, which cascades away played matches with no
  undo. *Update Seeding* and *Rearrange Teams* already handle the structural
  cases, including refusing when results would be affected. The division is
  editable only until the first match is played: after that, moving the bracket
  would leave its teams behind in the old division, and the dialog says so.

  *Corrected after review.* The first version of this fix got two things wrong,
  both caught by a review bot and both verified before fixing. The dialog read
  "has the bracket started?" from `brackets.state` — but **nothing in the app
  ever writes an in-progress state**; a bracket goes straight from `pending` to
  `completed`, so the division would have stayed editable for a whole
  tournament. It is now read from the matches. And the bracket data reaching the
  dialog carried the division's *display name* but not its **id**, so a plain
  rename would have written a null division and dropped the bracket out of the
  grouped list. The id is now carried through, and the division is written only
  when the admin actually changes it. No migration was needed — the admin `UPDATE` policy on
  `brackets` already existed, and the table's only `AFTER UPDATE` trigger fires
  on a `state → completed` transition, which a rename does not touch.

  **The Create Team Cancel button** returns to *Manage Teams*. The tab set is
  now controlled; the inactive tab unmounts, so the half-filled form is
  discarded with it.

  **The two navigation buttons** change tab in place. The fragments they set
  were exactly the admin tab ids, so tab navigation was plainly the intent. The
  active tab is private to the sidebar, so a new `utils/adminTabs` helper
  carries the request as a window event. **The League Night Status queue tiles
  moved onto it too** — they were the one place this half-worked, and they did
  it by reloading the whole page. That reload is gone.

  **The division editor** now says what is wrong. A blank name and a
  non-positive weight each raise a destructive toast.

  **`/my-team` is reachable again.** This is wider than the entry asked, and the
  entry's own fix would have left a hole. The user menu sent a member to their
  team's *public* page, which has neither *Leave Team* nor the edit control, so
  both were hidden from exactly the people entitled to them. The menu item now
  always points at `/my-team`; only its label changes.

  *Corrected on review.* Two of the eight were not as described.

  **"9:30 PM" is not silent.** The entry files it under controls that do
  nothing. It raises a toast from the mutation hook and a second one from the
  screen over the top of it. It failed *loudly*, and always. That makes it a
  smaller defect than the entry implies — and a different one: the picker
  offered a choice the service could never accept, rather than a control that
  went nowhere.

  **The join-team entry gives the wrong cause.** It says the control renders
  only when there is no membership. It also renders when a membership was
  **refused** — and that case is caught by an earlier branch. The genuinely
  unreachable branch is the "change teams" one, unreachable because a member
  sees the team card with *Leave Team* and never a team picker. The conclusion
  (dead code, now removed) was right; the reason was not.

  *Also found, and not in the entry.* `DivisionBracketsCard` declared an
  `onEditBracket` prop it never used, so the bracket list forwarded a handler
  into nothing — a **ninth** dead wire behind the eight controls. It is gone.

  **Deliberately not done: a bracket editor that can change teams.** The entry
  says "wire them up or remove them", and for *Edit Bracket* the honest wiring
  stops at the title and the division. Anything more would either be refused by
  the bracket library the moment a result exists, or would mean a delete and
  rebuild that destroys played matches. Admins who need that have two working
  controls already.

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
- **Status:** **fixed**. The setting is now honoured throughout. Three changes,
  in order of reach, because no single one could cover it:

  **A global block at the end of `src/index.css`** collapses every animation and
  transition to nothing and turns off smooth scrolling. There are no `@layer`
  directives anywhere in `src/`, so source order settles it without specificity
  games. This reaches the page transitions, the seventeen keyframes in the
  Tailwind config, and the ten more hand-rolled in `styles/animations.css`.

  **`MotionConfig reducedMotion="user"`**, added inside the `LazyMotion` wrapper
  that already existed, makes every framer-motion animation honour the setting
  at once. That is the 49 files a stylesheet cannot reach, because they animate
  through inline styles rather than classes.

  **A `usePrefersReducedMotion` hook** covers what neither reaches: the snowfall
  is drawn on a **canvas**, so no CSS rule can stop it, and the three scroll
  calls that pass `behavior: 'smooth'` decide in JavaScript.

  **Spinners and skeletons keep moving, on purpose.** A spinner is how a user
  knows the app is still working, and a skeleton pulses its opacity rather than
  moving. Freezing either would take away information, not motion.

  *Corrected on review.* Two of the entry's specifics were wrong, in opposite
  directions.

  **The snowfall is narrower than described.** "The home page's 200-flake
  snowfall" drops a qualifier: it needs the winter theme *and* the home page,
  and the default theme is dark. The raising document
  ([`accessibility.md`](cross-cutting/accessibility.md)) says "when the winter
  theme is on"; the summary here lost it.

  **"68 animated components" understates the problem.** That figure is not
  reproducible by any natural count. The closest is ~72 files using `animate-*`
  outside the component library; the defensible figure is ~155 files, or ~89 if
  spinner- and skeleton-only files are excused.

  *Also found, and not in the entry.* The one honoured rule was **weaker than it
  looked**: its stylesheet is lazily imported, so it was not even in the main
  bundle and loaded only once a bracket rendered. And `styles/base.css` set
  `scroll-behavior: smooth` on `html` globally — a documented reduced-motion
  offender the entry did not mention. Both are covered now.

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
- **Status:** **fixed**, but **not** the way this entry proposes. The menu is
  now a proper *disclosure*, not a dialog.

  **Why not a dialog.** The menu is not an overlay. It is a panel that expands
  in place under the top bar and pushes the page down; it covers nothing. For
  that, `aria-expanded` with `aria-controls` is the correct pattern, and a
  dialog role would describe something the component is not. Taking the entry's
  advice literally would have meant adding a slide-in `Sheet` the project does
  not have, changing how the menu looks, and working through its collisions with
  the bottom tab bar, the phone safe areas and the sticky header's stacking —
  a redesign, to fix an accessibility bug. So the *facts* of this entry were
  taken and its proposed *fix* was not.

  **What changed:** the button carries `aria-expanded` and `aria-controls`, and
  the panel has a matching id. Escape closes the menu and gives the button its
  focus back. Focus moves to the first link when the panel opens. Closing on a
  route change already worked and is untouched.

  **Deliberately not done: a focus trap and a scroll lock.** Both belong to
  modals. Tab order already flows through this panel and out into the page
  behind it, which is what a disclosure should do.

  *Corrected on review.* **"The button does not say whether it is open" is
  wrong.** Its `aria-label` already toggled between "Open menu" and "Close
  menu", so the accessible name did change. That is a weaker signal than
  `aria-expanded` — a name change is not reliably re-announced, and it says
  nothing about a controlled region — but the claim as written is false, and the
  raising document
  ([`accessibility.md`](cross-cutting/accessibility.md)) states it correctly.
  The label is kept alongside the new attributes. The cited line range was also
  off: the panel is at `MobileMenu.tsx:52-64`, not `:32-66`.

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
- **Status:** **fixed.** Confirmed at 390×844 in Chromium by measuring the
  rendered header: the control sits fully inside the card at 44×44 pixels.

  **What changed:** each of the six actions is now described once in
  `src/components/playoffs/admin/BracketAdminToolbar.tsx` and rendered twice —
  the same button row above the medium breakpoint, and one overflow menu below
  it. Describing them once is the point: the menu cannot drift out of step with
  the buttons, and a test pins that. Above the breakpoint nothing changes; the
  `hidden md:flex` moved from the six buttons to their wrapper.

  **The header needed changing too, and not cosmetically.** The title block in
  `BracketDetail.tsx` had no `min-w-0`, so it refused to shrink and pushed the
  new menu button ten pixels past the card's right edge, where the card's
  `overflow-hidden` clipped it — measured before the fix. The control would
  have been unreachable again, for a new reason. `min-w-0` and `gap-2` on the
  header row fix it; both are no-ops at the medium breakpoint and above.

  **Also fixed: the seeding drag handle.** Update Seeding opens a
  drag-and-drop list whose handle was a sixteen-pixel icon in four pixels of
  padding — a twenty-four-pixel target, against this repo's own forty-four-pixel
  standard in `src/components/ui/button-variants.ts`. That did not matter while
  the control was desktop-only. It does now. The dragging itself already worked
  by touch: both drag surfaces set `touch-action: none` through Tailwind's
  `touch-none` class.

  **Deliberately not done: a mobile-width end-to-end test.** It is the only
  check that could prove the breakpoint behaviour, because jsdom applies no CSS
  — which is why this bug sat behind a green suite. `e2e/playoff-bracket.spec.ts`
  answers every REST call with `[]`, so no bracket renders and real fixtures
  would be needed first. The added unit tests cover the menu's behaviour and its
  conditions; the width behaviour was checked by measurement instead.

  *Corrected on review.* **The cited file is wrong.** The controls left
  `BracketDetail.tsx` in commit `3b0249d`; all six `hidden md:flex` classes were
  in `src/components/playoffs/admin/BracketAdminToolbar.tsx`. Everything else in
  the entry is exactly right.

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

### B-40: Deleting or archiving a live-scored match fails on a foreign key

- **Where the user meets it:** an admin pressing the bin on a row in the Scores
  tool, or archiving a season that used live scoring.
- **What happens / what was expected:** the delete fails. `games.match_id` was
  created as a plain foreign key with **no delete rule**, so it defaults to NO
  ACTION, and nothing in the app or in any database function ever deletes a
  `games` row. Both paths that delete a match therefore raise `23503` on any
  match that was ever scored live. Expected: the bin deletes the match, and a
  season can be archived.
- **Why (from the code):** `supabase/migrations/00000000000000_baseline.sql:449-451`
  creates the constraint with no `ON DELETE`. `delete_match_with_stats_reversal`
  (`20260608142313_...sql:31`) runs a bare
  `DELETE FROM public.matches WHERE id = p_match_id`. `archive_season`
  (`20260408173631_...sql`, STEP 5) and `partial_archive_season` copy a season's
  finished matches into `matches_archive` and then delete them from `matches`;
  one live-scored finished match is enough to roll the whole RPC back, so the
  season cannot be archived at all. `match_rounds` already cascades on both
  `match_id` and `game_id`, and `game_players` cascades on `game_id`, so `games`
  was the only link in the chain blocking the delete.
- **Severity:** `high`. Two admin operations fail outright, one of them the
  season rollover.
- **Decision needed:** `fix`.
- **Raised by:** nobody. **This was never filed.** It was found while checking
  [B-20](#b-20-archived-seasons-are-editable-through-live-corrections) — it is
  the reason an archived season holds only unfinished matches, which is what
  narrowed that entry.
- **Status:** **fixed.** A migration re-creates `games_match_id_fkey` with
  `ON DELETE CASCADE`, matching `match_rounds`. No data is changed and no other
  constraint is touched. Neither archive RPC nor the delete RPC needed a change.

  **What this deletes, now that it works.** Deleting a match takes its games,
  its rounds and its game-players with it. That is already what "delete this
  match" means to the admin pressing the bin, and what archiving already does to
  the match row itself — only a match-level summary is kept, in `matches_archive`.
  No per-round history the app can still show is lost: `v_player_match_stats` and
  `v_player_season_stats` are built by joining `public.matches`, which archiving
  empties for that season, so an archived season's round-level player statistics
  are already unreachable. There is no `games_archive` and no
  `match_rounds_archive`; preserving raw rounds past an archive would be a
  separate piece of work with no reader for it today.

  **Read from the migrations, not observed against the live database.** The
  Supabase project could not be queried from where this was checked. The
  migration is idempotent and a no-op if the cascade is already present, so it is
  safe either way — but it is worth confirming that the constraint really had no
  delete rule, and worth knowing whether any season rollover has failed for this
  reason. `supabase/tests/games_cascade_on_match_delete.sql` pins all three
  halves: the constraint's delete rule, the Scores bin on a live-scored match,
  and archiving a season that holds one.

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
- **Decision needed:** `fix`. **Done.** `sortRankings` now carries a case for
  `gamesWon`, `gameWinPercentage` and `streak`. A streak parses to a signed run
  length, so `W10` > `W2` > `L1` > `L9`, and a team with no completed match
  sorts last in both directions instead of landing between `W1` and `L1`. The
  sort field is typed as `RankingSortField` rather than a bare `string`, which
  is what stops this recurring: a heading can no longer be wired to a column the
  sorter has no case for. The dead write to browser storage is removed.
- **Worse than the entry said:** the fallback skipped more than the column. Both
  the nulls-last rule and the tiebreaker chain were gated on
  `sortField === 'powerScore'`, so on the four broken columns a team with **no**
  power score sorted as zero rather than last. Nulls-last now applies to every
  column.
- **Corrected on review:** the entry counts four broken columns; three of them
  were. `#` has no field to sort by at all — the number in it is the row's
  position under the current sort — so it was not a missing case but a heading
  that should never have been wired up. It is no longer a control, which is what
  the career rankings table has always done. Because the default sort is already
  power score descending, pressing `#` also *looked* like it worked: the first
  press reproduced the default order and the second reversed it. Games, Game %
  and Streak were the three that visibly did nothing.
- **Keyboard:** both rankings tables put the click handler on a bare `<th>`, so
  neither could be sorted from a keyboard. Each heading is now a real button
  inside the cell, following `SortButton` in `HeadToHeadRecords.tsx`, which
  already did it that way. The cell keeps `scope` and `aria-sort`; the career
  table gains `aria-sort`, which it never had. The career table was not part of
  this entry — it is the same fault, fixed alongside.
- **Status:** confirmed by test. Seven sorting cases in
  `src/utils/rankingUtils/__tests__/index.test.ts` and four keyboard cases in
  `DivisionRankingsSection.test.tsx`; the sorting cases were shown red against
  the old fallback first.
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
- **Decision needed:** `fix`. **Done.** The database function now mirrors
  `calculateCareerPowerScore.ts`: squared title bonuses, a cap scaled by
  division strength, live weights from the `divisions` table, the 0.85 default,
  the playoff rate weighted by the divisions the runs happened in, a competitive
  threshold of 0.89, and `career_power_score` falling back to `power_score`.
  Migration `supabase/migrations/20260901120000_career_power_score_match_app.sql`.
- **Corrected on review — the entry names a dead file.**
  `20260225200000_fix-badge-logic.sql` was replaced twice by `CREATE OR REPLACE`
  on the same signature and has not been the live definition since 2026-03-10.
  Its `award_kingslayer_badge()` is not called at all any more: the live path is
  `process_all_match_badges()` → `recompute_kingslayer_badge()`
  (`20260828153652_c60c4889-…sql:3`). The live body was
  `20260310140000_fix_career_power_score_double_count.sql`. The drift the entry
  describes is real; it just lived in a different file, and it was a **two-way**
  split between the app and the database at runtime, not four-way.
- **Corrected on review — the proposed fix had no target.** "Have the badge read
  the stored career power score" is not actionable: **nothing stores a career
  power score.** The `career_power_score` column on `team_season_stats` and
  `v_team_details` holds a *per-season* floored score, which is an input to the
  career total, not the total. There is no materialised view and no career
  totals table; both sides compute it on demand. Badges must run in SQL inside
  the result transaction, and the app computes the whole league in one batch
  rather than one RPC per team, so both implementations have to stay.
- **What was actually wrong, and by how much:** nine differences, of which the
  two newest mattered most. The plain/floored split landed in `20260818194322`,
  five months after the SQL was last touched, so the badge read the *standings*
  score where the app reads the *career* score. On the parity fixture the two
  formulas differ by **41 points**. The badge threshold is 25.
- **Stopping the next drift:** the season formula already has this — fixture
  values asserted on both sides (`weights.test.ts` ↔
  `power_score_weight_sandbox.sql`). The career formula now does too:
  `supabase/tests/career_power_score_parity.sql` and
  `calculateCareerPowerScore.test.ts` assert the same three fixtures with the
  same expected totals, and each names the other.
- **Existing badges:** the migration re-checks King Slayer for every team in the
  active season, so badges do not stay as the old formula left them until each
  team next plays. Same shape as `20260828160000_backfill_kingslayer_badges.sql`.
- **Status:** confirmed by test at both levels, against a full replay of every
  migration into Postgres. The parity test was shown red against the old formula
  (94.90 where the app gives 53.43). `supabase/tests/match_badge_processing.sql`
  now seeds `career_power_score` and `power_score` far apart, so reading the
  wrong column fails the King Slayer case; that too was shown red first. All 27
  SQL smoke tests pass on a fresh database.
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
  **Done — computed.** Both figures were already available and simply not used:
  the rankings query fetches every match in the league, under the same React
  Query key, so grouping that list by team once yields a real sweep rate and a
  real game-3 record for every team at no extra request, through the existing
  `calculateSweepRate` and `calculateClutchRecord` helpers. Both estimate
  formulas are deleted.
- **Corrected on review — the entry points at the wrong screen.** The hardcoded
  50 is in `useAllTeamReportCards.ts`, which feeds the **GPA leaderboard**, not
  the six grade cards. The cards computed the viewed team's real clutch record
  and fell back to 50 only when it had no game 3. So the constant never appeared
  as a grade — but it carried 1 of 9.5 GPA weight for every team, which moved
  the leaderboard's **order**. On that leaderboard no team got a real sweep rate
  either, and because the estimate was a monotone transform of game win
  percentage, its Offense grade was a restatement of its Games grade.
- **Worse than the entry said — Clutch was never a percentile, in either mode.**
  The raw game-3 win rate was written into a field named `percentile` and
  rendered as "60th". A team 3–2 in game 3s was labelled 60th and graded C+
  whatever the rest of the league did. The real split was four percentile
  grades, one contaminated percentile, and one absolute stat wearing a
  percentile's label. Clutch is now ranked against the league like the other
  five, so the "Nth" label is true.
- **A consequence neither the entry nor the document noticed:** the GPA on a
  team's card and the GPA on its own row in *View All GPAs* — shown one button
  apart — came from different maths and disagreed for the same team. They now
  agree, and a test asserts it.
- **Unavailable rather than neutral:** a team that has never played a deciding
  third game has no clutch rate. Its Clutch card shows a dash in muted text and
  the grade is left out of the GPA — neither helping nor hurting — instead of
  being counted as a fail or a neutral C. This is the rule
  `src/utils/liveScoring/pprCalc.ts` already follows for points per round
  ("never fake a 0.0 PPR"), which is the precedent the entry asked for.
- **Found by reviewing the fix:** two more things were wrong on the same screen,
  and one of them the fix made worse. A team with **no rating** — Power reads
  "—" — was graded as a zero, which both handed it six grades it had not earned
  and, because the grades are percentiles, padded the population every other
  team is ranked against, so everyone else's grade read better than it was. It
  now gets no card and is left out of every comparison. And a **failed** fetch
  of the league match list was treated as an empty one, so every team read as
  0% sweeps with no clutch record and the card showed Offense F and Clutch "–"
  for the whole league as though it had loaded; that path did not exist before
  the fix, because the card used to read one team's matches and the leaderboard
  read none. Both screens now show a failure message with a Try Again button.
- **Status:** confirmed by test. `useTeamReportCard.test.ts` was rewritten to
  use real match fixtures and real percentile maths rather than asserting mock
  call order — the old file pinned both defects as intended behaviour
  (`expect(offenseCall[1]).toEqual([55, 52])` and two `clutch.percentile === 50`
  cases). `useAllTeamReportCards.test.ts` is new; that hook had no test at all,
  which is why the hardcoded grade was never caught. Three of its cases were
  shown red against the old behaviour first, and sixteen more for the two
  follow-up faults above. One test written with the original fix had itself
  pinned the defect — "counts a missing power score as 0 for the ranking maths"
  — the same fault this entry criticises in the tests that preceded it.
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

### B-42: A player waiting for team approval cannot post on the message board at all

- **Where the user meets it:** anybody whose request to join a team is still in
  the admin queue, on `/message-board`.
- **What happens / what was expected:** the composer takes the message, the send
  fails, and one red toast says "Your message could not be posted. Please try
  again." Nothing names approval. Retrying can never work, because every retry
  sends the same unapproved team. Expected: a signed-in player can post.
- **Why (from the code):** `src/hooks/message-board/useMessageApi.ts` stamped
  `team_id` from the membership row without reading `is_approved`, and a request
  waiting for approval is a real row. The database guard
  `enforce_message_identity` (`20260722120157`) refuses any message whose
  `team_id` has no **approved** membership behind it, and accepts a message with
  no team from any signed-in user. The browser therefore sent the one value the
  league was certain to refuse. That guard raises without
  `USING HINT = 'user-visible'`, which is why the reason never reached the
  toast — see B-12.
- **Severity:** `medium`. One feature is unusable, with nothing on the screen it
  happens on to explain it or work around it, for as long as the request sits in
  the queue. Nothing pushes a new request to an admin, so that is however long it
  takes an admin to look at the queue.
- **Decision needed:** `fix`.
- **Raised by:** [`message-board/post-and-reply.md`](message-board/post-and-reply.md#edge-cases).
- **Status:** **fixed.** The team is stamped only when the membership is
  approved. A request still waiting sends no team, which the league accepts, so
  the message is posted under the author's name with no team badge. Three tests
  in `src/hooks/message-board/__tests__/useMessageApi.test.ts` pin the three
  states — approved, waiting, and no team at all — and the waiting one was shown
  red against the old code first.

  The choice was between posting with no badge and switching the composer off
  with a "waiting for approval" message. Posting with no badge was taken: the
  league already accepts a message with no team from any signed-in user, and a
  new player waiting to be let into a team is among the likeliest to have
  something to ask.

  Nothing else changed. `activeMembership` still keeps a waiting request, which
  is what the join screen and `/my-team` need to show it; only the message
  board's own stamp reads `is_approved`. The generic toast on every other failed
  post is B-12.

### B-46: A failed division-weights read empties the career rankings silently

- **Where the user meets it:** anyone on the team report card, the GPA
  leaderboard, the league percentile table, the match prediction, or the career
  rankings table, while the `divisions` read is failing.
- **What happens / what was expected:** every screen reads as though the league
  has no teams at all — no grades, no rankings, no error and no **Try Again**.
  Expected: a read that failed is reported as a failure.
- **Reproduce:** 1. Make the `divisions` table read fail. 2. Load
  `/teams/:id` (report card) or the career rankings on a cold cache.
- **Why (from the code):** `computeAllTeamsTotals` wrapped each team's
  computation in a `try/catch` that logged the error and dropped that team from
  the returned Map. `useCareerRankings` treats a missing entry as "no data for
  this team" and skips it, so the query function still returned — successfully —
  a shorter list. With the division-weights read failing, the list is not
  shorter but **empty**: `calculateCareerPowerScore` awaits
  `fetchDivisionWeightsByName()` on every team even in batch mode, and that
  fetch is memoised behind one shared promise, so a single failure rejects for
  every team at once. React Query recorded the request as a success with
  `error: null`.
- **Severity:** `medium`. Nothing is corrupted and it clears when the read
  recovers, but the whole league's statistics read as absent rather than
  unavailable, and two of the five consumers do not read `error` at all.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **fixed.** `computeAllTeamsTotals` now counts what it attempted:
  if it attempted at least one team and computed none, it re-throws instead of
  returning an empty Map. A single team failing among others still drops just
  that team — it has data the rest do not, and one bad row is not an outage.

  This is the same rule as B-36's follow-up, one layer down: *a failed fetch is
  not an empty one.* B-36 closed it for the prerequisite team and match lists;
  the compute layer underneath was never covered and re-created the same shape.
  The report card and the GPA leaderboard already have a failure message with a
  **Try Again** button wired to this error, so both start working with no change
  of their own.

  Five tests, one of which fails against the unfixed code with "promise resolved
  Map{} instead of rejecting". The other four hold the line the other way: a
  single failing team, no teams asked for, and a bulk fetch that returned
  nothing must all still resolve.

  *Left alone at the time:* `useCareerRankingsWithHidden` was a near-copy of
  `useCareerRankings` carrying the same skip. The throw above fixed its compute
  failure too, but it still lacked the prerequisite-error fold that
  `useCareerRankings` gained in B-36. **Now closed — see
  [B-49](#b-49-a-failed-team-list-empties-the-career-rankings-table), which
  removed the copy rather than porting the fold into it.**

### B-49: A failed team list empties the career rankings table

- **Where the user meets it:** the career rankings table on the stats page,
  whenever the team list behind it fails to load.
- **What happens / what was expected:** the section reads as a league that has
  never played — and, if opened while the team list is still loading, says so
  before anything has had a chance to fail. Expected: a failure is reported as
  a failure, with a way to try again.
- **Reproduce:** 1. Make the team list request fail. 2. Open `/stats` and expand
  *Career Statistics*.
- **Why (from the code):** the section read `useCareerRankingsWithHidden`, a
  near-copy of `useCareerRankings` that never received the fold added in B-36.
  The rankings query stays disabled until the team list arrives, so it cannot
  report the team fetch's own failure: `error` stayed null and `data` stayed
  undefined, which the section rendered as "No career statistics available."
  This is the same rule as B-36 and B-46 — *a failed fetch is not an empty one*
  — one file over.
- **A second fault on the same line:** the copy returned the bare rankings
  `isLoading`. A disabled query is pending but not fetching, so that flag was
  `false` for the whole time the team list was in flight. Expanding the section
  during that window showed the empty-state message rather than the spinner.
- **Severity:** `medium`. Nothing is corrupted and it clears when the read
  recovers, but the whole league's career table reads as absent rather than
  unavailable, with no way to retry.
- **Decision needed:** `fix`.
- **Raised by:** left open in B-46, above.
- **Status:** **fixed**, by deleting the copy rather than porting the fold.

  The two hooks differed by a single optional field, `divisionName`, read only
  by the CSV export — and they used **different cache keys**, so they were two
  entries running `computeAllTeamsTotals` (~9 batched queries) over the same,
  already-deduped team list. Porting the fold would have left that, plus two
  copies of a forty-line fold to keep in step. The field moved onto
  `useCareerRankings`, the copy is gone, and the section now calls
  `useCareerRankings({ includeHidden: true })` — which is the key the report
  card and the GPA leaderboard already use, so the change **collapses** a cache
  entry rather than adding one. Both invalidation sites match by prefix, so
  neither needed touching.

  Checked before relying on it: `includeHidden` only filters which teams come
  back, and `divisionname` is selected by every team query, so the CSV cannot
  start emitting blank divisions.

  The error is now rendered with the same `ErrorDisplay` card and **Try again**
  that the report card and the GPA leaderboard already use for this failure, so
  the three screens behave alike. That also replaces a raw database message on
  screen with copy meant for a reader.

  Five tests on the section, which had none; four fail against the unfixed
  code. The obvious test would have been the wrong one: mocking the rankings
  hook proves nothing, because before the change the section imported a
  *different* hook, so the mock would not apply and the test would fail merely
  because an import line moved. They mock the team query one level down instead,
  against a real query client, so the same setup drives the old code and the
  new. A sixth test, in the hook's own suite, pins the rankings query key so a
  later tidy-up cannot collide the public and hidden-inclusive entries again.

  *One guard covers a risk this change created rather than fixed.* Moving
  `divisionName` onto the shared hook puts it in front of four consumers that
  never read it, where it looks removable — and the CSV export declares it
  optional, so dropping it would empty the Division column with no type error
  and nothing failing. The fifth section test walks that whole path, hook to
  downloaded file. It was checked by deleting the field: typecheck still passes
  and only that test fails, with `expected '' to be 'Premier'`. Two smaller
  tests cover the export helper itself, which had none.

### B-48: A won game can be ended on a round that is still on its way

- **Where the user meets it:** a scorer at a venue with a patchy signal, ending
  a game the last round just won.
- **What happens / what was expected:** the totals on the banner fold in every
  optimistic round, including ones not yet filed. Ending the game writes them as
  the final score and the winner. If the round behind them is then refused, the
  `games` row disagrees with the rounds that actually exist — and finalising the
  match counts wins from `games` alone, so a wrong result can reach the
  standings and the badges.
- **Reproduce:** 1. File the winning round with no signal, so it parks. 2. Let
  the signal come back. 3. Press *End Game* while the parked round is resuming.
- **Severity:** `medium`. Narrow to reach, but what it writes is not
  recoverable from the app.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **the reported defect was already fixed; two real holes beside it
  were not, and now are.**

  *The report as filed no longer applies.* It quotes a `LiveMatchView.tsx`
  render block whose only guard was `confirmGameComplete.isPending`. That code
  moved into `ActiveGamePanel.tsx`, which already computes a blocked reason from
  the round-save state, disables the trigger on it, refuses again in the confirm
  handler, and has a test for it. Nothing there needed changing.

  **What was still wrong, 1: the gate missed a save that was not the latest
  one.** It read `submitRound.isPending`, which reports only the most recent
  save, alongside a count of rounds **parked** for a missing signal. A round
  parked offline and now *sending* is in neither, so the button was enabled in
  that gap — which is precisely the sequence the existing test's own comment
  describes ("reconnecting flips the signal back on … while the round it held is
  still on its way"). That test passed only because its mock made the resuming
  round the latest one. `useUnsettledRoundCount` now counts every unsettled save
  in the mutation cache, which is what the round log already did.

  **What was still wrong, 2: confirming in an open dialog could do nothing,
  silently.** The dialog has no `open` prop, so it stays mounted and clickable
  across a change in the blocked reason — the signal drops, or a save starts,
  after it was opened. Radix closes the dialog on its action whatever the
  handler does, so the caller's re-check turned the press into a silent no-op:
  the dialog vanished, nothing was written, and nothing was said. The scorer had
  every reason to believe the game had ended. The action is now disabled on the
  same reason, with that reason shown inside the dialog.

  Three tests, two of which fail against the unfixed code. The first seeds the
  mutation cache directly rather than flipping the mocked `isPending` — that
  flag is the very signal that was insufficient, and it cannot express a save
  that is not the component's most recent one. The third is the guard the other
  way: with nothing in flight the game still ends, with the right totals.

### B-43: Three links in a message are counted as six and refused as spam

- **Where the user meets it:** anyone writing to the league through `/contact`
  or the support form whose message quotes three or more ordinary web links.
- **What happens / what was expected:** the message is refused with the generic
  "please try again" toast and never reaches the league. Expected, per
  [`help/contact-the-league.md`](help/contact-the-league.md): only **more than
  five links** is refused as spam.
- **Reproduce:** 1. Open `/contact`. 2. Write a message quoting three links that
  each begin `https://www.` — a video, an event page, a map. 3. Send.
- **Why (from the code):** `countUrls` matched
  `/https?:\/\/|www\./gi` — an alternation between the two ways a link can
  start. Inside a single `https://www.example.com` both alternatives match, once
  for the scheme and again for the host prefix, so each such link scored **two**.
  Three scored six and tripped `> 5`. The check runs before the ticket is stored
  and before any email is sent, so nothing is kept and nothing is delivered. The
  sender cannot tell a spam refusal from a transient one — the app collapses
  every failure into one sentence advising a retry — and retrying identical text
  can never succeed.
- **Severity:** `medium`. No data is corrupted, but a legitimate report is lost
  with no way for either side to find out.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **fixed.** The pattern now counts where each link *starts*
  (`/https?:\/\/(?:www\.)?|www\./gi`), with a `www.` directly after a scheme
  belonging to that scheme rather than opening a link of its own. A link with no
  scheme still counts: a suggested fix of `/https?:\/\/(?:www\.)?\S+/gi` was
  rejected because it stops counting bare `www.example.com` links **at all**,
  which would let six of them past the limit — the opposite mistake. Counts
  checked at every boundary: three scheme-plus-`www.` links now score 3 (was 6),
  six still score 6 and are still refused, and six bare `www.` links still
  score 6.

  *Corrected in review.* The first version of this fix consumed the rest of each
  link with `\S+`, and that was worse than the bug it fixed. A greedy tail runs
  straight through the punctuation between two links, so
  `https://a.test,https://b.test` read as **one** link and a sender could have
  put any number of them past the limit simply by leaving out the spaces —
  where the original, over-counting pattern would at least have refused them.
  Raised by the Codex reviewer on the pull request. Counting only the opening of
  each link cannot run them together, and six links joined by commas now score 6
  in all three forms. Two tests cover it, and both fail against the first
  version.

  *The same bug was in two functions.* `send-support-email` and
  `submit-contact-request` each carried their own byte-identical copy. The
  duplication is what let one bug be two, so `countUrls` and the limit now live
  in `supabase/functions/_shared/spam.ts` and both functions import them. This
  goes further than B-15, where the same copy-per-function drift was found in
  the CORS lists and the league chose the smaller change; here the shared file
  is the fix rather than an extra, because the defect was in the duplicated
  logic itself.

  Nothing tested `countUrls` before — `grep` found the two definitions, the two
  call sites and no test. There are now five unit tests on the shared helper and
  two end-to-end cases on the support function, one for three links passing and
  one for six still being refused.

---

## Low

### B-26: Session replay records one visit in ten with no notice

- Roughly 10% of all visits, and 100% of visits in which an error occurs, are
  recorded as screen replays by the error-monitoring service
  (`src/utils/sentry.ts:59-60`, added lazily at `:211`). Nothing in the product
  mentions it and there is no opt-out.
- **Severity:** `low` as a defect; it works as configured.
- **Decision needed:** `product call`. Decide whether it needs a privacy note.
- **Raised by:** [`cross-cutting/what-the-league-sees.md`](cross-cutting/what-the-league-sees.md#open-questions-and-verification).
- **Status:** **documented, 2026-09-01.** The league was offered four options —
  add a privacy note, switch replay off, record only on error, or leave it — and
  chose to leave it and document the decision. No code changed. The behaviour is
  described in
  [`cross-cutting/what-the-league-sees.md`](cross-cutting/what-the-league-sees.md),
  which now records it as a decision rather than an open question.

  *Corrected on review.* The entry cited `sentry.ts:69-70`. The two sample rates
  are at lines 59-60. The claim itself is exactly right, and the lazily added
  recorder really is at line 211.

### B-27: Several actions raise two success toasts

- Team creation (`src/hooks/useTeamMutations.ts:26` and
  `src/components/admin/teams/TeamManagementTab.tsx`), batch match creation
  (`useBatchMatchForm.ts` and `BatchMatchFormContainer.tsx`), and sign-up
  (`useAuthMethods.ts` and `useAuthForm.ts`) each raise two. The sign-up pair
  also disagree with each other: one says "confirm", the other "verify", and the
  one that fires only when a session came back tells an already-signed-in user to
  check their email.
- **Severity:** `low`. A symptom of [B-13](#b-13-only-one-toast-is-shown-at-a-time-so-paired-messages-are-lost);
  listed separately because the fix is to remove the duplicate, not to raise the
  toast limit.
- **Decision needed:** `fix`.
- **Raised by:** [`getting-started/sign-in-and-sign-up.md`](getting-started/sign-in-and-sign-up.md#open-questions-and-verification),
  [`admin/manage-teams-and-divisions.md`](admin/manage-teams-and-divisions.md#open-questions-and-verification),
  [`admin/build-the-schedule.md`](admin/build-the-schedule.md#open-questions-and-verification).
- **Status:** **fixed.** In each pair the *inner* toast survives — the one closest
  to the write, which is also the one that knows what was written. The team tab
  and the batch container dropped their copies; `useAuthForm` dropped its copy of
  the sign-up message. Three tests now pin one toast per action, and the batch
  test asserts the surviving toast is the one that names the date.

  **The sign-up wording was the real defect, and removing a toast did not fix
  it.** The surviving toast said "Please check your email to confirm your
  account" unconditionally. A session comes back from `signUpWithEmail` only when
  the league does *not* require email confirmation — precisely when the user is
  signed in already and has no email to check. It now reads the session: "You are
  signed in." when there is one, the confirmation sentence when there is not.

  *Corrected on review.* **The title was wrong by the time it was read.** "the
  second destroys the first" was true when `TOAST_LIMIT` was 1. B-13 raised it to
  3, so both toasts were showing, stacked — the same message twice rather than
  one message lost. The entry is retitled. The duplicate was still a defect, and
  the fix is unchanged: remove it.

  Two other things in the entry are slightly off and neither changes the finding.
  Three of the six file references had drifted (`TeamManagementTab.tsx` is under
  `admin/teams/`, and two line numbers had moved). And the second sign-up toast
  is not raised unconditionally: it was already inside `if (response.session)`,
  which is why it only ever appeared to a user who was signed in — the worst
  possible audience for "check your email".

  *The sweep missed one.* It covered the *success* pairs and left the **failure**
  path in the same file: `handleNativeGoogleSignIn` still raised a second toast
  over the one `signInWithGoogleNative` had already raised. Only the Capacitor
  build can reach it, which is why no web test caught it. Fixed separately as
  [B-49](#b-49-a-failed-native-google-login-raises-two-red-toasts).

### B-28: Message timestamps show a clock time with no date

- A message posted three weeks ago reads "3:42 PM" (`src/components/home/utils.ts:16`,
  used by `src/components/message-board/MessageItem.tsx:37`). On a board that is
  never cleared, this makes an old conversation look current.
- **Severity:** `low`. **Decision needed:** `fix`.
- **Raised by:** [`message-board/read-the-board.md`](message-board/read-the-board.md#open-questions-and-verification).
- **Status:** **fixed.** `MessageItem` now uses the existing
  `formatNotificationDate` utility, which the notification list and the contact
  inbox already use. The header shows how long ago the message was posted —
  "3 weeks ago" — inside a `<time>` element carrying the machine-readable
  timestamp, with the full date and time as both the hover title and the
  accessible name.

  **`formatTime` itself was deliberately left alone.** `PendingScoresCard` and
  `ScoreSubmissionModal` also import it, and a bare clock time is correct in both
  — each sits beside a date. Changing the shared helper would have fixed one
  screen and broken two.

  **Still not fixed:** there is no day separator anywhere in the list. That was
  the second half of the report and is a larger piece of work; the feature
  document still records it.

### B-29: Results are distinguished by colour alone in two places

- The winner on a completed match card is marked only by emerald text
  (`src/components/schedule/MatchCard.tsx:97-114`), and the profile page's
  name-availability tick and warning are unlabelled icons
  (`src/components/profile/ProfileForm.tsx:142`).
- **Severity:** `low`. **Decision needed:** `fix`. Add a word or a label.
- **Raised by:** [`schedule/a-match-card.md`](schedule/a-match-card.md#open-questions-and-verification),
  [`getting-started/set-up-your-profile.md`](getting-started/set-up-your-profile.md#open-questions-and-verification),
  [`cross-cutting/accessibility.md`](cross-cutting/accessibility.md#open-questions-and-verification).
- **Status:** **fixed.** The winning team's name on a completed card carries a
  small **"Won"** tag, styled like the existing "Final" badge beside it. The
  colour is kept: the tag is added to it, not swapped for it. A test pins that
  exactly one side of a completed card carries the tag, that it sits beside the
  winning name, and that an unfinished match carries none.

  On the profile page the tick and the warning are now `aria-hidden`, and a line
  of text under the field carries the answer instead — "Name is available" or
  "Name is already taken" — in a `role="status"` region, so it is announced as it
  changes rather than being a silent icon. `ProfileForm` had no test file at all;
  it has one now, covering both answers and the case where the name is too short
  to check.

### B-30: Small copy and labelling slips

- "Top 10 Teams" heading over a grid of four (`src/components/home/TopTeams.tsx`).
- The mobile "My Teams" button links to the whole-league list
  (`src/components/home/HeroSection.tsx:104`).
- An empty state offering to adjust "your date range or team selection" on a
  screen with no team filter (`MatchesTable.tsx:79`).
- An empty state offering filters and a search that the page does not have
  (`src/components/teams/TeamList.tsx`), whose button also calls
  `window.location.reload()`.
- A history empty state linking to `/rules`, which is not a route, through a raw
  anchor that reloads the whole app into Page Not Found
  (`src/components/history/HistoryPageContent.tsx:64`).
- The help page describing team-page "tabs" that are collapsible sections
  (`src/components/help/sections/TeamsSection.tsx:12-21`).
- The delete-match confirmation not mentioning that statistics are reversed
  (`src/components/schedule/DeleteMatchDialog.tsx:34`).
- A batch date picker allowing Thursdays only, beside text saying "or another
  date for special events" (`ThursdayDatePicker.tsx:18`, caption in
  `DateSelectionSection.tsx:23`).
- `/oauth/consent` missing from the route-name map, so it is announced as "Page
  Not Found page" (`src/utils/routeName.ts`).
- **Severity:** `low`. **Decision needed:** `fix`.
- **Raised by:** eleven documents.
- **Status:** **fixed, all nine.** Each was a case of the screen saying something
  it does not do.

  | Was | Is |
  | --- | --- |
  | "Top 10 Teams" over four cards | "Top Teams" — four on a wide screen, ten in the phone carousel |
  | "My Teams" going to `/teams` | "Teams", route unchanged |
  | "your date range or team selection" | "the date or the bracket", the two filters that exist |
  | "adjusting your search or add a new team" | "An admin adds teams from the admin dashboard", and no button |
  | "Learn how seasons work" → `/rules` | → `/help`, through the router |
  | "Stats Tab", "Matches Tab", … | "Stats", "Matches", … under "Open a section to read it" |
  | delete says only "from the schedule" | adds "The standings, team records and statistics it counted towards are reversed with it." |
  | "or another date for special events" | "Select a Thursday. League play runs on Thursdays, so other days cannot be chosen here." |
  | `/oauth/consent` announced as Page Not Found | announced as "Authorize App" |

  **Two of the nine needed more than a string change.** The team-list button did
  not just say the wrong thing, it called `window.location.reload()` — a full
  browser load of the same page, landing back on the same empty state with the
  cache discarded. It is gone; nothing replaced it, because there is nothing for
  it to do. And the history link was a raw `<a href>`, so even a correct address
  would have reloaded the whole app. `EmptyState` now routes an in-app address
  through the router and keeps the raw anchor only for an external one.

  **The route-name slip is now pinned by a test rather than a string.** Fixing
  `/oauth/consent` alone would leave the next route added just as silent, so a
  test reads `App.tsx`, collects every declared path, and fails if any of them
  falls through to "Page Not Found". It found one more immediately —
  `/playoffs/e2e-bracket-proof` — which is excluded by name and a comment,
  because it renders only under `import.meta.env.DEV` and no league member can
  reach it.

  *Corrected on review.* Four of the nine line references had drifted (the
  "Top 10 Teams" heading is at `TopTeams.tsx:92`, not `:139`, which is the grid of
  four; the team-list description is at `:78`; and the batch caption the report
  quotes lives in `DateSelectionSection.tsx`, not in `ThursdayDatePicker.tsx`,
  which only refuses non-Thursdays). Every claim held.

### B-31: Two dead features are visible in the interface

- **Notification expiry.** An expiry date is displayed, timed, and re-checked,
  and the EXPIRED tag is rendered — but nothing in the app can set one
  (`src/services/notifications/NotificationService.ts:13,33` vs
  `NotificationsAdmin.tsx:178,180`).
- **Team confirmation.** The `confirmation_open` season flag is read
  (`src/services/seasons/SeasonQueryService.ts:80`) and written by nothing
  anywhere in `src/`, so the feature it gates can never be switched on.
- Also here: `/admin/notifications` has no link anywhere in the app and must be
  typed (`src/App.tsx:215`), and `useErrorHandler`'s "Network error. Please check
  your connection and try again." had no importer, so that sentence was never
  shown to anyone. That hook and the `handleHookError` behind it have since been
  **deleted** as part of [B-12](#b-12-failure-messages-discard-the-reason-the-server-gave),
  whose sanitiser supersedes them.
- **Severity:** `low`. **Decision needed:** `fix`. Remove them, or finish them.
- **Raised by:** [`admin/send-notifications.md`](admin/send-notifications.md#open-questions-and-verification),
  [`admin/manage-seasons.md`](admin/manage-seasons.md#open-questions-and-verification),
  [`cross-cutting/errors-and-offline.md`](cross-cutting/errors-and-offline.md#open-questions-and-verification).
- **Status:** **fixed — both finished rather than removed.** The league was asked
  which way each should go and chose to finish both.

  **Notification expiry** needed only the field. `CreateNotificationInput` already
  carried `expiresAt`, the service already wrote `expires_at`, and the list
  already rendered the tag and re-armed a timer for it. The form now has an
  optional **"Expires"** `datetime-local` control; editing loads the stored value,
  Cancel clears it, and an empty field means no expiry. Two helpers in
  `src/utils/datetimeLocal.ts` convert between the control's zone-less wall clock
  and the UTC timestamp the column stores, and they are tested on their own.

  **`/admin/notifications` was reachable only by typing it.** The management UI
  moved into `NotificationsTab`, which the page and a new **Notifications** item
  in the admin sidebar both render. The page keeps the contact inbox above it and
  is otherwise unchanged.

  **Team confirmation** needed a writer. `setSeasonConfirmationOpen` is
  deliberately separate from `updateSeason`, so the season form's shape does not
  change, and the switch sits beside the active season's badge. `Season` gained
  `confirmation_open` as an **optional** field, because `fetchHistoricalSeasons`
  and others select a narrower set of columns.

  **Finishing this one made an existing bug reachable, and it was fixed too.**
  The card `confirmation_open` reveals had no sign-in check and listed hidden
  teams — already recorded in `home/the-home-page.md`, and until now unreachable
  because the feature could never be switched on. The first plan was to add the
  toggle and fix that separately; two PR reviewers raised it independently, one
  as a P1, and it was fixed before merge instead. See
  [B-41](#b-41-the-confirm-your-team-card-has-no-sign-in-check-and-lists-hidden-teams).

  **Review also found the expiry only half worked.** The one SELECT policy on
  `admin_notifications` allows a row while `expires_at IS NULL OR expires_at >
  now()`, and it applies to admins as well — so an expired notification vanished
  from the admin list, the EXPIRED tag could never be seen after a refresh, and
  the row could no longer be edited or deleted. Migration
  `20260901190000_admin_can_read_expired_notifications.sql` adds an admin-only
  SELECT. It is **applied by hand** (`docs/OPERATIONS.md` §6); until it is run,
  the list behaves as it did before.

  The feature document was wrong about this before the change and stayed wrong
  after the first correction: it said an expired notification is "still shown in
  the bell", unqualified. The bell reads the same query as the list, so an
  expired row leaves it too — for everyone before the migration, and for
  everyone but an admin after it. Both places now say so. Separately, the expiry timer scheduled one
  timeout and never re-armed, so only the first expiry was ever noticed; it now
  reschedules after every tick and caps the delay.

  *Corrected on review.* Both dead features were exactly as described. Two small
  references had drifted: the route is at `src/App.tsx:215`, not `:213`, and the
  `NotificationsAdmin.tsx` line numbers had moved. Note also that
  `/admin/notifications` *was* already in the route-name map — the missing entry
  in [B-30](#b-30-small-copy-and-labelling-slips) is `/oauth/consent` only.

### B-41: The "Confirm your team" card has no sign-in check and lists hidden teams

- **Where the user meets it:** anyone at all on the home page, while a season is
  open for confirmation.
- **What happens / what was expected:** the card is drawn for a signed-out
  visitor as well as a signed-in player, its team list includes teams in the
  Hidden division, and it will record a participation answer for any of them.
  Expected: signed in, and only for a team the user belongs to.
- **Why (from the code):** `src/components/hero/ParticipationHeroCard.tsx` returns
  early only on a missing season, never on a missing user, and it builds its list
  from every team rather than the user's own.
- **Severity:** `medium`. It writes league data on behalf of a team the writer
  may have nothing to do with. Whether the database refuses the write was not
  checked — hiding a control and refusing a write are two different mechanisms,
  and only the second is a defence.
- **Decision needed:** `fix`. Require a signed-in user, list only teams the user
  belongs to, and confirm what the database does with a refused write.
- **Found while:** finishing [B-31](#b-31-two-dead-features-are-visible-in-the-interface).
  It is not new, but it was unreachable until that change added a control that
  can switch confirmation on.
- **Raised by:** [`home/the-home-page.md`](home/the-home-page.md#open-questions-and-verification),
  which recorded it as an open question before it could be reached. Two PR
  reviewers raised it independently against the B-31 change, one as a P1.
- **Status:** **fixed, in the same change that made it reachable.** The plan had
  been to add the switch now and fix this separately; the review made clear that
  shipping a reachable hole to fix later was the wrong order, and it was fixed
  before merge instead.

  `ParticipationHeroCard` now reads the caller's own approved membership rather
  than every team in the league. That closes both halves at once: a signed-out
  visitor has no membership, so the card is not drawn for them, and a member can
  only answer for the team they belong to — hidden teams included, since a hidden
  team is not theirs.

  **The team picker is gone rather than filtered.** A person has at most one
  membership, so a combobox over a one-item list was a control with nothing to
  choose. The card names the team instead, which is also what "Confirm **your**
  team" says. The search box, the popover and the whole team query went with it.

  **Not addressed here: whether the database refuses the write.** The card no
  longer offers a team that is not the caller's, but hiding a control is not the
  same as refusing a write, and the row-level policy on `season_participation`
  was not read. That is worth checking before the first season is opened.

### B-47: The scorer who reopens a game is sometimes the only one not told

- **Where the user meets it:** the scorer who presses *Reopen game*. Their own
  screen changes and says nothing about why.
- **What happens / what was expected:** the other scorer always sees "Game N
  reopened"; the one who pressed the button sees it sometimes. Expected, and
  what B-17's fix set out to deliver: both screens, once each.
- **Reproduce:** 1. Reopen a game with two devices watching. 2. Watch the
  device that pressed the button. 3. Repeat on a slow connection, where its own
  refresh is more likely to land before the live update.
- **Why (from the code):** the notice is raised by `useLiveMatchRealtime`
  rather than by the mutation, deliberately — every subscriber is told once,
  including whoever acted, which is why the reopen raises no success message of
  its own (a second would have destroyed the first, which is B-27). It tells a
  reopen from a game merely starting by asking the cache whether that game
  *was* completed. But `reopenGame` also refetches the match on settle, and
  that refetch can land before the live change comes back — so the cache
  already reads `in_progress`, the check fails, and the actor gets **no**
  notice at all. Which signal wins is a matter of timing.
- **Severity:** `low`. Nothing is lost or written wrongly, and the bystander
  B-17 was raised to protect is always told. What is missed is the explanation
  for a screen that moved under the person who moved it — which is the whole
  thing B-17 asked for, and the reason the reopen has no message of its own to
  fall back on.
- **Decision needed:** `fix`.
- **Raised by:** reported directly, not by a feature document.
- **Status:** **fixed.** `reopenGame` now leaves a note of the game it is
  reopening before the write, while the old status is still known, and the live
  handler claims that note — so a screen whose refetch won the race still has
  something to go on. The note is claimed **whichever** signal arrives first,
  not only when the cache check fails: taking it either way is what keeps the
  count at one, because there is then nothing left for a later change to fire.
  A reopen that failed drops its note rather than leaving it to be picked up.

  `payload.old.status` would say the previous status outright and settle this
  without a note, but `postgres_changes` only carries the old row with
  `REPLICA IDENTITY FULL` on `games`, which the original fix already recorded
  as the reason for reading the cache instead. That trade was left as it is.

  The notes are kept in a `WeakMap` against the query client, which is the only
  thing `useGameFlow` and `useLiveMatchRealtime` share — they are siblings with
  no props path between them. Per-client rather than module-wide so a second tab
  cannot read the first one's notes; weak so a discarded client is not held
  alive. The query cache was the obvious alternative and was not used: it would
  have made the notice depend on `gcTime` not collecting the entry inside the
  window.

  Five tests, driving the real sequence — mutation, refetch, then the live
  change — rather than seeding the cache by hand, which is why the existing
  suite could not see this. Two fail against the unfixed code with "expected to
  be called 1 times, but got 0 times". The rest hold the count at one: the
  other ordering, a second change to the same game, a reopen that failed, and a
  screen that never reopened anything.

  *Docs corrected with it.* `verification/live-scoring.md` FIX-12 still said "a
  successful reopen is silent" and FIX-23 that it "announces nothing at all" —
  both left behind by B-17's own change, which rewrote only FIX-08.

### B-49: A failed native Google login raises two red toasts

- `signInWithGoogleNative` reports its own failure through `handleAuthError`
  (`src/hooks/auth/utils/authErrorHandler.ts:18`), which raises a destructive
  toast and records the message as `authError`. It then *returns*
  `{ success: false }` rather than throwing, so `handleNativeGoogleSignIn`
  (`src/hooks/useAuthForm.ts`) saw `!success` and raised a second one. Two red
  toasts, same message, two different titles, one press.
- **Severity:** `low`. The login still fails honestly; it is reported twice.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document. Only the Capacitor
  Android/iOS build renders the button that reaches this path — it is gated by
  `isNative` (`src/components/auth/SocialAuthButtons.tsx:48`) and
  `loginWithGoogleNative` refuses off-device — so no web session and no web test
  could ever have seen it.
- **Status:** **fixed.** The outer toast is gone and the inner one survives, the
  same rule [B-27](#b-27-several-actions-raise-two-success-toasts) applied to the
  sibling handlers in this file. The test that asserted the duplicate now asserts
  no toast at all, matching the sign-up convention test beside it.

  **This is B-27's missed tail.** That sweep covered the *success* pairs and the
  sign-up message; this is the same defect on a *failure* path, in a handler
  B-27 edited but did not finish.

### B-50: A failed load of pending matches raises a toast per attempt

- `usePendingScoresMatches` and `usePendingMatches` each raised their failure
  toast inside `queryFn`'s `catch` and then rethrew. `queryFn` is the unit
  react-query retries, and `src/App.tsx` sets `retry: 1`, so one failed load
  raised **two** identical red toasts. `usePendingMatches` held the pattern
  twice — a matches read and a teams read — so a full outage raised four.
- Worse than the duplicate: a first attempt that failed before a retry that
  **succeeded** still raised one. The list was on screen and the user was told
  it had failed.
- **Severity:** `low`. Error path only, but the home page is the landing page and
  `staleTime: 0` plus refetch-on-focus re-raises it on every return to the tab.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** The toast now comes from the QueryCache
  (`src/utils/queryErrorToast.ts`, wired in `App.tsx`), which runs **once per
  query failure after retries are exhausted**. Queries opt in with
  `meta.errorToast`, which supplies the fallback wording only — the server's own
  message still wins through `getUIErrorMessage`.

  **The obvious fix was the wrong one.** A `useEffect` keyed on the query error,
  as `useScoreSubmissions` does, fires once per *mounted consumer* — and
  `usePendingScoresMatches` is mounted three times on the home page, by `Index`,
  `PendingScoresCard` and `ScoreSubmissionModal`. On a background-refetch failure
  that keeps the card on screen it would have raised two or three toasts, no
  better than the bug. The QueryCache is the one place the count cannot multiply.

### B-51: A successful match deletion is announced in red

- `src/hooks/matches/updates/useMatchDelete.ts` raised its **success** toast with
  `variant: 'destructive'`. The toast component has two variants, `default` and
  `destructive`, and `destructive` is the error style
  (`src/components/ui/toast.tsx:28-36`) — so a match that deleted cleanly looked
  exactly like the failure toast four lines below it, and only the words told the
  two apart.
- It was the one success toast in the app using that variant. The same delete in
  `MassScoreEntryTool` already used the default, as does every other
  delete-success toast and every irreversible season action.
- **Severity:** `low`. Cosmetic; the deletion itself was correct.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** The variant is dropped, so the toast falls back to
  `default`. The test asserted the destructive variant on the success path and so
  pinned the bug in place; it now asserts the title and that the success toast is
  *not* destructive. The error-path assertions are unchanged.

  Most likely the original author read "deleting a match is destructive" as
  "use the destructive variant". The two are unrelated: the variant names a
  colour, not a consequence.

### B-52: The delete confirmation closes before the delete has run

- Radix's `AlertDialogAction` is a Close button: it closes on click unless the
  handler calls `preventDefault`. `src/components/schedule/DeleteMatchDialog.tsx`
  passed `onConfirm` straight through, so the dialog began closing the moment
  Delete was pressed. The `isDeleting` spinner, the "Deleting..." label and the
  disabled Cancel the component already carried were dead code — on screen only
  for the ~200 ms exit animation.
- A delete that then failed had no dialog left to retry from, only a red toast.
  `MassScoreEntryTool` compounded it by closing in `finally`, so failure
  dismissed the prompt even once the dialog stopped closing itself.
- Escape and the overlay could also dismiss the dialog mid-delete, although the
  Cancel button beside them was disabled for exactly that reason.
- **Severity:** `low`. The delete is atomic and completes either way; what is
  lost is the progress indicator and the retry.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** `preventDefault` before `onConfirm`, `onOpenChange`
  guarded on `isDeleting`, and `MassScoreEntryTool` closes on success only —
  mirroring `useMatchDelete`, which already did. All three match the house
  pattern in `src/components/ui/ConfirmDialog.tsx` and
  `SeasonActivationDialog.tsx`, whose comment gives this exact reason.

  Both consumers were checked; neither can be left stuck open. Three tests now
  cover behaviour that could not run before: that the dialog stays open on
  confirm, that Escape is ignored while deleting and honoured otherwise, and that
  a failed delete leaves the prompt on screen.

### B-53: My Next Match shows no skeleton on a first load

- `useTeamMembership` exposes two different busy flags: `isLoading`, a plain
  `useState` true only while a join or leave is in flight, and `isFetching`,
  react-query's fetch flag. `src/hooks/useMyNextMatch.ts` read `isLoading`. No
  join or leave has happened on a first load, so it stayed `false` for the whole
  membership fetch, `Index` skipped `<MyNextMatchSkeleton />` and fell through to
  `null`. The area was blank, then the card appeared — the page jumping twice.
- It bites only when the membership query actually fetches: a hard load, a first
  visit, or after its five-minute `staleTime` expires. In-app navigation inside
  that window is served from cache and looks correct.
- **Severity:** `low`. Cosmetic; no data is wrong and nothing is lost.
- **Decision needed:** `fix`.
- **Raised by:** [`home/your-next-match.md`](home/your-next-match.md#open-questions-and-verification),
  which recorded it as an open question ending "may be worth treating as a bug
  rather than documenting". It is now treated as one.
- **Status:** **fixed.** `useMyNextMatch` reads `isFetching`. It was the only one
  of ten consumers with this: `useCanScoreMatch`, `ParticipationHeroCard` and
  `TeamMembershipSection` already used `isFetching` for the fetch.

  All three mocks in the hook's test supplied only `isLoading`, so switching the
  hook would have handed it `undefined`. They now supply both, and the loading
  test sets `isFetching: true` with `isLoading: false` — so it fails if the hook
  ever goes back to the mutation flag. `verification/home-and-teams.md` NEXT-38
  is retagged from "suspected bug" to fixed.


### B-54: The AI caption button failed on every press

- `supabase/functions/generate-recap-caption/index.ts` called the shared
  `checkRateLimit(client, options)` with four loose values instead —
  `('generate-recap-caption', userId, 5, 60)`. The endpoint string landed in the
  `client` slot, so the first thing the limiter did was `client.rpc(...)` on a
  string. That threw, outside the function's `try`, so Deno answered a bare
  **HTTP 500 with no CORS headers**.
- A second fault sat underneath it. `checkRateLimit` answers with an object,
  `{ allowed, error }`, and an object is never falsy — so `if (!accidentGuard)`
  could not be true and both 429 replies were unreachable even once the call
  itself was fixed. Neither the per-minute guard nor the daily spend cap applied.
- Every sibling function — `submit-contact-request`, `submit-score-report`,
  `send-support-email`, `pageview` — passes `(client, { endpoint, ipHash,
  windowSeconds, maxHits })` and branches on `.allowed`. This one was the only
  outlier, and it was wrong from its first commit.
- Nothing caught it. `tsconfig` covers no project under `supabase/`, CI runs
  `deno test` with `--no-check`, and the handler was written inside `serve()`,
  so no test could call it. Run by hand, `deno check` reported both call sites
  as "Expected 2 arguments, but got 4".
- **Severity:** `high`. "Write it for me" and "Write blurbs for me" were dead
  for every admin, for as long as the feature has existed.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** The limiter is called with `auth.ctx.serviceClient` —
  which `requireAdmin` already built and nothing used — one options object, and
  a branch on `.allowed`. An RPC error is logged and still denies, matching the
  fail-closed contract in `rateLimit.ts`. The admin id is hashed before use as
  the bucket key, because `rate_limit_events.ip_hash` only ever holds a digest;
  bucketing is unchanged, since the same admin always hashes to the same value.

  The handler was first lifted into an exported `handleRequest`, the way all
  four siblings already do it, because nothing could test the function
  otherwise. Seven tests now cover it. Two of them run the genuine
  `checkRateLimit` against a stubbed RPC rather than the test seam — a seam
  ignores its arguments, so it would have hidden exactly this bug — and both
  reproduce `TypeError: client.rpc is not a function` against the old code.

### B-55: The message board skipped a run of messages after a live edit

- "Load more" asks for messages older than the last one in the list, so whatever
  sits at the bottom of the list becomes the cursor. A realtime edit for an old
  message the reader had not scrolled to yet was put into the list anyway,
  sorted to the bottom, and became that cursor — so the next page started below
  it and every message between the two was never asked for, and never seen.
  Pressing "Load more" again paged further away from the gap, not back into it.
- Two ways in, not one. `handleMessageUpdated` spliced the edit straight into
  the cached pages; separately the fetch merged the whole realtime buffer into
  page one whenever there was no cursor. The second is the commoner route: the
  query sets `refetchOnMount: 'always'` and leaves `refetchOnWindowFocus` on, so
  page one is refetched on every mount and every time the tab regains focus.
- **Severity:** `medium`. Nothing is written wrongly and nothing is deleted, but
  a contiguous run of real messages is missing from the board for that session
  and there is no sign on screen that anything was skipped.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** Both paths now refuse a message older than the oldest
  one already in the list, while there is still a cursor to protect. Newer ones
  are unaffected, which is the ordinary case of a message edited into view.
  Nothing is lost: the message stays in the realtime buffer, and
  `fetchMessages` applies the category, team and search filters on the server,
  so it comes back with the page that reaches it.

  Deliberately **not** fixed by storing a server cursor per page. That would
  skip the message pushed out by the hundred-message cap instead of re-fetching
  it, which `message-board/read-the-board.md` describes as intended, and it
  would leave the out-of-order message rendering above newer ones, because
  `messages` is a bare `pages.flat()` with no re-sort.

### B-56: Standings flashed "No Teams Available" over a full league

- `useTeamRankings` derives its rankings in a `useEffect` but seeded
  `isLoading` as `useState(false)`, so its first commit claimed to have finished
  before anything had been derived.
- On a warm mount — a return visit inside the five-minute `staleTime` — the
  teams and matches queries answer straight from cache, so neither of those is
  loading either. The hook reported `{ rankings: [], isLoading: false }` for a
  populated league, and `StatsContainer` committed its "No Teams Available"
  panel to the DOM before replacing it with the real table.
- The early-return path for a genuinely empty league never set `isLoading`
  either. That was harmless only because the seed was already `false`.
- `stats/standings-and-rankings.md` says the page is a skeleton until all three
  sources are back, never an empty state on the way there.
- **Severity:** `low`. Cosmetic; no data is wrong and nothing is lost. Same
  shape as [B-53](#b-53-my-next-match-shows-no-skeleton-on-a-first-load).
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** The seed is `true`, and the early return settles to
  `false` so an empty league still resolves. Six other consumers read this flag
  — `useLeagueInsights`, `useTeamReportCard`, `useAllTeamReportCards`,
  `useProjectedSeeds`, `Stats.tsx` and `TeamDetails.tsx` — and all now get a
  brief honest "loading" in place of a wrong "loaded and empty". A test records
  every commit of the hook and fails if any of them is empty-and-not-loading.

  **Cause removed afterwards.** Seeding the flag closed the gap but left it
  there: the rankings were still derived in an effect, so the hook still had a
  commit with the data in and nothing worked out, and still had to claim to be
  loading to cover it. `useTeamRankings` now works them out during render with
  `useMemo`, so the first commit already carries them. The seed is gone, the
  flag is just `teamsLoading || matchesLoading`, and the test asserts the
  stronger property: two rankings on the first commit, and exactly one commit.

  That change also deleted the `rankings.length` effect dependency and the
  `if (rankings.length > 0) setRankings([])` guard, which existed only to break
  an infinite render loop the effect caused by depending on its own output
  (`9cb0c40f`). A memo cannot depend on its own result, so the loop is now
  impossible rather than guarded against.

### B-57: Publishing a recap never refreshed its public page

- `usePublishRecapEdition`, `useUnpublishRecapEdition` and `useSaveRecapVersion`
  all invalidated `['recap-editions']` — plural. Every recap query is registered
  under `['recap-edition']` — singular. React Query compares key elements with
  `===`, so the plural filter matched nothing and all three calls did nothing.
- The home page card was covered anyway, by a second explicit invalidation of
  its exact key. The public per-week page was not, so it kept serving its cache
  for its full `staleTime`.
- It shows on the documented rollback: an admin unpublishes a wrong recap, opens
  `/recap/<season>/week-<n>` to check, and is served their own cached copy of
  the recap they just took down — so the takedown looks as though it failed.
  A fresh fetch correctly returns nothing and the page renders Not Found; the
  defect is the window in between.
- The plural key had matched one query when it was written, an admin list that
  has since been removed. It has matched nothing since.
- **Scope corrected after review.** This entry first said the recap stayed
  readable "for anyone who already had it open", and was rated `medium` on that
  basis. That overstates it, and the same overstatement is in the commit
  message. `invalidateQueries` only ever touches the `QueryClient` in the
  browser that ran the mutation, so this defect, and its fix, reach the admin's
  own session and nothing else. A *viewer* holding the page open is a separate
  and still-open problem, now recorded as
  [B-61](#b-61-an-unpublished-recap-stayed-on-a-viewers-screen-indefinitely).
- **Severity:** `low`. One admin's own session shows a stale page and
  self-corrects. Nothing is written wrongly, and no visitor is affected either
  way.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** One shared singular constant now covers both reads, so
  a single invalidation refreshes the home page card and the per-week page
  together. Alongside the key assertions, a test drives a real query client
  through publish → unpublish and fails if the per-week page is not refetched.

### B-58: A hidden team appeared in half of an old recap

- The two halves of a recap asked "is this team visible?" in two different ways.
  `fetchWeekStandings` read the division stored in the snapshot;
  `fetchPowerScoreTrendsForWeek` reads the team's division today. Both then
  checked it against the same list of non-Hidden divisions.
- Move a team to Hidden after a week has ended, then regenerate that week, and
  the two disagree. The team appears in the standings and the power rankings
  with a rank, a record and a grade, but is absent from the movers and Team of
  the Week, and shows no movement arrow because its delta is null.
- The result is then frozen into the published facts and served verbatim —
  `RecapEdition.tsx` re-checks nothing.
- The divergence was a choice, not a schema limit: `power_score_snapshots`
  carries `division_id`, and `v_team_details` carries it too. Each half simply
  picked a different one, and the two were never combined until the recap
  service put them side by side.
- **Severity:** `medium`. A published, permanent page contradicts itself about
  who is in the league.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** One rule for the whole edition: standings now gate on
  the team's current division too, matching `weeklyTrendsForWeek`. Hidden means
  hidden, everywhere in the recap. The division **name** on each row still comes
  from the snapshot, so an old recap keeps naming the division the team actually
  played in that week.

  The league was asked which way to settle it and chose to hide the team
  everywhere, rather than keep it visible everywhere for historical fidelity.

### B-59: A recap put back up after an unpublish was labelled "Corrected"

- `RecapEditionService.publish` kept the original `first_published_at` and moved
  `published_at` to now on **every** publish. The public page reads "those two
  dates differ" as its proof that a correction happened.
- So the documented rollback — Publish, Unpublish, Publish — printed "Published
  16 October · Corrected 20 October". Nothing had been corrected, and no
  correction note existed to show: the admin screen had correctly judged it a
  plain Publish, because its own test is `status === 'published'` and after an
  unpublish the status is `unpublished`. The two disagreed.
- The state diagram in `admin/weekly-content-pack.md` already said only
  `published → published` is a correction; `drafted`/`unpublished → published`
  is a plain Publish.
- **Severity:** `low`. The content is right; the line above it is not.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** `publish` reads the status as well and applies the same
  rule the admin screen does. A publish over a live edition still keeps its
  original date; a publish from draft or unpublished starts the clock again, so
  both dates match and the page shows one date. The two existing tests supplied
  no status, so both now say which state they are publishing from, and a third
  covers the unpublish-then-republish cycle that nothing had exercised.

### B-60: The blurbs model was saved as the caption's model

- `generateBlurbs` in `useWeeklyContentPack` wrote the blurbs model into
  `captionModel` whenever no caption model was set yet
  (`captionModel: current.captionModel ?? result.model`). On a fresh draft that
  saved a `recap_edition_versions` row reading `caption_source = 'fallback'`
  alongside a non-null `caption_model` — a contradiction, since a fallback
  caption is built from the results and no model wrote it.
- `generateCaption` sets the field unconditionally, which is what makes it the
  caption's field. The asymmetry between the two was the giveaway.
- There is no `blurbsModel` field and no `blurbs_model` column, so the blurbs
  model is simply not recorded anywhere. Adding one was left out of scope.
- **Severity:** `low`. Nothing reads `caption_model` yet, so no screen is wrong.
  The stored rows are.
- **Decision needed:** `fix`.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** `generateBlurbs` leaves `captionModel` alone. A test
  asserts it is still null after blurbs are generated on a fresh draft.


### B-61: An unpublished recap stayed on a viewer's screen indefinitely

- Taking a recap down is a server-side change to one row. Nothing tells a
  browser that already holds the page. `useRecapEditionBySlug` had
  `staleTime: 1000 * 60 * 10` and no `refetchInterval`, the public recap page
  opens no realtime channel, and `foundations/saving-and-freshness.md` and
  `admin/weekly-content-pack.md` both record that this feature has no realtime
  by design.
- **`staleTime` schedules nothing.** It only marks data stale so that the *next*
  trigger refetches it. The triggers available here are a window refocus, a
  remount and a reconnect — all of which require the reader to do something. A
  reader who leaves `/recap/<season>/week-<n>` open and simply reads fires none
  of them, so the recap the league took down stayed on their screen **until they
  next touched the tab**. There was no upper bound.
- The same was true of a correction. A viewer holding the page saw the withdrawn
  version rather than the corrected one, for as long as they sat there.
- Anyone arriving fresh has always been fine: the query filters on
  `status = 'published'`, so a first load returns nothing and the page renders
  Not Found.
- This is **not** the same defect as
  [B-57](#b-57-publishing-a-recap-never-refreshed-its-public-page), though B-57
  originally described it. B-57 was a cache key that matched nothing, and it
  only ever affected the admin's own browser. This one would still be here with
  B-57 fixed, because no invalidation in one browser can reach another.
- **Severity:** `medium`. Content the league has deliberately taken down stays
  readable by the public after the admin has been told it is down.
- **Corrected on review.** The first version of this entry said "for up to ten
  minutes", and was put to the league on that basis. That was wrong, for the
  very reason the defect existed: ten minutes is when the data becomes *eligible*
  to refetch, not when it refetches. The entry also offered "shorten `staleTime`"
  as one of three ways to close it. **That was never a real option** — a shorter
  window still schedules nothing, so it would have changed how soon a refetch
  *could* happen without causing one. Caught by Codex reviewing
  [#1529](https://github.com/DougZeThug/717rec/pull/1529), which is also where
  the real fix landed.
- **Decision needed:** `product call`. With the behaviour stated correctly, two
  ways to close it:
  1. **Poll the page.** A `refetchInterval` is the one thing that fires without
     the reader doing anything, so it is the only option short of realtime that
     puts a ceiling on the exposure.
  2. **Subscribe the page to `recap_editions`.** Makes a takedown immediate, but
     puts realtime on a page whose specification says it has none, so the
     specification changes with it.
- **Raised by:** Codex, reviewing
  [#1528](https://github.com/DougZeThug/717rec/pull/1528). Not raised by any
  feature document, and not found by the reading that produced B-54 to B-60.
- **Status:** **fixed.** The league chose the poll. `useRecapEditionBySlug` now
  carries `refetchInterval: 1000 * 60 * 5`, with `staleTime` brought down to the
  same five minutes so the two agree — polling every five while claiming
  freshness for ten would have been incoherent, and with a poll running the
  longer window bought nothing. The shape matches `useDailyTraffic`, the repo's
  only other polling query.

  A takedown now reaches an open tab within about five minutes instead of never.
  The test that covers it advances fake timers with nothing else happening — no
  click, no focus, no navigation — and fails if the second fetch does not come,
  so it cannot pass on a page that only refetches when touched.

  **Still true, and deliberately not changed here:** the home page's recap card
  (`usePublishedRecapEdition`) has the same shape and no interval. It is a
  milder case — the card links to a page that correctly shows Not Found on
  arrival — and it was left out so the fix stayed the size of the finding.

---

### B-62: A team with nothing to measure was ranked worst in the league on Compare

- **Where the user meets it:** the Compare page, with a team that has never
  played a career match on either side.
- **What happens / what was expected:** four rows of the Career Statistics block
  — Win %, Game Win %, Power Score and Strength of Schedule — carried a red "0%"
  percentile pill. Red is the bottom tier, so the team read as worst in the
  league on every measure. It has not been measured at all.
- `useLeaguePercentiles` says so plainly. A team that has never played is given
  `{ value: 0, percentile: 0, rank: 0, total: 0 }`, under a comment reading "no
  rank, not a rank of last".
- The team page has always hidden that. It renders through
  `PercentileFromResult`, which returns nothing when `total` is 0.
  `ComparisonStatRow` called the raw `PercentileBadge` and so skipped the guard.
  With `rank` at 0 the badge falls back to printing the percentile, and
  `getPercentileTier(0)` is the red tier — hence "0%" in red.
- **Severity:** `low`. No stored number is wrong. The badge is.
- **Decision needed:** `fix`.
- **Raised by:** `teams/compare-teams.md`, which had recorded it as a known gap
  rather than as a defect.
- **Status:** **fixed.** `ComparisonStatRow` now renders through
  `PercentileFromResult`, so Compare and the team page agree. It also passes the
  row label as `statName`, so the badge's tooltip names the stat it ranks. Five
  tests in `src/components/compare/__tests__/ComparisonStatRow.test.tsx` cover
  it; two of them fail against the old component.


### B-70: Compare showed a record and judged it as a count, so 3-9 beat 2-0

- **Where the user meets it:** the Compare page, on Playoff Record and on the
  three "vs Division Tiers" rows.
- **What happens / what was expected:** the row shows a record, for example
  `3-9` against `2-0`, and highlights the better side in the primary colour.
  It compared the **wins only**, so 3 beat 2 and the 3-9 team was marked ahead
  of the 2-0 team. The displayed value and the compared value disagreed.
- `TeamComparisonView` passed `numericValue1={t1?.career_playoff_wins || 0}`
  and the same shape for each division tier. The losses were never read.
- **Severity:** `medium`. Nothing stored is wrong, but the page states the
  opposite of what its own numbers say, on four rows.
- **Decision needed:** `fix`. The league chose win percentage over wins minus
  losses.
- **Raised by:** `teams/compare-teams.md`, which carried it under "Open
  questions" as "**may be worth treating as a bug rather than documenting**".
- **Status:** **fixed.** A local `winRate` helper rates each record and the four
  rows compare on that. A team with no games in a tier rates 0, so it never wins
  the row, and equal rates leave neither side marked. `calculateWinPercentage`
  in `rankingUtils` was deliberately not reused: it logs on every call and this
  runs eight times per render. Four tests in
  `src/components/compare/__tests__/TeamComparisonView.test.tsx` cover it; three
  fail against the old component.


### B-71: Two percentiles were worked out on every page load and shown on no screen

- **Where the user meets it:** nowhere, which is the defect. `useLeaguePercentiles`
  works out six stats for every team on every page that uses it. Only four were
  ever rendered.
- **What happens / what was expected:** `championships` and `playoffWinPercentage`
  were read by no component. `playoffWinPercentage` even carried its own
  population rule — teams with no playoff match are left out of the ranking
  rather than counted as zero — and none of it reached a screen. Sweep rate, the
  one career row with no percentile at all, had no badge either.
- This also explains a claim in `teams/compare-teams.md` that could never have
  been true: it said Compare gave a team with no playoff matches "a zero
  percentile on playoff win percentage", but Compare rendered no playoff badge
  at all. The doc described an intention, not the screen.
- **Severity:** `low`. Wasted work, and four rows less informative than the data
  behind them allowed.
- **Decision needed:** `fix`. The league chose to show the badges rather than
  delete the unused work.
- **Raised by:** a code reading, not a feature document.
- **Status:** **fixed.** `TeamPercentiles` gained `sweepRate`, and Compare now
  badges Sweep Rate, Playoff Record and Championships. A team with no playoff
  match still gets no playoff badge, because `UNMEASURED` passes through
  `PercentileFromResult` — see B-62.
- **Worth knowing:** the championship badge is a *shared* rank. Ranking counts
  every team that has played and most have won nothing, so they tie on one rank
  and are drawn in the bottom colour. That is honest but noisy on a league where
  few teams have won. If the league would rather rank championships only among
  teams that have won any — the way playoff win percentage already works — that
  is a one-line change to the population, and worth raising.


## Note: what the two DeepSource checks actually measure

Not a defect in the app — recorded so the next person does not spend a round
rediscovering it.

**First, where the verdicts actually appear.** Neither is a check run. The
`checks` API on a pull request returns eleven entries and **neither DeepSource
result is among them** — the one called "DeepSource coverage" is this repo's own
job that uploads the report, and it reports success even when DeepSource's
verdict is failure. The verdicts arrive as **legacy commit statuses**:

```
DeepSource: JavaScript      Analysis failed:  Blocking issues or failing metrics found
DeepSource: Test coverage   Analysis passed:  No blocking issues or failing metrics found
```

They are on the pull request page and they set `mergeable_state` to `unstable`,
but they are not required checks. That is easy to miss when reading CI through
the API, and it cost a round here.

**`DeepSource: JavaScript` was normally red on this repo, and the league merged
through it.** That was the reading at the time:

| PR | DeepSource: JavaScript | DeepSource: Test coverage | merged |
| --- | --- | --- | --- |
| #1311 | failure | failure | yes |
| #1312 | failure | failure | yes |
| #1315 | failure | **success** | — |

*No longer true, and the difference matters.* **#1470**, merged into `main` on
2026-09-16, carried `DeepSource: JavaScript — Analysis passed`. The backlog that
kept this status red has been worked off, so **a red JavaScript status is now
your branch's to fix**, not a standing condition to merge through. Measured on
#1474: green on the base and on that branch's first five commits, then red on
the sixth, which added a new test file.

**Read the finding; do not infer it.** On #1474 the red was assumed to be
JS-0117, because the same commit added two regex literals and this note named
JS-0117 as a known cause. It was not. Replacing both regexes changed nothing,
and the actual finding was a single **JS-0116**, "Found `async` function without
any `await` expressions" — `queryFn: async () => null`, a throwaway in a test
helper for a query that is built and never run. One round was spent on the wrong
hypothesis.

**Where the finding is legible**, since this is the part that makes guessing
tempting: not in the `checks` API, and not as an inline review comment either —
DeepSource's summary comment says "you can see the individual issues we found as
inline review comments" and on #1474 it posted none. The issue list is on the run
page the commit status links to, `app.deepsource.com/gh/…/run/<id>/javascript/`.
Open that before changing any code.

**Coverage, on the other hand, tracks the branch's own new lines, and can be
made green.** Measured on #1315, where nothing changed between the first two
rows except four tests covering that branch's own uncovered lines:

| Head | Line coverage (new code) | DeepSource: Test coverage |
| --- | --- | --- |
| `71df0ce` | 99.3% | failure |
| `06e8527` | 100% | **success** |
| `37e562f` | 100% | **success** |

So the status keys on **new-code line coverage**, and it appears to want all of
it: 99.3% failed while every Threshold column still read `N/A`. Thresholds are
set in DeepSource's web UI rather than in `.deepsource.toml` and none are set
here, so `N/A` in that column does **not** mean nothing is being enforced.

*Superseded, kept as the only other measurement anyone took.* An earlier reading
of this note said the status counted uncovered-line annotations across every file
a pull request *touches*, and therefore "cannot be made green by covering the
code a branch actually adds" — on the B-11 to B-14 branch, seven of ~180
reported lines were the branch's, all seven were tested, and it still read
Failure. #1315 contradicts the conclusion. That branch cannot be re-run, so
whether DeepSource changed, or something else there was uncovered, is unknown.
**Trust the table above; it is the more recent measurement.**

**The gate that does bind this repo is `vitest.config.ts`**, which enforces
per-area coverage floors — `src/components/**` and `src/pages/**` have their own
— and CI runs it. `coverage-baseline.txt` is a manual snapshot, promoted with
`npm run test:coverage:update-baseline`, not an enforced gate.

If the coverage status goes red on a branch, the first thing to check is whether
that branch left any of its **own** new lines uncovered — on the evidence above
that is what it is telling you, and it is usually a real gap worth closing.

One related trap, since it cost a round here: **`.deepsource.toml` is read from
the default branch.** Config changes on a branch do not affect that branch's own
analysis — they take effect once merged.

**`JS-0117`, the "use the `u` flag" rule, is one of the findings keeping
`DeepSource: JavaScript` red.** It is raised against whichever test files a pull
request happens to touch. The repo has
**231 regex queries in tests and 223 of them carry no `/u`**, so the finding is a
repo-wide style question, not a defect in the change under review. None of the
patterns involved use unicode escapes or astral characters — em-dashes and
middots are single code units — so the flag changes no behaviour. Adding it to
one branch's files makes those files the odd ones out and fixes nothing.

*That last sentence assumed the status was red regardless, which it no longer
is — but the advice still holds.* #1474 tested it directly: two new
`name: /…/i` regexes in a Testing Library query were replaced with exact strings
and the JavaScript status stayed red, because JS-0117 was never what it was
reporting. So a branch adding a regex does **not**, on this evidence, turn the
status red on its own, and the existing 223 need nothing done to them.

The replacement was kept anyway, on its own merits rather than DeepSource's:
`name: 'Cancel'` is more precise than `name: /cancel/i` and is what the sibling
`DeleteMatchDialog.test.tsx` already uses for the same button.

Two options: sweep all 231 in one change so the rule means something, or accept
that it tracks the repo's existing style rather than the branch under review.
Until one of those happens it is part of why that status is red, which the table
above shows is this repo's normal state.
