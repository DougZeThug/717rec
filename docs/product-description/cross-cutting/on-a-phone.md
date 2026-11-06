# On a phone

## Summary

This document owns what changes when 717rec is opened on a small screen in a
mobile browser. Every other document assumes a desktop browser and carries one
"On a phone" paragraph; this is where the shared behaviour behind those
paragraphs is written down once.

Most of the app does not change. Layouts re-flow, a few tables become card lists,
and two pieces of navigation swap places. **One surface is designed the other way
round** — live scoring is built for a phone first and merely tolerated on a
desktop — and it has its own six documents starting at
[`../live-scoring/start-a-live-match.md`](../live-scoring/start-a-live-match.md).

The **native app shell is out of scope**, as the README says. This is mobile web,
including the app installed to a home screen.

**Sections dropped.** This document drops the five named phases (**arrive**,
**leave without changing anything**, **begin editing**, **while editing**,
**submit**) and the **Modifiers** table. The viewport is not an interaction; it
is the modifier axis of every other document, so a modifier table here would have
one row and say nothing. The interrupt list is kept in full, because a phone
interrupts differently from a desktop and that is the most useful part of this
document.

## The simple case

A player opens the app on a phone. The top bar keeps the league's name and the
user menu, the notification bell, and the theme button, and folds every link
behind a hamburger. A tab bar appears fixed at the bottom of the screen with four
tabs: Standings, Schedule, Teams, Playoffs. The page above it is padded so the
tab bar never covers its last line.

