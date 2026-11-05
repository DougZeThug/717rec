# Navigation

## Summary

717rec is one page in the browser that swaps its contents as the user moves
around. Every route is loaded on demand the first time it is visited, so moving
to a page the user has not seen yet shows a brief loading message before the page
appears.

This document owns the list of routes, what is in the URL, what a page shows
while it loads, what happens when one fails, and what the app does — and does not
do — about scroll position and focus. Other documents link here.

## The simple case

The user opens the app at `/`. A navigation bar sits at the top of every page; a
footer sits at the bottom. They click "Schedule" and the URL becomes `/schedule`.
For a moment a spinner reading "Loading page..." fills the middle of the screen,
then the schedule appears. Going back to the home page and forward to the
schedule again is instant, because the page has already been fetched.

The browser's back and forward buttons work normally. Nothing the app does can
stop them, and nothing warns before leaving a page with unsaved work.

## The routes

| Route | What it is | Signed out |
| --- | --- | --- |
| `/` | The home dashboard | Readable |
| `/teams` | The teams list | Readable |
| `/teams/:teamId` | One team | Readable |
| `/recap/:seasonSlug/:week` | One weekly recap, for example `/recap/<season>/week-<n>` | Readable |
| `/schedule` | The season schedule | Readable |
| `/stats` | Standings and rankings | Readable |
| `/playoffs` | The bracket | Readable |
| `/history` | Past seasons | Readable |
| `/compare` | Compare two teams | Readable |
| `/insights` | League insights | Readable |
| `/message-board` | The message board | Not guarded; behaviour when signed out is unconfirmed |
| `/my-team` | Manage your team | Not guarded; behaviour when signed out is unconfirmed |
| `/matches/:matchId/live` | A match being scored live | **Readable.** Watching is public; scoring is not |
| `/help` | Help | Readable |
| `/contact` | The contact form | Readable and writable |
| `/join` | Join the League: the league's details and a sign-up button | Readable |
| `/auth` | Sign in and register | Readable |
| `/forgot-password` | Ask for a password-reset email | Readable |
| `/reset-password` | Choose a new password, from the link in that email | Readable |
| `/setup-profile` | Finish your profile | Not guarded |
| `/oauth/consent` | Authorise another app | Not guarded |
| `/admin` | The admin dashboard; redirects to the section last open | **Guarded**: redirects to `/auth` |
| `/admin/:section` | One admin section, e.g. `/admin/scores` | **Guarded**: redirects to `/auth` when signed out |
| `/timeslots` | Nothing of its own; redirects to `/admin/timeslots` | **Guarded**: redirects to `/auth` when signed out |
| anything else | Page not found | Readable |

