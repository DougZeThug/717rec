# Glossary

The vocabulary used across these documents. When a document uses one of these
words, it means exactly this.

## The app

**717rec.** The league management app for a recreational cornhole league in
Lancaster, Pennsylvania. One web app, one league. There is no concept of a
second league or a second organisation anywhere in the product.

**The app.** The browser application at the league's address, or at
`http://localhost:8080` when run from source. Every document describes the app in
a desktop browser unless it says otherwise; small-screen behaviour is a paragraph
in each document and a whole document at
[`cross-cutting/on-a-phone.md`](cross-cutting/on-a-phone.md).

**Page.** One route. `/schedule`, `/teams/:teamId`, `/my-team`. The full list is
in [`foundations/navigation.md`](foundations/navigation.md). Pages load one at a
time and on demand, so a page the user has not visited yet shows a brief loading
state the first time.

## Seasons and time

**Season.** A named run of the league from a start date to an end date, with its
own teams, schedule, standings, and playoffs. Almost every number in the app is
scoped to one season: a team's record, its power score, and its badges all mean
"in this season". *Career* numbers are the exception. See
[`foundations/seasons.md`](foundations/seasons.md).

**The active season.** The one season marked active. There is at most one at a
time. Pages that do not name a season show the active one. Activating a season
is an admin action and it changes what nearly every page shows.

**Archived season.** A season that has ended and been frozen. Its numbers no
longer move, even when the formula that produced them changes. Archived seasons
are readable at [`history/past-seasons.md`](history/past-seasons.md).

**Week.** A unit used for grouping in some places and not others. A week number
is derived from the match date against the season start and is never stored on
the match.

Take care: the **schedule page does not group by week.** It groups by calendar
date and then by timeslot, and shows no week number anywhere. Week grouping
appears in other summaries, not there.

**Confirmation open.** A per-season flag that controls whether teams can confirm
their place for the coming season. When it is off, the confirmation controls are
absent rather than disabled.

**Playoffs active.** A per-season flag. When it is on, the playoffs page shows a
live bracket rather than a placeholder, and the regular-season schedule stops
being the centre of the app.

**Partial archival.** Archiving a season's regular season while leaving its
playoff bracket running. Team counters reset and the season is marked as having
playoffs in progress; finalising closes it out later.

## Teams and people

**Team.** The unit that plays matches. A team has a name, a division, a roster,
a record, and a power score. Teams belong to a season; a team that plays across
several seasons keeps its identity, which is what makes *career* numbers
possible.

**Player.** A person on a team's roster. In the data a player is a row that may
or may not be linked to a signed-in account; a person can appear as a player
without ever having signed in.

**Profile.** The record attached to a signed-in account: a display name, a
username, an avatar, and the admin flag. A signed-in user without a completed
profile is sent to the profile setup page before they can do much else.

**Roster.** The set of players on a team for a season. Adding a player is not the
same as that player having an account.

**Membership.** The link between a signed-in account and a team. A membership is
either approved or waiting for approval; an unapproved membership grants nothing.
Requesting one is described in
[`getting-started/join-a-team.md`](getting-started/join-a-team.md).

**Division.** A competitive tier — Recreational, Intermediate, Competitive, and
Hidden. A division carries a *division weight* used in power score, and that
weight is versioned: a match is rated against the division an opponent was in on
the date of the match, not the division they are in now.

**Hidden.** A division used for teams that are no longer playing. A hidden team
disappears from listings but its past matches still count for the teams that
played it. Hiding a team is not deleting it.

## Roles

**Visitor.** Anyone not signed in. A visitor can read most of the app: teams,
schedule, standings, playoffs, history, insights, help, and a match being scored
live. A visitor cannot write anything except a contact request.

The **message board is the exception**: the page renders for a visitor, but the
database returns no messages to anyone signed out, so the board shows a sign-in
prompt in place of the messages. See
[`message-board/read-the-board.md`](message-board/read-the-board.md).

