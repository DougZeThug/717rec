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

**Week.** Matches are grouped by week for display. A week is derived from the
match date against the season start, not stored on the match.

**Confirmation open.** A per-season flag that controls whether teams can confirm
their place for the coming season. When it is off, the confirmation controls are
absent rather than disabled.

**Playoffs active.** A per-season flag. When it is on, the playoffs page shows a
live bracket rather than a placeholder, and the regular-season schedule stops
being the centre of the app.

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

**Visitor.** Anyone not signed in. A visitor can read nearly everything: teams,
schedule, standings, playoffs, history, and the message board. A visitor cannot
write anything except a contact request.

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

## Scheduling

**Timeslot.** A named slot a match can be scheduled into. Teams state which
timeslots they can play; admins use those preferences when building a schedule.

**Timeslot preference.** A team's statement that it can or cannot play a given
timeslot. It is a preference, not a constraint: the schedule can place a team
outside its preferences.

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

## Messages to the user

**Toast.** A short message that appears at the edge of the screen and dismisses
itself. Toasts are the app's main way of reporting both success and failure.

**Destructive toast.** A toast styled as an error. Every failed write should
produce one; where one does not appear, the failure is silent, which is a bug.

**Error boundary.** The screen shown when a page fails to render at all, as
opposed to a request failing. It replaces the page rather than appearing beside
it.

**Push notification.** A message delivered outside the app. Admins can send them;
what a user receives and when is described in
[`admin/send-notifications.md`](admin/send-notifications.md) and
[`cross-cutting/what-the-league-sees.md`](cross-cutting/what-the-league-sees.md).
