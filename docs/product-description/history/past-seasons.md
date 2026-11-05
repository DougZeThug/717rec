# Past seasons

## Summary

The history page is where the league's finished seasons are kept. It shows one
card per season, newest first, each carrying that season's champions, three
headline numbers, and — when opened — the full final standings split by
division.

It lives at `/history` and is open to everyone. Nothing on it can be changed by a
player. An admin gets one extra control inside an opened season: the ability to
move teams between divisions and reorder them, which is the only write this page
has.

The numbers here are frozen. An archived season's standings, power scores, and
strength of schedule do not move when the league later changes how those numbers
are worked out — except saving new Power Score weights in the Sandbox, which
recomputes every season, archived included. See
[`../foundations/seasons.md`](../foundations/seasons.md#what-frozen-means).

## The simple case

The user opens `/history` and sees a card headed "Loading historical data..." for
a moment, then a stack of season cards with the most recent at the top.

Each card gives the season's name, the months it ran, and a line reading
something like "12 teams · 66 matches". Under that sit two small panels side by
side: **Champions**, listing each division's winning team with its record, and
**Highlights**, giving Most Wins, Best Power Score, and Most Game Wins.

At the foot of every card is a strip reading **Full Season Recap**. Pressing it
slides open the final standings, one panel per division, ordered Competitive
first and Recreational last. Each panel is a table: rank, team, match record, win
percentage, game record, game win percentage, power score, and strength of
schedule. The champion's row is tinted gold with a crown; the runner up's is grey
with a medal.

Pressing the strip again closes it. Nothing is saved, nothing is sent, and the
page is the same on the next visit.

## The interaction, event by event

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> list : seasons arrive
    loading --> failed : the list cannot be read
    loading --> empty : there are no seasons
    list --> expanded : press Full Season Recap
    expanded --> list : press it again
    expanded --> editing : admin presses Edit Divisions
    editing --> editing : drag a team, rename or add a division
    editing --> saving : press Save Changes
    saving --> expanded : saved, then reloaded
    saving --> editing : the save is refused
    editing --> expanded : Cancel, confirmed
```

### Arrive

The page loads on its own, so there is a brief blank the first time in a session.
Then one request fetches every season's name, dates, and active flag, ordered by
start date with the newest first.

**Every season is listed, not only the archived ones.** The season the league is
playing right now appears at the top with a green **Active** badge. A season with
no champion recorded and no active flag gets no badge at all.

Each season card then fetches its own standings as soon as it appears —
**before** anything is expanded, and for every card on the page at once. Ten
seasons means ten requests on arrival.

> **Technical note:** those per-season requests are marked as never fresh, so
> they run again every time the page is mounted. Most of the app keeps data for
> five minutes; this page does not. See
> [`../foundations/saving-and-freshness.md`](../foundations/saving-and-freshness.md#how-long-data-is-kept).

While a card's standings are loading, its two summary panels are grey
placeholders. When they arrive, the "N teams · M matches" line appears with them.

Nothing is focused on arrival. Nothing is recorded beyond an ordinary pageview.

### Leave without changing anything

Nothing happens. No card's open or closed state survives leaving the page.

`/history` is built to remember **scroll position** and restore it when the user
comes back with the browser's back button — one of four routes that try. In a
2026-11-05 test (a top-bar link, then Back) it landed at the top. Every card is
closed again on return, so a restored position may not point at the same card.

### Begin editing

There is no form here for a player. The two things that behave like beginning are
opening a recap and, for an admin, entering edit mode.

Opening a recap changes nothing outside the browser. On a wide screen every
division panel inside it starts open; on a phone every panel starts closed and
has to be tapped open one at a time. A panel is closed from the first moment on a
phone, so the recap never draws every team card and then folds them away.

An admin sees an **Edit Divisions** button at the top of an opened recap. Pressing
it replaces the read-only panels with a drag-and-drop board and a toolbar. The
toolbar reads "No changes" in green until the first change, then "N unsaved
changes" in amber. Nothing is written yet.

### While editing

In edit mode the admin can drag a team to another division, drag it up or down
within its division, rename a division in place, add an empty division, and
remove a division that has no teams left in it.

Every drop renumbers the ranks in both the division the team left and the
division it joined, so ranks stay 1, 2, 3 with no gaps. Removing a division that
still holds teams is refused with a red toast reading "Cannot Remove Division —
Move all teams out of this division first."

A **Reset** button appears next to Cancel as soon as there is a change. It
discards every local change at once and asks nothing.

The URL never changes. `/history` is `/history` throughout, so an opened season,
an opened division, and edit mode cannot be linked to or bookmarked.

### Submit

**Save Changes** sends only the teams whose division or rank differs from what was
loaded. They go in groups of ten, and each team is written twice: once to the
season's standings and once to the archived team record behind them.

On success a toast says "Changes Saved — Successfully updated N teams", the
season's standings are fetched again, and the board returns to the read-only
panels.

On failure a red toast says "Update Failed" followed by **the database's own
reason**. This page is unusual in that respect: most of the app replaces the
server's reason with a generic sentence. The board stays open with every change
still in place.

## Modifiers

| Modifier | Set at arrival | Changed while editing |
| --- | --- | --- |
| The user's role (visitor, player, admin) | Visitors and players see the same read-only page. Only an admin sees the Edit Divisions button inside an opened recap. | Losing admin leaves the board on screen; the save then fails and reports the refusal. Gaining admin does not add the button until the page is re-rendered. |
| The record's state | A season with a champion recorded gets the "🏆 Completed" badge. A season with standings but no champion gets no badge. A season with no standings at all shows no summary panels and no team or match count. If it is not the active season, its opened recap reads "No standings recorded for this season". | An admin editing one season's divisions does not affect any other card. |
| The season's state (active, archived, playoffs on) | The active season shows a green **Active** badge and, if it has no standings yet, its recap reads "Season in progress – check back later". Archived seasons show their frozen numbers. The playoffs flag has no effect here. | A season being archived elsewhere does not reach this page until it is loaded again. |
| Viewport | On a wide screen every division panel inside an opened recap starts open, the standings are a table, and a Season Awards strip appears at the foot. On a phone the panels start closed, each team is a card with a power score dial, the awards strip is **not rendered at all**, and a season card's months sit under its title instead of beside it. | Crossing the phone-to-desktop width closes every division panel, because the collapse rule runs again. |
| Keys the form honours | Tab reaches every season's Full Season Recap strip, and Enter or Space opens it. Inside a recap, Tab reaches only the small chevron beside each division name, not the name itself. The chevron is named "Toggle *division* teams" and reports whether the panel is open. | In edit mode, Enter saves a division rename or a new division name and Escape cancels it. Dragging by keyboard is wired up but not documented anywhere on screen. |

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | No effect. There is no Cancel on the read-only page and Escape does nothing. | Escape closes a division rename box. The toolbar's **Cancel** asks "You have unsaved changes. Are you sure you want to cancel?" through the browser's own confirmation box, and discards everything if confirmed. Neither can stop a save already sent. |
| In-app navigation away, or switching tab within the page | Nothing is lost. Which cards were open is forgotten. | **Every unsaved change is lost with no warning.** The confirmation only guards the Cancel button, not leaving the page. A save already sent still lands, unseen. |
| Browser back or forward | Returns to the previous page and is built to restore this page's scroll position on the way back; in the 2026-11-05 test (a top-bar link, then Back) it landed at the top. Cards return closed. | Same as navigating away, and the app cannot prevent it. |
| Reload, or the tab closed | The page rebuilds itself from scratch: every season fetched again, every card closed. | **Every unsaved change is lost.** A save already sent may have landed; after reloading the standings themselves are the only evidence. |
| Network lost mid-request | The season list fails and the whole page becomes "Failed to load season history". A single card failing shows its own error inside the opened recap, with a **Try Again** button. | The save fails and the red "Update Failed" toast carries the network error. Nothing is queued and nothing is retried. |
| The request fails or times out | The season list is retried once. A single season's standings are retried **twice**, a second apart, before the card gives up. | The save is not retried. Changes stay on screen for the admin to press Save again. |
| The session expires | No effect. Everything on this page reads public data. | The save is refused by the database and the refusal is shown. The board keeps the changes, so pressing Save again after signing back in works. |
| The same record changed in another tab, or by another user | No effect until something causes a refetch. There is no realtime here, so another admin's rewrite of a season is invisible. | **The two admins' last save wins, silently.** Nothing warns that the standings were rewritten under the board, and the board still holds the version it loaded. |
| Browser autofill or a password manager writes into the form | No effect. There are no fields on the read-only page. | The division name and rename boxes are plain text inputs and could be filled, but nothing marks them as a name or address, so in practice nothing offers to. |
| The window loses focus | No effect. Nothing polls and nothing refetches on this page from focus alone. | No effect. A save in flight continues. |

After any interrupt the page is exactly what the database holds. Nothing about an
opened card, an opened division, or an unsaved drag survives leaving.

## Interactions with other systems

**Permissions and roles.** Reading needs nothing at all. Editing divisions is
admin-only, and the button is simply absent for everyone else. The database
enforces the same rule separately, so an admin flag lost between the page loading
and the save landing produces a refusal rather than a hidden button. See
[`../cross-cutting/permissions.md`](../cross-cutting/permissions.md).

**Season scoping.** This is the one page that is *not* scoped to the active
season: it names every season explicitly and shows them all at once. The active
season is included, which is surprising on a page called Season History.

**Validation and error display.** Only two rules exist, both on division names: a
name cannot be empty and cannot repeat an existing name, compared without regard
to capitals. Both show a red line under the input. Nothing validates a drag.

**Unsaved changes.** Guarded in one place only — the toolbar's Cancel button, by
the browser's own confirmation box. Navigating away, reloading, or closing the
tab discards the work with no prompt.

**Optimistic updates and rollback.** Drags are applied to the board immediately,
but that board is a working copy, not the saved record. A failed save leaves the
working copy exactly as it was, which looks like an optimistic update that was
never rolled back.

**Realtime.** None. No subscription is opened anywhere on this page.

**Offline.** The page cannot load and a save cannot be sent. Nothing is queued.

**Toasts and notifications.** Four: "Changes Saved", "No Changes", "Cannot Remove
Division", and "Update Failed". Up to three at a time, as everywhere. See
[`../foundations/messages-to-the-user.md`](../foundations/messages-to-the-user.md#toasts).

**URL state.** Nothing. Not the season, not the opened card, not edit mode. A
link to `/history` always opens on a fully collapsed page.

**On a phone.** Division panels start closed. Standings become stacked cards with
a power score dial and a four-cell grid of Win%, SOS, Games, and Game%. A team's
name wraps onto up to two lines on its card, and its record stays on the right.
The Season Awards strip is hidden entirely, so three numbers a desktop user sees
are missing. On a season card the months sit under the season name, so the name
keeps its width; from 768 pixels wide they sit beside it. The Full Season Recap
strip is 44 pixels high; from 768 pixels wide it is 41. In edit mode, once there
is a change, the Reset, Cancel and Save Changes buttons wrap onto a second line
when they do not fit below 640 pixels wide, so Save Changes stays on the screen.
From 640 pixels wide they stay in one row. Dragging in edit mode needs a
press-and-hold of about a fifth of a second before it starts, so a normal swipe
still scrolls.

**Accessibility.** The recap strip is a real button and reports whether it is
open. A division header is **not**: it is a plain container with a click handler,
and the only focusable thing in it is the small chevron beside the division name.
The chevron is a real button. It is named "Toggle *division* teams" — for example
"Toggle Competitive teams" — and the name stays the same whether the panel is
open or closed. It reports open or closed separately. A keyboard user can open a
division by landing on that chevron. The division name itself cannot be focused,
and the rest of the header answers only to a click or a tap. Opening a recap
moves no focus and announces nothing.

In an opened recap the crown and the medal are hidden from screen readers. The
champion's row and the runner-up's row carry the word "Champion" or "Runner-up"
instead, which only a screen reader reads. Nothing changes on screen. This holds
for the phone cards and the desktop rows. The coloured Win% and Game% figures and
the champion's crown were changed to read at 4.5 to 1 or better: darker green,
orange and amber in the light theme, and lighter blue and red in the dark theme.
The ratios were measured when the change was made. The desktop rows use the same
colours. The SOS figure and the power score dial were not changed.

**Side effects the user can notice.** Saving a division change rewrites both the
season's standings and the archived team record behind them, so a team's division
label changes anywhere else that reads the archive. Nothing else on the site
moves; power scores and records are untouched.

## Edge cases

- **The active season is on the history page.** The list is not filtered to
  archived seasons, so the current one appears at the top with a green badge. If
  it has no standings recorded yet, opening its recap reads "Season in progress –
  check back later".
- Resolved: **"Learn how seasons work" went nowhere.** The link on the empty state
  pointed at `/rules`, which is not a route in this app, and it was a plain
  anchor, so it reloaded the browser onto the not-found page. Fixed — see
  [B-30](../bug-triage.md#b-30-small-copy-and-labelling-slips). It goes to `/help`
  now, through the router rather than a full page load.
- **Hidden teams are counted but not shown.** Teams in a division named "Hidden"
  are dropped from the division panels and from the team count, but they are still
  included in the match count and in the Highlights panel. A season's "Most Wins"
  can therefore name a team that appears nowhere in the standings below it. **May
  be worth treating as a bug rather than documenting.**
- **The match count is a halved total.** It adds up every team's wins and losses
  and divides by two. A match recorded as a tie counts as neither, so tied matches
  are missing from the total, and hidden teams inflate it.
- **A past season with no standings says so.** The card has no summary panels and
  no team or match line, and its opened recap reads "No standings recorded for
  this season". It used to open to a blank strip that looked broken. The same
  words appear for a past season whose teams are all in a hidden division; that
  card still shows its summary panels and a match count, because both include
  hidden teams. An admin still sees the Edit Divisions button above the message.
  The active season keeps "Season in progress – check back later", and a failed
  load keeps its error with Try Again.
- **Long names wrap, then are cut.** On a season card, a champion's name and a
  highlight value wrap onto up to two lines, and the record and division line
  under a champion wraps onto up to three, so "Intermediate 1" and
  "Intermediate 2" stay different. A longer text is still cut with an ellipsis.
  This holds at every width. On the phone cards of an opened recap a team name
  follows the same rule, with two lines.
- **The rank column is the playoff finish, not the standings position.** Teams
  with no playoff rank sort after those that have one, ordered by match wins, and
  show a dash.
- **Divisions the app does not recognise sort last**, in the order the database
  returned them. A team with no division at all is grouped under "No Division".
- **A season with more than thirty teams in one division** switches that division
  to a windowed list that only draws the rows on screen. Browser find-in-page then
  misses the rest.
- **A part-saved edit is possible.** Changes go in groups of ten and each team is
  written separately. If the fourth group fails, the first three are already
  saved. The toolbar still shows every change as unsaved and the toast reports one
  failure.
- **Adding an empty division and pressing Save reports "No Changes"**, because an
  empty division has no team to write. The division vanishes on the next load.
- **Power score is shown as a number out of 100** here, converted from the stored
  fraction. Two seasons' figures are not necessarily comparable; see
  [`../stats/power-score.md`](../stats/power-score.md).

## Open questions and verification

- **The page fetches every season's standings on arrival, whether or not the
  season is opened.** With enough seasons this is a large number of requests for
  data most users never look at, and none of it is cached between visits. **May be
  worth treating as a bug rather than documenting.**
- Settled: four routes run scroll restoration (`/teams`, `/stats`, `/history`,
  `/insights`), as [`foundations/navigation.md`](../foundations/navigation.md#arrive)
  now says. Whether they restore is the open question: `/history` landed at the top
  in a 2026-11-05 test (see HIST-12).
- Not confirmed by hand: whether opening a division from its chevron by keyboard
  works in practice, or whether the press is swallowed before it reaches the
  header that handles it. A test shows that a click on the named chevron reaches
  the header and flips the panel. No one has pressed it with a keyboard in a
  browser.
- Not confirmed by hand: the History phone polish, which is described in the
  passages above on the phone start state, the chevron, the empty past season, the
  season card layout, the wrapped names, the colours and the edit buttons. It was
  read from the code and its tests, and from the change's own measurements. Those
  notes say that between 640 and about 669 pixels wide (a small phone on its side)
  Save Changes is still clipped at the right edge by up to 30 pixels. This
  document has not re-measured that.
- Not confirmed by hand: what the drag-and-drop board does on a phone in practice,
  and whether the press-and-hold delay is long enough to avoid fighting the scroll.
- Not confirmed by hand: whether an admin editing a season while another admin
  edits the same season produces any visible sign of the collision.
- Not confirmed by hand: how long the whole page takes to settle when the league
  has many seasons.
- Assumption: "🏆 Completed" is meant to mean "this season finished and has a
  champion". It is derived only from a team being flagged as champion, so a
  finished season whose champion was never recorded shows no badge.

Verified against `717rec` commit `ea5c8f4`.
The scroll behaviour changed after that commit: a link now opens the new page at the top ([B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation)). It was measured in a real browser against fake data on 2026-11-05; see [navigation](../foundations/navigation.md#open-questions-and-verification).
The History phone polish changed the passages on the phone start state, the division chevron, the empty past season, the season card layout, the wrapped names, the colours and the edit buttons after that commit.