**Player.** A signed-in account with a profile. The baseline point of view for
these documents. What a player may do beyond a visitor depends on which team they
have an approved membership for.

**Admin.** A signed-in account whose profile has the admin flag set. Admin is a
single flag; there are no partial admin roles. Everything an admin can do is in
[`admin/`](admin/the-admin-dashboard.md) and summarised in
[`cross-cutting/permissions.md`](cross-cutting/permissions.md).

> **Technical note:** admin is read from the loaded profile, not from a separate
> permissions call, so it is known as soon as the profile is. The database
> enforces the same rule independently; hiding a control and refusing the write
> are two different mechanisms and they can disagree.

**Team slug.** The lower-case, punctuation-stripped form of a team's name used as
its address in `/teams/:teamId` — `Baggin' & Braggin'` becomes `baggin-braggin`.
Every link inside the app builds a team's address this way rather than from its
id. Because the address comes from the name, renaming a team changes its address
and breaks existing links to it, and two teams whose names reduce to the same
slug collide.

**Membership request.** An unapproved membership waiting in the admin queue.
Approving it turns it into an approved membership. **Rejecting it deletes the
row**, so afterwards a rejected request and one that was never made look
identical, and the person is never told.

## Matches, games, and rounds

**Match.** One scheduled meeting of two teams, on a date, at a location. A match
is the thing that appears on the schedule and the thing that produces a result.
A match is **best of three games**: the first team to win two games wins the
match.

**Game.** One leg of a match. A game is **first to 21 points, win by two**. There
is no bust rule and no hard cap, so a game can run past 21 indefinitely until one
side leads by two.

**Round.** One exchange inside a game: both teams throw, and the difference
decides how many points are scored. A round records each side's points, which
player threw, and the bag breakdown. Rounds are numbered from 1 within a game.

**Net points.** The points a round awards, being the difference between the two
sides' points for that round. Only one side scores in a round.

**Bags in, on, off.** The three outcomes for a thrown bag: in the hole, on the
board, off the board. These are recorded per side per round and feed the
per-player statistics. They are optional detail; a round can be recorded by
points alone.

**Thrower.** The player recorded as throwing for a side in a round. A side has at
most two players.

**Completed match.** A match with a result: a winner, a loser, and game wins.
Completing a match is what moves standings, power score, and badges.

**Tie.** A match recorded as completed with no winner. Ties need an admin
decision and appear in the pending list until one is made.

## Scores and their states

**Score submission.** A player's report of a completed match's result. A
submission carries who sent it, which team they were on, a message, and a status.
It is a request, not the result itself.

**Pending.** Waiting on a decision. Used in two distinct places and they must not
be confused: a *pending score submission* is waiting for review, and a *pending
match* is a match completed without a winner — a tie — waiting for an admin to
resolve it.

**Approved / rejected.** The two outcomes of reviewing a score submission.
Approval writes the result onto the match; rejection leaves the match as it was.

**Reopened.** A completed match returned to an incomplete state so its result can
be entered again. Reopening reverses the statistics the original result produced.

**Live scoring.** Entering a match's result round by round while the match is
being played, rather than reporting a final score afterwards. Live scoring is its
own surface at `/matches/:matchId/live`; see
[`live-scoring/start-a-live-match.md`](live-scoring/start-a-live-match.md).

**Finalise.** The action that turns a live-scored match into a completed match:
it writes the winner, the game wins, and the statistics. Before finalising, a
live match is editable; after, it is not, except by an admin correction.

**Score report.** The name the screens use for a score submission. The dialog is
headed "Report Match Score" and the button says "Report". Use *score submission*
for the record and *score report* when quoting what the user sees.

**Match with no result.** A match not marked completed. This is a third thing,
distinct from a pending score submission and from a pending match, and it is what
the home page's "Pending Scores" card lists. Sending a score report does **not**
give a match a result.

