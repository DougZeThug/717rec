# The playoffs page

## Summary

`/playoffs` is where the league's brackets live. It is a read-only page for
everybody except an admin: it lists the brackets for one season, grouped by
division, and opens one of them into a drawn bracket. It is the only page other
than live scoring that updates under the user without a refresh.

The page picks its own season. There is no "current playoffs" flag it reads on
arrival — a season in the address wins, then the season of the bracket the link
opens, then the season whose playoffs are still running, then the active season.
A season picker appears only when the league has more than one season on record.

This document owns arriving at `/playoffs`, choosing a season, choosing a
bracket, and every state the page can be in across a season. How the bracket
itself is drawn is owned by [`read-a-bracket.md`](read-a-bracket.md). The blind
draw is a different thing entirely and lives somewhere else; see
[`blind-draw-signup.md`](blind-draw-signup.md). Everything an admin does here is
in [`admin/run-the-playoffs.md`](../admin/run-the-playoffs.md).

## The simple case

A player opens `/playoffs`. The page shows a heading, "Playoffs", and a line
under it reading "Tournament brackets and playoff schedules". A "Season:"
dropdown sits under that line. It is in the same place on every screen size.

Below that is one card per division, strongest division first. Each card names
the division, says how many brackets it has, and lists them. Each bracket shows
its name, its format, and one button: "View Live Bracket", or "View Final
Results" once the bracket is finished.

Pressing the button replaces the list with the drawn bracket and adds
`?bracket=<id>` to the address. Pressing browser back returns to the list.

Out of playoff season the same page shows the same division cards, and each one
answers the question the reader actually has. Under the heading **"Projected
seeds"** the card lists every team in that division in seed order — rank, name,
and power score — followed by one line: "Brackets open after week 10. The order
follows the Power Score today. It can still change." Under the list is a link,
"See the full standings", to `/stats`.

The week number comes from the season's end date. A season with no end date on
record says "Brackets open when the regular season ends." instead, with no number.

This happens **only on the active season**. Power scores are the season being
played and carry no season of their own, so on any other season — and while the
rankings are still loading, or if they fail — the card falls back to the old
message, "No brackets yet for this division", and nothing else.

## The interaction, event by event

```mermaid
stateDiagram-v2
    [*] --> loading : open /playoffs
    loading --> list : brackets and divisions arrived
    loading --> empty : no divisions to show
    list --> opening : press View Live Bracket (adds ?bracket=<id>)
    opening --> detail : the bracket arrived
    opening --> list : nothing to draw (a legacy bracket), or Back to brackets
    detail --> list : browser back, or Back to brackets
    list --> failed : a list request failed
    failed --> list : press Try again
    opening --> failed : the chosen bracket failed to load
    list --> list : change season (reloads the list)
```

### Arrive

Four things load at once: the list of seasons, the season whose playoffs are
active, the active season, and the divisions. The bracket list waits for a
season to be chosen, then loads.

The season is chosen for the user in this order: **`?season=` in the address**,
then **the season of the bracket in `?bracket=`**, then **the season with
playoffs active**, then **the active season**. The page waits until both answers
are back before choosing between the last two, so a cached active season cannot
win the race against a still-loading playoff season.

A link to a bracket waits for that bracket to load before choosing, so the picker
never shows one season and then changes to another under the reader. It waits for
the request to finish, not for a season to appear on it: an old bracket can
resolve with no season at all, and the page then falls back to the automatic
choice. A bracket that fails to load does the same.

However it is chosen, the season ends up in the address as `?season=<id>`, so a
copied link opens the same view. A season the page worked out for itself
replaces the current history entry, adding no step to go back through; a season
**chosen from the picker** adds one, like choosing a bracket does.

The address stays in charge after that. Back and Forward change the params
without reloading the page, and the season follows them — back to the previous
season, forward to the one just left — rather than the page rewriting the
address to the season it happens to be holding.

> **Technical note:** `/stats` resolves the same pair the other way round —
> active season first. That is deliberate. The standings should follow the new
> season as soon as it is activated; the playoffs page should keep showing the
> bracket that is still being played.

While the brackets, the divisions, or the admin check are still loading, the
whole body of the page is replaced by a spinner reading "Loading...". The
heading and the season picker stay.

The bracket list itself is deliberately never cached: it is refetched every time
the page mounts. A bracket created or deleted elsewhere therefore appears or
disappears on the next visit rather than up to five minutes later.

**Nothing is written by arriving.** No pageview beyond the ordinary one, no
record that a bracket was looked at.