They tap Teams. The teams list arrives grouped by division rather than in one
long list, because that is the default on a small screen and not on a large one.
They open a team, read it, and press back. `/teams` puts them back where they were:
in a 2026-11-06 test in headless Chromium at 390 pixels wide it did, within 1 pixel,
in every run (see
[navigation](../foundations/navigation.md#open-questions-and-verification)). Safari
and iOS were not tested.

They tap a control that fails. A red panel appears across the **top** of the
screen, not the bottom.

## What changes at 768 pixels

The app has one JavaScript breakpoint: **768 pixels wide**. Below it, the app
calls itself mobile. Above it, desktop. The stylesheet has more breakpoints —
480, 640, 768, 1024, 1280, 1536 — and two of them change what is on the screen:
768 for everything in the table below, and **1024 for the top bar's links alone**.

| Below 768 | From 768 up |
| --- | --- |
| A fixed tab bar at the bottom of the screen, four tabs: Standings, Schedule, Teams, Playoffs | No bottom bar, and nothing replaces it — the top bar is the only navigation |
| No search | A search icon in the top bar, and **Cmd/Ctrl+K** opens a command palette that jumps to nine pages or any of the first ten teams |
| Pages get five extra lines of bottom padding, plus the phone's own safe area, so the tab bar clears the content | Ordinary page padding |
| Toasts fill the width at the top of the screen | Toasts are at most 420 pixels wide, bottom right |
| The teams list defaults to grouped by division | The teams list defaults to one list |
| Several stats and standings tables render as stacked cards | The same data as a table |
| One dialog — playoff team divisions — opens as a bottom drawer | It opens as a centred dialog |

The top bar is the one exception, and it changes later:

| Below 1024 | From 1024 up |
| --- | --- |
| Every navigation link is behind a hamburger button in the top bar | The links sit across the top bar |

Below 1024 the top bar carries the hamburger **and**, beside it, the login or
user menu (which holds the Admin Panel), the notification bell and the theme
button. Only the navigation links fold behind the hamburger.

That gap matters on a tablet. Between 768 and 1023 pixels the bottom tab bar is
already gone, so the top bar is the only complete way around. Before this was
fixed the top bar tried to lay out all nine links at that width and pushed the
login menu, the bell and the theme button off the edge of the screen, with the
hamburger hidden and no way to recover them.

Everything else is the same content at a different width. Wide tables sit in
their own box and scroll sideways inside it rather than stretching the page; the
page itself never scrolls sideways.

The command palette is worth naming plainly: **the app's only keyboard shortcut
exists only on a screen 768 pixels or wider**, because the component that listens
for it is not rendered below that. It lives in the top bar, beside the hamburger
on a tablet and after the links on a desktop.

## Crossing the line while using the app

The breakpoint is watched live, not read once. Rotating a large phone into
landscape can push it past 768 pixels, and when that happens the bottom tab bar
disappears and the top bar's Search button appears **while the user is looking at
the page**. Nothing replaces the tab bar; every link is behind the hamburger
until 1024 pixels. Nothing is lost — no page state is tied to the breakpoint —
but the controls move out from under the thumb. The hamburger does **not** go with them: it stays
until 1024 pixels, so a phone in landscape keeps a way to reach every link.

```mermaid
stateDiagram-v2
    [*] --> narrow : the browser is under 768 pixels wide
    [*] --> tablet : the browser is 768 to 1023 pixels wide
    [*] --> wide : the browser is 1024 pixels or wider
    narrow --> tablet : rotate to landscape, or resize
    tablet --> wide : resize wider
    wide --> tablet : resize narrower
    tablet --> narrow : rotate to portrait, or resize
    narrow --> menu_open : tap the hamburger
    tablet --> menu_open : tap the hamburger
    menu_open --> narrow : tap it again, navigate, or press Escape
    menu_open --> wide : resize past 1024 while the menu is open (the menu is now hidden, not closed)
```

Rotating back does the reverse. The hamburger menu, if open, closes on the next
route change but not on rotation, so it can be left open in a layout that no
longer shows it.

## The one screen built for a phone

Live scoring is the exception to everything above. It is a single narrow column
of large controls with generous padding at the bottom for a thumb, and on a wide
screen it stays a narrow column in the middle rather than spreading out. Every
control on it is at least 44 pixels tall. It is also the only screen that keeps
an open connection to the league, so two phones scoring the same match stay in
step. Its six documents start at
[`../live-scoring/start-a-live-match.md`](../live-scoring/start-a-live-match.md).

## Touch and reach

- The hamburger button is 44 by 44 pixels. Every control on the live scoring
  screen is at least 44 pixels tall. So are nearly all the controls in the admin
  console, measured at 390 and 320 pixels wide: the Sections drawer's search box
  and group headings, the clear-search cross, every select box (they were 40
  pixels, and five of them set their own 24 to 40), every tab, the theme button in the top
  bar, the calendar's month arrows, the close cross of a dialog, the small round
  and remove buttons (the remove-signup, hero card remove and reaction picker
  buttons are pinned by tests, not measured in a browser), the text fields that once set their own height, and the
  block buttons in Timeslots and the Scores time-slot headers. A switch or a
  checkbox looks the same as before and has an invisible 44-pixel tap area. In a
  list of options or a menu, each row is 44 pixels tall on a touch screen; a
  mouse keeps the 36-pixel row. The four Scores result buttons (2–0, 2–1, 1–2,
  0–2) sit in one row from 342 pixels wide and in two rows of two below that, so
  each is at least 44 pixels wide on a 320-pixel phone (it was 38.5).
  The Full Season Recap strip on each history card is 44 pixels high on a phone
  too (41 from 768 pixels wide; it was 33 on a phone). So is the tap area of a
  team name on a history phone card or table row, which is a link. On the
  Champions panel it is about 27 pixels high, because the rows there are only 6
  pixels apart.
- A few controls are still under 44 pixels, on purpose: the day cells of a
  calendar are 36 pixels wide and 44 tall (seven must fit a 320-pixel phone), the
  two Auto Schedule switches that sit one above the other share the 36-pixel gap
  between them, the Auto Schedule team checkbox has a tap area 30 pixels wide (its
  scrolling list cuts the left side, and the team name beside it toggles the same
  box), and the small clear cross inside a multi-select was left alone.
  The select box, tab, switch, checkbox, close cross and small buttons are shared
  pieces, so they have the same size on the public pages. The home page's "Score
  live" button, the schedule card's live-score and recap buttons and the recap
  dialog's "Open full recap" link are 44 pixels tall too (they were 40). Only the
  admin console was scanned control by control; the public pages were not.
- Other controls are whatever size the component library gives, which is
  smaller — but no row is now under **24 pixels**, the accessibility floor. The rows raised to it are the home page's
  weekly-recap team links, the teams page's Sort/View/Style row, a team page's
  last-match and head-to-head rows, and the footer's two links, all of which
  were 16 to 20 pixels.
- **Nothing in these places runs past the screen edge on a 320-pixel phone.** A
  select box's list is never wider than the screen, so a long option name wraps
  instead of being cut off. The bell's panel is never taller than the screen and
  scrolls inside, a long notification title wraps and a long list scrolls to its
  end. A Member Approvals request card is the screen width minus the page
  margins, and a long name with no spaces breaks. A long email, name or team
  in the contact inbox wraps inside its card. The team logo in Update Logos shows
  whole (the box showed only the middle 80 of 144 pixels). The My Team edit row
  drops its text under the logo when it would have less than 128 pixels, and the
  long team ID breaks. These are measured in a real browser against fake data,
  not on a real phone.
- **No label is under 12 pixels** on the home page, the standings, the teams
  list or history. Labels there were 9 to 11 pixels, which is unreadable in a
  bar. The schedule's weekday strip and the playoff bracket's participant names
  are still smaller; they are tracked separately.
- The phone's safe areas are honoured in the top bar, the bottom tab bar and the
  padding under every page. A notch or a home indicator does not sit over them.
  The playoffs page has no bottom bar of its own.
- The bottom tab bar reaches four of the app's twenty-four routes. The hamburger reaches
  the other main pages — the message board, history, help, contact, and Admin for
  an admin — and the user menu reaches my team, the message board and the profile.
  A team, a weekly recap, a live match, Join and the password pages are in
  neither: a link or button inside another page opens them. Insights and compare
  are in neither menu, and the command palette does not exist below 768 pixels. On
  a phone they open from buttons inside pages: Insights from the standings
  header, Compare from the "Compare Team" button on each standings card, and both
  from Help's Quick Navigation.
- The message board puts its list in a fixed-height scrolling box sized from the
  viewport, so the page has a scroller inside a scroller. On a phone the outer
  page barely moves and the inner list does the scrolling.

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | A phone keyboard has no Escape, so on a phone nothing can be cancelled by key; only by tapping a Cancel or Close control. **The hamburger menu has no close-by-tapping-away** — it closes on a route change or by pressing the button again. It does close on Escape, which reaches it from an attached keyboard but not from a touch keyboard. | Same. A dialog's Cancel button works; there is no key that reaches it. |
| In-app navigation away, or switching tab within the page | A link to another page loads it and opens it at the top; switching a tab within the page keeps the scroll position (pressing Tab afterwards moves focus into the tab panel, and the browser scrolls it into view if it is hidden). Back puts `/teams`, `/stats`, `/history` and `/insights` back where they were (except when a page's data arrives late: the restore stops watching after one quiet second, three at most; see [navigation](../foundations/navigation.md#open-questions-and-verification)), and every other page wherever the browser puts it. Measured 2026-11-06 for `/teams` at 390 pixels wide in headless Chromium with fake data: within 1 pixel in every run. The fix is on this branch and not yet live. Safari, iOS, and a real phone's back swipe were not tried. | Everything typed is lost with no warning, exactly as on a desktop. |
| Browser back or forward | The gesture-based back swipe is the browser's, and the app cannot intercept it. It behaves as an in-app navigation. | Same. On a phone this is the most likely way work is lost, because the swipe is easy to trigger by accident. |
| Reload, or the tab closed | Everything in memory is lost and every page refetches. A mobile browser closing a background tab to save memory looks identical to a reload when the user comes back. | A sent write still lands. An unsent one is gone. |
| Network lost mid-request | Nothing to lose. Cached data stays on screen and looks current, which on a phone at a venue is the common case. | The request fails and is lost. **Nothing is queued.** This matters most during live scoring, which is the one thing done on a phone at a place with poor signal. |
| The request fails or times out | A read retries once, then falls back to the page's own state. | One red toast across the top of the screen, covering the top bar while it is there. |
| The session expires | Public pages keep working. | Writes fail. A phone left in a pocket for hours is the most likely place for a session to lapse, and nothing says so. |
| The same record changed in another tab, or by another user | The screens that hold a realtime channel find out; standings, records, and the schedule do not. Two phones at the same live match stay in step, which is the design. | Same. Two phones editing anything without a channel overwrite each other silently. |
| Browser autofill or a password manager writes into the form | Mobile keyboards and password managers fill fields the same way as on a desktop, including the contact form's hidden bot trap. | Same. |
| The window loses focus | Switching apps suspends the tab. Coming back refetches anything past its fresh window, so numbers change as the app is re-opened — far more visible on a phone than on a desktop, because backgrounding is constant. | The request continues while the app is in the background if the browser allows it, and its toast is waiting when the user returns. |

After any interrupt the user is wherever the browser put them, on the page the
browser chose, scrolled wherever they were before.

## Interactions with other systems

**Permissions and roles.** Identical on every screen size. The route into `/admin`
is the user menu, which on a phone sits beside the hamburger. See
[`permissions.md`](permissions.md).

**Season scoping.** No difference.

**Validation and error display.** Field errors appear under fields as they do on
a desktop. Long forms stack rather than sitting side by side.

**Unsaved changes.** Unprotected, and more exposed: a back swipe, an incoming
call, or the browser reclaiming a background tab all discard typed work with no
warning.

**Optimistic updates and rollback.** No difference.

**Realtime.** Channels drop and rebuild far more often on a phone, because
backgrounding an app closes them. Each reconnection refetches, so a short drop is
invisible; only live scoring shows the connection's state while it is down.

**Offline.** No difference in behaviour, and much more likely to happen. See
[`errors-and-offline.md`](errors-and-offline.md).

**Toasts and notifications.** On a narrow screen a toast is full width at the top
of the screen. It covers the top bar and the page heading while it is there, not
the submit button at the bottom.

**URL state.** A phone adds nothing to the URL. Sharing a page from a phone shares
what the page keeps in the address (see
[`foundations/navigation.md`](../foundations/navigation.md#while-editing)), for
example the schedule's night, search and chips, the standings view, a comparison, the playoffs
season and bracket. A sort order, an open tab or an expanded panel is not shared.

**On a phone.** This document is the definition.

**Accessibility.** Touch target sizes are set deliberately on live scoring, the
hamburger, the history recap strip, the history team-name links and nearly all of
the admin console, at 44 pixels,
and to a 24-pixel floor on the rows listed under
[Touch and reach](#touch-and-reach). See
[`accessibility.md`](accessibility.md).

**Side effects the user can notice.** Every pageview is recorded with a coarse
device class — iOS, Android, other mobile, or desktop — so the league can see how
much of its traffic is phones. Nothing more precise is stored. See
[`what-the-league-sees.md`](what-the-league-sees.md).

## Edge cases

- **The message board's "Sign in to post messages" bar sits at the very bottom of
  the screen, underneath the fixed tab bar**, because it positions itself against
  a spacing value that is never defined anywhere in the app. A signed-out visitor
  on a phone probably cannot see or tap it. **May be worth treating as a bug
  rather than documenting.**
- **A link opens the new page at the top**, which matters most on a phone: a long
  schedule followed by a short page no longer leaves a blank screen ([B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation),
  fixed). On the way the position passes through two in-between values; see [navigation](../foundations/navigation.md#arrive).
  Back restores the old position on the four routes that save it, and passed every case measured on
  this branch except the late-data stress run (not yet live; not every case failed before it); see [navigation](../foundations/navigation.md#open-questions-and-verification).
- **A large phone in landscape is a desktop** as far as the app is concerned, so
  the bottom tab bar vanishes at an angle rather than at a device.
- **The command palette's keyboard shortcut is unreachable on a phone**, which is
  harmless, but so is the Search button — there is no search anywhere below 768
  pixels.
- **Only one dialog in the app becomes a drawer.** Every other dialog is a
  centred modal on a phone, including the live scoring confirmations.
- **The teams page remembers its scroll position, and in the 2026-11-06 test it
  came back to it every time** (headless Chromium, 390 pixels wide, fake data; the
  fix is on this branch and not yet live). Safari, iOS and a real phone were not
  tested.
- **A backgrounded tab that the browser discards** returns as a cold load: the
  cache is gone, every page refetches, and any unsaved work is gone with it.
- **Winter theme adds two hundred animated snowflakes** to the home page, which
  is a battery and motion cost paid on a phone as well as a desktop — unless the
  phone asks for reduced motion, which now switches them off. See
  [`accessibility.md`](accessibility.md).

## Open questions and verification

- **The sign-in bar on the message board is very likely hidden behind the bottom
  tab bar on a phone.** Read from the positioning value and the absence of the
  variable it depends on; not seen on a device.
- **Toasts appear at the top on a narrow screen, not the bottom.**
  [`foundations/messages-to-the-user.md`](../foundations/messages-to-the-user.md)
  says a toast could cover a submit button at the bottom of a small screen. It
  cannot: below 640 pixels the toast is pinned to the top and covers the header
  instead. The foundation is the document that needs the correction.
- Not confirmed by hand: whether the layout swap at 768 pixels is smooth when a
  phone is rotated, or whether it flashes.
- Not confirmed by hand: which stats and standings tables become cards and which
  stay tables. Several components branch on the breakpoint; the list was not
  enumerated.
- Not confirmed by hand: whether any page scrolls sideways on a narrow screen.
  The app shell and every table wrapper prevent it, but no page was measured.
- Not confirmed by hand: how the app behaves when installed to a home screen and
  opened with no connection.
- Not confirmed by hand: whether touch targets on the public pages meet the
  44-pixel guideline. The admin console was scanned control by control (390 and
  320 pixels wide, fake data); the public pages were not. Live scoring, the
  hamburger, the bracket admin menu and its seeding drag handle, the history
  recap strip, the history team-name links and the shared pieces named under
  Touch and reach (select box, tab, switch, checkbox, close cross, small buttons)
  set it explicitly; the rows listed above
  meet the lower 24-pixel floor, not 44. Not tested on a real phone.
- Assumption: nothing in the product reads device orientation directly. Only the
  width is watched.

Verified against `717rec` commit `ea5c8f4`, except the reduced-motion,
hamburger-menu, and bracket admin behaviour above, all changed after that
commit — see
[B-22](../bug-triage.md#b-22-reduced-motion-is-honoured-in-one-stylesheet-and-ignored-everywhere-else),
[B-23](../bug-triage.md#b-23-the-mobile-menu-is-not-a-dialog)
and [B-24](../bug-triage.md#b-24-bracket-administration-is-unreachable-on-a-phone).
The scroll behaviour changed after that commit: a link now opens the new page at the top ([B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation)). It was measured in a real browser against fake data on 2026-11-05; see [navigation](../foundations/navigation.md#open-questions-and-verification).
The restore of the scroll position on Back changed again on this branch (not yet live) and was measured on 2026-11-06; the opening story, the interrupt table and the edge cases describe it.
The 44-pixel controls in the admin console, listed under Touch and reach, changed after that commit too (the admin phone polish). So did the 44-pixel history recap strip (the History phone polish). The 44-pixel tap area of the history team-name links was added after it too.
The tap-size fixes (commits `96b6036` to `8626e6c`) changed the first two bullets under Touch and reach, and the phone-overflow fixes (commits `2af1fa1` to `e3a8bdd`) added the bullet that starts "Nothing in these places", after that commit. They were measured in a real browser against fake data, not on a real phone or tablet. The three 44-pixel buttons named there came later, in commit `fd5d43a`; they are pinned by tests and were not measured in a browser.