**Live correction.** An admin edit to the rounds and games underneath a match
that has already been scored, made from the admin dashboard rather than the live
page. A live correction changes what the rounds say and **never** changes the
match's official result; making the two agree needs the match reopened and saved
again.

**Resubmit.** Recording a different official result on a match that already has
one. The write reverses the old result's effect on both teams and applies the new
one in one step.

**Reverse.** Undoing a recorded result's effect on statistics. Three things
reverse: reopening a match, resubmitting a different result, and deleting the
match. Reversal is complete — records, standings, and season statistics all move
back.

## Standings and numbers

**Standings.** The ordered table of teams for a season.

**Power score.** A rating of a team's strength, computed from its results and the
strength of the teams it played. It is a weighted average, not a running total,
so a single result can move it in either direction. Opponents are weighted by the
division they were in on the match date. Power scores are computed on the server
and frozen when a season is archived. See
[`stats/power-score.md`](stats/power-score.md).

**Division weight.** A multiplier attached to a division, used to weight
opponents in power score. Weights are versioned over time, which is why an
archived season's numbers do not move when a weight changes.

**Career.** Numbers across every season a team has played, as opposed to the
active season alone. Career power score is computed separately from season power
score and the two can disagree.

**Strength of schedule.** A derived number describing how strong a team's
opponents have been. It appears on team pages and feeds power score.

**Badge.** An award a team earns, either for a playoff placing (champion, runner
up, third place, per division) or for a pattern of results (hot streak, cold
streak, king slayer, gatekeeper, and others). Badges are computed, not granted by
hand; they appear on team pages. See [`stats/badges.md`](stats/badges.md).

**Head to head.** One team's record against one other team, across matches they
have both played.

**Sweep.** A match won 2–0. **Sweep rate** is sweeps as a share of *all* matches
played, not of matches won.

**Clutch record.** A team's wins and losses in matches that went to a deciding
third game.

**Four bagger.** A round in which one player put every bag in the hole. Counted
per player, from live-scored matches only.

**PPR and DPR.** Points per round and differential per round, per player, from
live-scored matches only. Shown as a dash rather than a zero when the player has
thrown no rounds, so an absent player is never made to look bad by a 0.00.

**Report card.** Six letter grades for a team — Overall, Consistency, Games,
Offense, Clutch, Schedule — each from a percentile against the league, plus a
weighted average. Available for a season and for a career, graded against
different populations, so the two are not comparable.

**Parity index.** A 0–100 number describing how even the league is: 100 minus
four times the spread of power score, floored at 0. Labelled Very High down to
Very Low.

**Weekly snapshot.** A stored copy of every team's power score, captured once a
week. Trend arrows and the weekly movers are differences between snapshots, so
they are blank when the job has not run.

**Rivalry label.** A word the app puts on a head-to-head record with three or
more meetings: Rival, Nemesis, Tough Matchup, Favorite, or Dominated. It is
derived from the win percentage each time it is shown, not stored.

**Playoff rank.** A team's finishing position within its division for a season,
stored on the season's standings and shown as the Rank column in history.
Distinct from *seed*, which is a starting position in a bracket.

**Season recap.** The expandable part of a season's card in history, holding that
season's final standings split by division. Closed until opened, and not
linkable.

**Counter drift.** A team whose stored win and loss counters disagree with its
completed-match history. An admin can recompute every team's counters from the
match history in one action.

## Scheduling

**Timeslot.** A named slot a match can be scheduled into. Teams state which
timeslots they can play; admins use those preferences when building a schedule.

**Timeslot assignment.** A team placed into a timeslot on a given night. **No
screen in the app lets a team state a preference** — despite the name of the
underlying data, every assignment is made by an admin. Auto-scheduling reads
existing assignments; it does not read anything a team asked for.

**Bye.** A team marked as not playing on a given night. A bye is stored exactly
like a timeslot assignment, with the slot set to the literal word `BYE`. Byes are
shown last on the schedule's timeslots view, in an orange card.