If the league has switched the Challonge fallback on, a block of embedded
Challonge brackets appears above the list whenever no bracket is selected. It has
its own heading, its own subtitle, and an "Expand All" button; each bracket is a
collapsed panel that opens into an embedded frame from `challonge.com`. It is
read-only and it comes from outside the app.

### Leave without changing anything

Nothing is recorded and nothing is kept. The realtime subscription, if one was
open, closes. Coming back re-runs the whole load.

What survives is the address: a link carrying `?bracket=<id>` opens straight to
that bracket, and `?season=<id>` opens that season. The page adds `?season=<id>`
itself, so a link to a bracket carries its season too. Nothing else about the
page is in the URL, not even the admin tab.

### Begin editing

There is no editing here for a player. The page has three kinds of control: the
season dropdown, the per-bracket buttons and, above an open bracket, a "Back to
brackets" button. None of them makes the page dirty, because none is a form.

An admin sees more: a Brackets/Teams tab strip, a Create Bracket button on an
empty division, a Delete button beside each bracket, and — inside a bracket — a
row of admin tools. Those are owned by
[`admin/run-the-playoffs.md`](../admin/run-the-playoffs.md).

### While editing

Changing the season reloads the bracket list for that season. The choice goes
into the address as `?season=<id>` and adds one step to go back through, so it
survives a reload and a copied link opens the same season. It also closes any
open bracket and removes `?bracket=` from the address, because that bracket
belongs to the season being left. The season is not kept in storage: the address
is its only memory.

Choosing a bracket does three things at once: it sets `?bracket=<id>`, it starts
loading that bracket, and it starts a realtime subscription to that bracket's
matches. The page scrolls to the top. While the bracket loads, it shows a spinner
reading "Loading bracket..." in place of the list. A bracket that was on screen in
the last five minutes is still in the cache and opens at once. The drawn bracket
replaces the spinner when the data has arrived and its id matches the one asked
for. If the load fails, the list comes back with a "Loading bracket" banner above
it.

A "Back to brackets" button sits above the spinner, and then above the drawn
bracket. Pressing it clears `?bracket=<id>`, shows the division list and scrolls
to the top. The admin Brackets tab has the same button above an open bracket. It
has no spinner: the list stays until the bracket arrives. The "Loading bracket"
error banner has its own "Back to brackets" button, so the new button is not drawn
while that banner shows. The page never has two.