Only three routes are guarded. See
[`accounts-and-roles.md`](accounts-and-roles.md#how-pages-are-gated) for what
the guard does and why the others are not.

## The interaction, event by event

The unit here is arriving at a route.

```mermaid
stateDiagram-v2
    [*] --> loading : first visit to a route
    loading --> shown : the page's code arrives
    loading --> failed : the page's code or its first render throws
    shown --> loading : navigate to another unvisited route
    shown --> shown : navigate to a route already fetched (instant)
    failed --> loading : press Try Again
```

### Arrive

The URL changes and React Router matches a route. If the page's code has not been
fetched yet, a spinner reading "Loading page..." fills at least 60% of the
viewport height until it arrives.

Three things happen on every arrival, on every route:

- The route is recorded as a pageview, both to Google Analytics and to the
  league's own counter.
- Timing for how long the previous page took is recorded.
- A screen-reader announcement is made naming the new page, and focus is moved to
  the main content area — but **not on the very first page load**, only on
  navigations after it.

**A link opens the new page at the top.** Moving from the bottom of a long
schedule to a short page shows the top of the short page. The reset happens when
the path changes, and only then. A link that names a place on the page (`#match-<id>`
on the schedule, `#career` on a team) then scrolls to that place. The new page used to inherit the old scroll
position, which was a defect; see [B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation). Measured in a real
browser against fake data on 2026-11-05, on the dev server and on the production
build: scrolled 337px down `/schedule`, followed the Help link, arrived at 0.

Browser Back and Forward are not reset, which leaves the browser free to put the
user back where they were. In the same test the page came back **at the top**, not
where it was left, in every case tried but one. Four routes have code of their
own that saves the scroll position and puts it back on Back and Forward:
**`/teams`, `/stats`, `/history`, and `/insights`**. It worked once: `/stats`
after a team page came back at 300 of 300px. After a top-bar link, and for
`/teams`, `/history` and `/insights` in every other case tried, Back landed at 0.
On `/stats` the saved position had been overwritten with 0 as the page was left.
Every other route — the home page, the schedule, a team's page, the playoffs, the
message board, live scoring — does not save or restore its own scroll position; the
schedule came back at the top too. See [Open questions](#open-questions-and-verification).

Nothing is prefilled or focused by arriving, beyond the main-content focus move
above. Three lightweight pages — teams, schedule, and history — are fetched
quietly in the background after the first render, so those three are usually
instant even on a first visit. The heavy pages, stats and playoffs, are
deliberately not, so they show the loading spinner.

### Leave without changing anything

Nothing is recorded beyond the pageview that already happened on arrival. No
page in the app keeps a draft of anything on leaving.

### Begin editing

Not applicable to navigation itself. Individual pages own this.

### While editing

Most page state is held in the page and lost on navigation: sort orders, most
tabs, which panels are expanded, and the scroll position are not in the URL and
cannot be linked to or bookmarked. Several pages do write some state to the
address, so that a view can be linked to, bookmarked or reloaded:

- `/teams/:teamId` and `/matches/:matchId/live` carry a record id. The team page
  also carries the section last chosen on its section bar, as a hash (for example
  `#stats`, `#career`).
- `/admin/:section` carries the open admin section.
- `/schedule` carries the night, the search text and the division and My team
  chips. A link that ends in `#match-<id>` scrolls to that match.
- `/stats` carries the Division / All choice, as `?view=all`.
- `/compare` carries the two teams, as `?team1=` and `?team2=`.
- `/playoffs` carries the season and the open bracket.
- `/auth` and `/setup-profile` carry where to go next, as `?next=`. The consent
  page carries its request number, as `?authorization_id=`.

Two pages also read a value from the address on arrival. The contact form reads
`?type=` (its topic), `?solo=true` (its solo box) and `?source=join_page` (where the
visitor came from). The admin timeslots section takes a night, a team and a slot,
or what the team asked for, that another admin section hands it, and removes them
from the address once it has used them. Each page's own document
says exactly what it writes.

### Submit

Not applicable to navigation itself.

## Modifiers

| Modifier | Set at arrival | Changed while on the page |
| --- | --- | --- |
| The user's role | Decides only whether the three guarded routes render, redirect, or refuse. Every other route renders the same for every role. | Signing out in another tab takes effect here immediately and can remove controls under the cursor. It does not force a redirect off an unguarded page. |
| The record's state | A team and a live match are read from the URL (`/teams/:teamId`, `/matches/:matchId/live`). Compare reads two team ids, the playoffs page a bracket id, and the consent page a request number. For a team or a match, a missing or invalid id gives that page's own empty state, not the 404 page. | No effect on routing. |
| The season's state | No effect on which routes exist. | No effect. |
| Viewport | The navigation bar collapses to a menu on a narrow screen. | Re-flows on rotation. |
| Keys the app honours | **Cmd/Ctrl+K opens a command palette** for searching and jumping to one of nine pages, or to a team by name. It is the app's one global shortcut and it exists only on a screen 768 pixels or wider — on a phone there is no way to reach it. It lives in the top bar as a search icon, whose tooltip names the shortcut. Tab reaches a skip link to the main content first. | The palette can be opened at any time and closed with Escape. |

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | No global effect. There is no global Escape handler. | No global effect; individual dialogs handle their own. |
| In-app navigation away, or switching tab within the page | The new page loads and opens at the top. | **The page's state is discarded with no warning.** No route in the app blocks navigation for unsaved work. Requests already sent still complete, unseen. |
| Browser back or forward | Works normally; the app cannot intercept it. | Same as navigating away. Coming back gives a freshly mounted page, not the one that was left. |
| Reload, or the tab closed | The whole app is re-fetched and re-initialised. Sign-in state survives; everything else does not. | Everything in memory is lost. |
| Network lost mid-request | If the page's own code has not arrived, the loading spinner stays indefinitely — there is no timeout and no error for a chunk that never loads. | Data requests fail and each page reports it in its own way. |
| The request fails or times out | A page whose code fails to load, or whose first render throws, is replaced by the route error screen described below. | Data failures do not reach the error screen; they are the page's own business. |
| The session expires | No effect on unguarded routes. On the three guarded ones, the next visit redirects to `/auth`. | No redirect happens on a page already open. The user finds out when a write fails. |
| The same record changed in another tab, or by another user | No effect on routing. | No effect on routing. |
| Browser autofill or a password manager writes into the form | No effect on routing. | No effect on routing. |
| The window loses focus | No effect. | Returning focus causes cached data older than five minutes to refetch. See [`saving-and-freshness.md`](saving-and-freshness.md). |

After any interrupt the user is wherever the browser put them. The app never
returns a user to an interrupted page. It restores only what the page keeps in the
address (see *While editing*).

## When a page fails

Two different failures produce two different screens.

**A page that fails to load or render** is replaced by a route error screen: a
warning triangle, "Failed to load *page name*", the sentence "Something went
wrong loading this page. You can try again or navigate elsewhere.", and three
buttons — Try Again, Go Back, and Home. In a development build the underlying
error message is shown as well; in the published build it is not. "Home" is a
full page load, not an in-app navigation, so it discards everything.

Either error screen clears on the next in-app navigation. Moving to another page
is a fresh attempt, so the new page renders normally — a single failure does not
follow the reader around for the rest of the visit.

**A URL that matches no route** gives the Page Not Found screen: "Oops! The page
you are looking for does not exist or has been moved.", with Go Home and Go Back
buttons. The attempted address is recorded in the log but not shown to the user.

A **failed data request** produces neither of these. It is handled inside the
page, usually as an empty state and a toast.

## Interactions with other systems

**Permissions and roles.** Only the three guarded routes behave differently by
role. See [`accounts-and-roles.md`](accounts-and-roles.md).

**Season scoping.** The active season is not in the URL of `/schedule`, so a link
to it means "whatever season is active when it is opened". The playoffs page is
the exception: it writes the season into the address. See
[`seasons.md`](seasons.md).

**Validation and error display.** Route parameters are not validated. A malformed
team id reaches the team page, which shows its own not-found state rather than
the 404 route.

**Unsaved changes.** Not handled anywhere in the app. No route blocks navigation.

**Optimistic updates and rollback.** Not applicable to navigation.

**Realtime.** Several routes open a subscription and all of them close it when
the user navigates away. See
[`saving-and-freshness.md`](saving-and-freshness.md#realtime).

**Offline.** Already-fetched pages still navigate. Not-yet-fetched pages hang on
the loading spinner with no error.

**Toasts and notifications.** Toasts survive navigation — a toast raised on one
page is still visible on the next, because there is one toast area for the whole
app.

**URL state.** See *While editing* above for what each page writes to the address.
Sort orders, most tabs, expanded panels and the scroll position are lost on
navigation and cannot be linked to.

**On a phone.** The navigation bar becomes a menu. Everything else is the same.

**Accessibility.** A skip link reaches the main content. Route changes are
announced and move focus to the main content, except on the first load, and the
new page opens at the top, so what is on screen matches where focus went. The
command palette is the only keyboard route to fast navigation and it
is absent below 768 pixels.

**Side effects the user can notice.** Every route change is recorded twice, once
to Google Analytics and once to the league's own pageview counter. In a
development build the analytics call does nothing.

## Edge cases

- **Back and Forward bring a page back at the top, not where it was left.** A
  user who presses Back to `/schedule`, `/teams`, `/history` or `/insights`
  lands at the top; so does `/stats` after a top-bar link. Only `/stats` after
  a team page came back where it was left. The four routes were built to do
  better; see [Open questions](#open-questions-and-verification).
- **A chunk that never downloads leaves the spinner forever.** There is no
  timeout, no retry, and no error.
- **"Home" on the error screen is a full page load**, unlike "Home" anywhere else
  in the app.
- **The first page load does not announce or move focus**, deliberately, so a
  screen reader is not interrupted mid-sentence on arrival.
- **`/playoffs/e2e-bracket-proof` exists** as a test route and is out of scope.
- **A sort order or an expanded panel is lost on every navigation.** Sorting the
  standings table, opening a team, and pressing back gives the default order. The
  schedule's search and chips and the standings view are in the address, so Back
  brings those back.
- **The command palette is desktop-only.** Cmd/Ctrl+K does nothing below 768
  pixels, where the app is most used.
- **Six routes are never in a menu, by design.** `/forgot-password` and
  `/reset-password` are reached from the sign-in form and from an email;
  `/oauth/consent` is reached by another app; the not-found route is reached by
  being wrong; `/join` is reached from the Join the League button on the home
  page; `/recap/:seasonSlug/:week` is reached from the home page's Weekly Recap
  block and from shared links. Three more are reached by a link inside a page rather than
  from the top bar or the tab bar: a team, a live match and an admin section.
  Every other route is offered by the top bar,
  the phone tab bar, the user menu or the palette.

## Open questions and verification

- Settled 2026-11-05: **a link opens the new page at the top.** On 2026-08-25 it
  did not (337px before, 337px after), which was [B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation). Measured again in a real
  browser against fake data, on the dev server and on the production build:
  337px before, 0 after.
- **Open, a suspected bug: the four routes' own scroll restoration mostly does
  not work.** Measured in a real browser against fake data on 2026-11-05, on the
  production build. `/stats`, then a team page, then Back: back at 300 of
  300px. Back landed at 0 in every other case tried: from `/stats` after Help,
  Schedule or Playoffs; from `/teams` after a team, Help or Schedule; from
  `/history` after Help or Schedule; from `/insights` after Help or Schedule.
  The cold and the warm load of the other page made no difference. A probe on
  `/stats`, then Help, showed the saved position overwritten with 0 as the page
  was left. Not tried: `/history` or `/insights` after a team page (the fake
  data has no link to one), Forward, and a real phone. Followed up under [B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation).
- Not confirmed by hand: what `/my-team`, `/message-board`, and `/setup-profile`
  show to a visitor. They have no route guard.
- Not confirmed by hand: whether the post-sign-in redirect returns the user to
  the guarded page they originally asked for.
- "Try Again" on the route error screen recovers when the page renders on the
  second attempt, and re-throws when it does not. Covered by a test.
- Not confirmed by hand: how long the loading spinner is visible in practice on a
  normal connection, and whether it flashes on fast ones.
- Assumption: the three preloaded routes are teams, schedule, and history because
  they are the cheapest, as the code comment says. Not measured.

Verified against `717rec` commit `ea5c8f4`, except the navigation surfaces, which
changed with W11: the desktop pill bar that used to sit under the page content is
gone, the command palette moved into the top bar, Compare and Insights joined the
palette and Help's Quick Navigation, and an admin sees an "Admin" link in the top
bar and the phone menu rather than only in the user menu. The list of what each page
writes to the address (While editing) was read from the code and checked in a real
browser against fake data on 2026-11-05. The routes table now lists every route
in `src/App.tsx` except the dev-only test route. The scroll behaviour changed
after that commit and was measured the same way on 2026-11-05; see [B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation).