**Back-to-back pair.** Two consecutive half-hour timeslots treated as one unit.
An admin picks the first and the app books the team for both, so only the first
is shown on the schedule. The nine pairs run from 5:00–5:30 PM to 9:00–9:30 PM
and they **overlap**: 5:30 PM is the second half of one pair and the first half
of the next.

**Time block.** The auto-scheduler's own name for a back-to-back pair — `Early`,
`MidEarly`, `SuperLate`, and so on. Teams are loaded into blocks and paired only
within a block. A block name never reaches a saved match: the tools resolve it to
the pair's start time first.

**Double header.** A team booked into two separate back-to-back pairs on the same
night — four timeslot rows. The team appears only in the earlier slot, with a
badge naming both. Two pairs that share a half-hour are refused.

**Auto-schedule.** The admin tool that proposes a full season schedule from teams,
divisions, and timeslot preferences. It proposes; an admin still saves it.

## Playoffs

**Bracket.** The playoff structure for a season: a tree of matches where the
winner of one feeds the next. Brackets are built with the `brackets-manager`
library rather than by hand.

**Seed.** A team's starting position in a bracket, derived from standings and
settable by an admin.

**Play-in.** A match before the first round proper, used when the number of teams
is not a power of two.

**Blind draw.** A separate playoff format in which players sign up individually
and are paired at random rather than playing on their season team. Signing up is
described in [`playoffs/blind-draw-signup.md`](playoffs/blind-draw-signup.md).

**Challonge fallback.** A stored copy of a bracket from the external Challonge
service, shown when the app's own bracket is unavailable. It is read-only.

**Bracket state.** One of *pending*, *in progress*, or *completed*. Seeding and
rearranging are possible only while a bracket is pending; **a single entered
result moves it to in progress permanently**, and there is no way back.

**Grand final type.** For a double-elimination bracket, whether the grand final
is one match or two, the second played only if the losers' bracket winner takes
the first.

**Challonge slug.** The identifier at the end of a Challonge tournament address —
`5hy558bb` in `challonge.com/5hy558bb`. It is what an admin types to add a
fallback embed.

**Blind draw signup.** One person's entry for a blind draw night: a first name, a
last initial, and the date. Signups carry no account link, so the same person can
appear twice and nothing connects a signup to a player. **There is no way to
withdraw one**, and nothing says so.

**Bye (in a bracket).** A slot no team will ever occupy. The bracket engine
rounds the team count up to the next power of two and fills the gap with byes,
which go to the top seeds; a team facing one advances without playing. A bye
reads "BYE" and never changes, unlike a *flow hint*, which names the match that
will fill the slot. **The current engine uses byes rather than play-ins.**

**Flow hint.** The text written into an empty bracket slot to say what will fill
it — "Winner of WB 1.1", "Loser of WB Semi 1". It uses short match labels that do
**not** match the round headings above the same columns, so the same match is
named two ways on one screen.

**Legacy bracket.** A bracket created before the current bracket engine. It is
listed with a "Legacy" badge and **cannot be opened**: the loader returns nothing
and the page shows no message.

**Final standings.** The placement table shown above a completed bracket: every
team in finishing order with match and game records, and a trophy, medal and
award for the first three. Written on the server when the bracket completes. A
bracket can be completed with no final standings, which only an admin can see.

## The message board

**Message board.** The league's one shared conversation, at `/message-board`. A
single flat list of messages, newest first. It belongs to no season and is never
cleared. **Only signed-in accounts can read it**; a visitor sees an empty board
rather than a refusal.

**Message.** One post on the message board, carrying its author's name, their
team at the time of posting, a category, and the text. **There are no threads and
no replies** — every message sits at the same level in one list.

**Message category.** A label on a message. The board can filter by five —
General, Question, Announcement, Event, Other — but the composer can only produce
General, and Announcement for an admin.