Opening a bracket adds a step to the browser history. Closing one replaces that
step, so the browser Back button does not open it again. This covers both "Back to
brackets" buttons and a delete. Changing the season still adds a step. See
[Cancel and interrupt](#cancel-and-interrupt).

When the subscription is live, a green signal sits in the bottom-right corner. On
a screen 768 pixels wide or more it is a small pill reading "Live updates
enabled". On a phone it is only a pulsing green dot, above the tab bar. The dot
covers far less of the bracket than the pill did. A tap on the dot goes through
to whatever is under it. A screen reader still hears the words.

A score entered by an admin anywhere else arrives within a second or two: the
bracket redraws and a toast says "Bracket Updated — Match scores have been
updated." One admin save writes several rows; the page collapses that burst into
a single refresh and a single toast.

### Submit

Not applicable. A player commits nothing on this page. The only writes here are
admin writes.

## Modifiers

| Modifier | Set at arrival | Changed while editing |
| --- | --- | --- |
| The user's role | A visitor and a player see the same page. An admin sees the Brackets/Teams tabs, the create/delete controls, and the bracket's admin toolbar. The page shows the loading spinner until the admin check resolves, so the controls never flash in and out. | Admin granted or revoked elsewhere does not reach this page until it refetches. The controls stay as they were and the database quietly starts or stops accepting the writes behind them. |
| The record's state | A bracket's state decides its button and its badge: pending and in-progress read "View Live Bracket", completed reads "View Final Results" and carries a grey "Completed" badge. A bracket not built with the current engine carries a "Legacy" badge. | A bracket completing while the page is open changes the drawn bracket over realtime, but the list behind it keeps the old button until the page refetches. |
| The season's state | The page prefers a season named in the address, then the open bracket's own season, then the season with playoffs active, then the active season. When the last two differ, a banner says so by name. An archived season is selectable and shows its brackets frozen. | Changing the season in the dropdown reloads the list and closes any open bracket, because that bracket belongs to the season being left. |
| Viewport | The season picker sits under the heading on every screen size. On a wide screen the admin toolbar buttons are a row. On a phone they collapse into one **⋯** menu. | No effect beyond re-flowing on rotation. |
| Keys the page honours | Nothing is focused on arrival and there are no shortcuts. Tab reaches the season dropdown, then each bracket button in turn. With a bracket open, it reaches "Back to brackets" right after the dropdown. | Escape closes the season dropdown. Arrow keys move within it. Nothing else. |

The season picker is **absent, not disabled**, when the league has one season or
none. A league in its first season therefore never sees it.

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | No effect. There is no Cancel on this page. | Closes the season dropdown if it is open. It does not close an open bracket. The "Back to brackets" button above the bracket and browser back are the ways out of one. |
| In-app navigation away, or switching tab within the page | Nothing is lost, because nothing was entered. The realtime subscription closes. | The admin's Brackets/Teams choice is remembered for the browser session and restored on return. The chosen season is not. An in-flight load is abandoned. |
| Browser back or forward | Returns to the previous page. Nothing is recorded. | Back from an open bracket removes `?bracket=<id>` and returns to the list, which is the intended way out. Forward re-opens it. Closing a bracket replaces its history step instead of adding one. This covers both "Back to brackets" buttons and a delete. So Back does not open that bracket again. After one open and close, the first Back press lands on the earlier list step and shows no change, and the next press leaves the page. Each further open and close leaves one more such step. A link that opened straight on a bracket has one step, so Back leaves at once. Changing the season still adds a step: Back then brings back the bracket from the earlier season. Back over a season chosen from the picker restores the previous season, and the picker follows. Scroll position is not restored on this route. |
| Reload, or the tab closed | Reloads the page from scratch. | The bracket and the season are both in the address, so a reload returns to the same bracket under the same season. |
| Network lost mid-request | The page shows its loading spinner and then the failure banners for whichever request failed. | The realtime pill (a dot on a phone) disappears. The bracket keeps showing what it last had. Nothing is queued; the next refetch recovers. |
| The request fails or times out | Each failing request gets its own banner, stacked above the list: "Loading brackets" and "Loading divisions" for the list, "Loading bracket" for the chosen one. The brackets banner has a "Try again" button. | The chosen bracket failing shows a "Loading bracket" banner with both "Try again" and "Back to brackets". **"Back to brackets" is the only thing that clears `?bracket=<id>`**, so without it a reload just retries the same broken bracket forever. |
| The session expires | No effect. Everything on this page is public to read. | No effect for a player. An admin keeps seeing the admin controls and their next write fails. |
| The same record changed in another tab, or by another user | Not applicable before arriving. | **This is normal here, not an edge case.** With a bracket open, a score entered by an admin arrives over realtime and the bracket redraws with a toast. The bracket *list* has no subscription: a bracket created, renamed, or deleted elsewhere is invisible until the page is remounted. |
| Browser autofill or a password manager writes into the form | No effect. There are no text fields on this page. | No effect. |
| The window loses focus | No effect. | The realtime subscription stays open in the background. Neither the bracket nor the list refetches on focus returning — both have that switched off — so returning to the tab shows whatever realtime delivered, and nothing else. |

After any interrupt the page rebuilds itself from the address and from the
automatic season choice. Apart from the bracket and the season, which the
address holds, nothing the user picked is remembered.

## Interactions with other systems

**Permissions and roles.** Reading needs nothing at all. Every write on this page
is admin-only, and each control is hidden rather than disabled for everyone else.
See [`cross-cutting/permissions.md`](../cross-cutting/permissions.md).

**Season scoping.** The bracket list is scoped to one season on the server. The
page takes the season from `?season=` in the address first, then from the season
of the bracket in `?bracket=`, then from the season with playoffs active, then
from the active season, and writes the one it took back to the address. See
[`foundations/seasons.md`](../foundations/seasons.md).

**Validation and error display.** Nothing to validate. Failures appear as
stacked banners above the list rather than as toasts, each naming what failed.

**Unsaved changes.** None. Nothing on this page can be half-done.

**Optimistic updates and rollback.** None for a player. An admin's score save is
optimistic; see [`admin/run-the-playoffs.md`](../admin/run-the-playoffs.md).

**Realtime.** Present, and the only place outside live scoring where it is. Two
subscriptions open once a bracket is chosen: one watches that bracket's matches
and refreshes the drawing, one watches the bracket itself and announces
"Tournament Complete! Final standings have been calculated." when it finishes.
Both reconnect by themselves and refetch on reconnecting.

**Offline.** The page cannot load and shows its failure banners. Nothing is
cached for offline use and nothing is queued.

**Toasts and notifications.** Three toasts can appear here without any action
from the user: "Bracket Updated", "Tournament Complete!", and — for an admin —
the result of a save. Nothing about the playoffs is pushed outside the app.

**URL state.** `?bracket=<id>` and `?season=<id>`. The admin tab and the scroll
position are lost on navigation. A link carries its season, so a link shared
during one season opens the same season's brackets later. A link with no
`?season=` and no bracket opens on the automatic choice.

**On a phone.** The season picker stays where it is, under the heading. The admin
toolbar inside a bracket collapses into a single **⋯** menu, so an admin on a
phone can repair, reseed, rearrange, edit, and delete a bracket as well as view
it. See
[`cross-cutting/on-a-phone.md`](../cross-cutting/on-a-phone.md).

**Accessibility.** The season dropdown has a real label. The drawn bracket is a
labelled region. The failure banners are alerts. The "Loading bracket..." spinner
is announced as a status. The bracket that then replaces it is not announced — a
screen reader user is moved to new content with no warning that it happened.

**Side effects the user can notice.** None from viewing. Opening a bracket
preloads its data into the cache, which is why a bracket that was on screen in the
last five minutes opens again instantly.

## Edge cases

- **A bracket that predates the current engine cannot be opened.** Its row shows
  a "Legacy" badge and a working button, but the loader returns nothing for it
  and no error is raised. The page shows "Loading bracket..." for a moment, then
  shows the list again, with `?bracket=<id>` now in the address. Nothing tells
  the user what happened. See
  [Open questions](#open-questions-and-verification).
- **The season shown and the season being played can differ**, and the page says
  so: "Showing *X* playoffs — regular season play is on *Y*." That banner appears
  only when both seasons exist, differ, and the playoff one is selected.
- **Divisions come out strongest first** because they are ordered by division
  weight. Nothing labels them as ordered.
- **A division with no bracket still gets a card.** On the active season it
  lists that division's projected seeds and links to the standings. On any other
  season, and whenever the rankings are unavailable, it reads "No brackets yet
  for this division" and offers nothing to press.
- **A division with no teams** reads "No brackets yet for this division" even on
  the active season — there is nothing to seed.
- **With no divisions at all**, the whole list is replaced by one empty state:
  "No Playoff Brackets Yet — Playoff brackets will appear here once they're
  created. Check back during playoff season!"
- **The Challonge block and a native bracket never appear together.** Choosing
  any bracket hides the Challonge block completely.
- **A deleted bracket still in the address** shows the bracket's own empty state
  rather than a failure: "No bracket selected — Choose a bracket from the list
  above", with the attempted id printed underneath.
- **Two seasons with playoffs active** is refused outright: the season lookup
  throws, and the page falls back to whatever it can show.

## Open questions and verification

- **A legacy bracket's "View Live Bracket" button does nothing visible.** The
  loader returns null for any bracket not built with the current engine. The page
  adds `?bracket=<id>` to the address and shows "Loading bracket..." for a
  moment. Then it shows the list again at the top, with no message at all. This
  was read from the code and not seen in a browser. The row already carries a
  "Legacy" badge, so the state is known.
  **May be worth treating as a bug rather than documenting.**
- **Realtime here contradicts the foundations.**
  [`foundations/saving-and-freshness.md`](../foundations/saving-and-freshness.md)
  says realtime exists only on live scoring. This page opens two subscriptions
  and shows a "Live updates enabled" pill (a dot on a phone). The foundation needs
  correcting.
- **No route resets scroll position, but `/stats`, `/insights` and `/history`
  restore it and `/playoffs` does not.** Returning to a long bracket list by
  browser back leaves the user wherever the browser puts them.
- Not confirmed by hand: how long the "Loading..." spinner is visible in
  practice, and whether the admin check is what usually holds it.
- Not confirmed by hand: whether the Challonge embed renders at all on a phone,
  and whether its fixed 500-pixel frame is usable there.
- Not confirmed by hand: what the page shows when the league has no active
  season and no season with playoffs active.
- Assumption: the automatic season choice is meant to be invisible. Nothing in
  the page explains it, and the only sign is the overlap banner.

Verified against `717rec` commit `ea5c8f4`, except the wait after "View Live
Bracket", the "Back to brackets" button above an open bracket, the phone "Live
updates" dot and the history step that closing a bracket replaces. All four
changed after that commit. None is a triaged bug. The season picker is described
as the code has it now: under the heading on every screen size. The season in
the address (`?season=<id>`, written by the page, set by the picker and kept on
reload) was read from the code and checked in a real browser against fake data
on 2026-11-05.