**Announcement.** A message posted by an admin under the Announcement category.
It gets a blue border and a badge and nothing else: it is not pinned, and nobody
is notified.

**Composer.** The box at the foot of the message board for writing a new message.
It exists only for a signed-in account; a visitor gets a sign-in bar instead.

**Reaction.** An emoji a signed-in user attaches to a message. Reactions appear
as chips with a count. A user has at most one of each emoji per message, and
pressing the chip toggles it. Reactions on a *match* are a separate feature,
stored separately.

**Hero card.** A card on the public home page, written by an admin, with a
headline, colours, a type — standard, champions, event, or announcement — and an
optional target. Cards are visible or hidden; a hidden card exists only in the
admin table.

## Requests to the league

**Contact request.** A message sent to the league from the panel at the foot of
the home page. It carries a type, a name, a contact detail, and a message, and it
is stored in an admin inbox with a status of new or resolved. **It is not the
same thing as the form at `/contact`**, which is emailed and never appears in
that inbox. The two are separate channels and nothing in either says so.

**Verified (on a request).** A flag meaning the sender was signed in, so the name
and team on the request came from their account rather than being typed.

**Support ticket.** The stored copy of a message sent through the form at
`/contact`. Distinct from a *contact request*, which is a different record from a
different form on the home page.

**Team request.** A team's formal ask for a schedule change: a time change, a
bye, or an emergency cancellation. An admin approves or denies it. Approving one
records a decision and **does not change the schedule**.

**Authorisation request.** A pending question from another application that wants
to act as a signed-in user inside 717rec, answered once at `/oauth/consent`.
717rec has no list of authorisations granted and no way to withdraw one.

**Consent screen.** The one page at `/oauth/consent` where an authorisation
request is answered. Nothing inside the app links to it.

## What the league records

**Device class.** The coarse label stored with every pageview describing the kind
of device: iOS, Android, other mobile, desktop, or unknown. It is derived from
the browser's own description of itself and is the only thing about a user's
device the league records.

**Anonymous day id.** The short fingerprint the league's own pageview counter
stores instead of an address. It is made from the address, the browser's
description of itself, the date, and a secret the league holds, so the same
person counts as one visitor within a day and an unrelated one the next.

**Session replay.** A recording of what happened on screen during a visit, made
by the error-monitoring service. Roughly one visit in ten is recorded, and every
visit in which an error occurs. Nothing in the app mentions this to the user.

## State words

**Loading.** The app is waiting for data it has not got yet and is showing a
placeholder — usually a skeleton in the shape of the content. Distinct from
*empty*.

**Empty.** The data arrived and there is none. An empty schedule and a loading
schedule look different and mean different things; conflating them is a bug.

**Stale.** Data the app has and is showing, which it believes may be out of date.
The app shows stale data rather than a spinner while it refetches, so a number
can change under the user without any action from them. See
[`foundations/saving-and-freshness.md`](foundations/saving-and-freshness.md).

**Dirty.** A form is dirty from the first edit that differs from what was loaded
until the next successful save or an explicit discard. Reverting every field by
hand does not necessarily clear it.

**Saved.** Written to the database and acknowledged. Until the acknowledgement,
what the user sees may be *optimistic*.

**Optimistic.** Shown as though it succeeded before the server has said so. If
the request then fails, the display is rolled back and a toast explains. Which
actions are optimistic is listed in
[`foundations/saving-and-freshness.md`](foundations/saving-and-freshness.md).

**Name check.** The live check on the profile page asking whether a chosen name
is already in use, run shortly after the user stops typing. A tick means free, a
warning means taken. The check can only see profiles the user is allowed to read,
which for an ordinary player is their own, so it almost always answers "free"; a
genuine clash is caught at save time instead.

**Display preference.** A layout choice a page remembers in the browser between
visits rather than in the address or against the account. `/teams` is the only
page with any: its style, view, and sort. A display preference is per browser,
is not shareable, and cannot be undone except by changing it back.

**Block.** One self-contained panel on the home page that draws itself only when
it has data. A home page is a stack of blocks in a fixed order; **a block with
nothing to say is absent rather than empty**, so two users can see very different
home pages and neither is told why.

**Section.** A collapsible region of a page with its own heading and chevron,
which fetches its own data only when first opened. Used on a team's page. Which
sections are open is never remembered.

**Remembered destination.** The page the app intends to return a user to after
they sign in. A destination held in navigation state is lost on a reload of the
sign-in page.

**Gated.** A page or control that exists but is not reachable in the current
state — not signed in, no profile, not an admin. What a gate looks like differs
by gate: a redirect, a disabled control, or nothing at all.

## Events that end or interrupt

These words are used in the "Cancel and interrupt" table of every document and
mean exactly this.

**Cancel.** The user's explicit abort: pressing Escape, or a Cancel or Close
button. A cancel discards whatever was in progress and is never partial.

**Navigate away.** Moving to another route inside the app by a link or a
programmatic redirect. The page component is unmounted; anything held only in
that component's state is lost. In-flight requests are not aborted, so a write
already sent will still land.

**Back or forward.** The browser's history buttons. These are the same as
navigating away except that the app does not choose the destination and cannot
prevent it.

**Reload.** The browser re-fetches the app from scratch. Everything held in
memory is lost. What survives is what was written to the database, plus anything
explicitly stored in the browser.

**Tab closed.** As reload, except the user does not come back. Nothing that
depended on the page staying open completes.

**Network lost.** The browser has no connection. Requests fail rather than
queue. There is no offline write queue anywhere in the product; see
[`cross-cutting/errors-and-offline.md`](cross-cutting/errors-and-offline.md).

**Request failed.** The server answered with an error, or the request timed out.
The app throws, the error becomes a message, and any optimistic display is rolled
back.

**Session expired.** The signed-in session is no longer valid. Reads that were
public still work; writes fail. The app does not always notice immediately, so
the first sign is usually a refused write.

**Changed elsewhere.** The same record was changed in another tab, by another
user, or by an admin. Where a realtime subscription exists, the change arrives
and the display updates under the user. Where one does not, the user keeps seeing
the old value until something else causes a refetch.

**Autofill.** The browser or a password manager writes into a form field without
a keystroke. It can set a value without the app seeing the events it would
normally use to notice a change.

**Focus lost.** The window or tab is no longer in front. By default the app
refetches some data when focus returns, which is one of the ways a number changes
under the user.

**Breakpoint.** The screen width at which the app changes shape. 717rec has
exactly one that changes what is on screen: **768 pixels**. Toasts additionally
change position at 640.

**Command palette.** The search-and-jump dialog opened with Cmd/Ctrl+K. It is the
app's only global keyboard shortcut and it exists **only on a screen 768 pixels
or wider**.

**Reduced motion.** The operating-system setting asking software to animate less.
717rec honours it in one stylesheet and ignores it everywhere else.

## Messages to the user

**Toast.** A short message that appears at the edge of the screen and dismisses
itself. Toasts are the app's main way of reporting both success and failure.

**Destructive toast.** A toast styled as an error. Every failed write should
produce one; where one does not appear, the failure is silent, which is a bug.

**Error boundary.** The screen shown when a page fails to render at all, as
opposed to a request failing. It replaces the page rather than appearing beside
it.

**Admin notification.** A short announcement an admin posts, shown to everyone in
the bell in the app header. It has a title and a body, it belongs to no season,
and it stays until an admin deletes it. See
[`admin/send-notifications.md`](admin/send-notifications.md).

**Push notification.** **Not implemented.** Nothing in the product delivers
anything to a device outside the browser: no push, no SMS, and no email except
the one the contact form sends to the league. Where these documents say
"notification" without qualification they mean an *admin notification* in the
bell. See
[`cross-cutting/what-the-league-sees.md`](cross-cutting/what-the-league-sees.md).
