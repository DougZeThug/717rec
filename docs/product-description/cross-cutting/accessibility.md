# Accessibility

## Summary

This document owns how 717rec behaves for somebody using a keyboard, a screen
reader, a reduced-motion setting, or a screen they cannot read at low contrast.
Every other document carries one "Accessibility" paragraph; this is the shared
behaviour behind them.

The picture is uneven and it is worth stating plainly at the top. **Structure is
good**: real labels, real buttons, a skip link, route announcements, focus moved
on navigation, and an accessibility scan that blocks merges. **Change is bad**:
almost nothing that changes on its own is announced, and the whole app ignores a
reduced-motion setting except inside the playoff bracket.

**Sections dropped.** This document drops the five named phases (**arrive**,
**leave without changing anything**, **begin editing**, **while editing**,
**submit**) and the **Modifiers** table. Accessibility is a property of every
interaction rather than one of its own, and its modifier axis — assistive
technology — is the subject of the whole document rather than a row in a table.
The state diagram, the full interrupt list, and the cross-cutting list are kept.

## The simple case

Somebody arrives with a keyboard. The first Tab reveals a "Skip to main content"
link that is invisible until it is focused. Tab again and they are in the top
bar. Every control has a visible focus ring: two pixels, offset from the control,
in the theme's ring colour.

They activate a navigation link. The page changes. A visually hidden live region
says "Schedule page", and focus moves to the page's main content area, so the
next Tab lands inside the new page rather than back at the top of the browser.
The page does **not** scroll to the top, so what is announced and what is on
screen can be two different things.

They open a dialog. Focus goes into it, Escape closes it, and focus returns.
Every dialog, dropdown, popover, and select in the app behaves this way, because
they all come from the same component library.

## Keyboard

**What works.** A skip link, first in tab order, jumping to the main content. A
visible focus ring on everything focusable. Every score button, filter, and menu
item reachable by Tab. Dialogs, dropdown menus, popovers, selects, and the bottom
drawer all trap focus, close on Escape, and restore focus afterwards.

**The one shortcut.** Cmd/Ctrl+K opens a command palette that jumps to seven
pages or to a team by name. It exists only on a screen 768 pixels or wider,
because the component that listens for the key is not rendered below that; see
[`on-a-phone.md`](on-a-phone.md). There are no other keyboard shortcuts anywhere.

**Where it breaks.** The hamburger menu on a narrow screen is not a dialog. It is
a panel that expands under the top bar, and it:

- does not move focus into itself when it opens,
- does not trap focus, so Tab walks straight past it into the page behind,
- does not close on Escape,
- and does not tell assistive technology whether it is open. The button's label
  changes between "Open menu" and "Close menu", but the state is not expressed
  the way a screen reader expects it.

**May be worth treating as a bug rather than documenting.**

## Screen readers

**Route changes are announced.** A hidden polite live region names the new page —
"Standings page", "Schedule page" — on every navigation. The very first page load
is deliberately silent so a screen reader is not interrupted mid-sentence.

**Focus follows, with one gap.** Focus moves to the main content on a normal
navigation. It is **not** moved on browser back or forward, deliberately, so the
browser can do its own restoration. The announcement still happens, so back and
forward announce a new page without moving the reader to it.

**Loading is announced.** Every spinner is a polite status region carrying its
own message: "Loading page...", "Loading match...", "Checking access...".

**Errors are announced.** The shared error bar announces itself assertively.
Toasts are announced by the component library.

**Nothing else is.** This is the pattern that matters most and it repeats in
every feature document:

- An empty state replacing a loading state is ordinary content. A page moving
  from "Loading teams" to "No teams" says nothing, so a reader cannot tell a
  slow list from an empty one.
- Data changing under the user is silent. The app shows stale numbers while it
  refetches, and the moment a number changes there is no announcement. See
  [`foundations/saving-and-freshness.md`](../foundations/saving-and-freshness.md).
- A live score arriving over a realtime channel is silent. The number simply
  moves.
- A screen replacing itself is silent. The contact form becoming a success panel,
  a live match becoming read-only, a game-won banner appearing over the round
  input — a reader is moved to entirely new content with no signal.

**Structure.** 107 controls carry explicit labels and 14 pieces of text exist only
for screen readers. Decorative icons are hidden. Skeleton placeholders carry no
status role at all, so a page that shows a grey outline of its content while
loading is silent to a reader even though the same page's spinner would not be.

## Motion

The app animates a great deal: a fade on every route change, ten named keyframe
animations, entrance animations on empty states, headings and cards, a shimmer on
every skeleton placeholder, a spinning loader, a sliding toast, an expanding
menu, and — when the winter theme is on — two hundred continuously falling
snowflakes on the home page.

**A reduced-motion setting reaches exactly one of those.** The playoff bracket
viewer's stylesheet turns off two transitions when the browser asks for reduced
motion. Nothing else in the product checks the setting. A user who has asked
their operating system to reduce motion gets the full animation everywhere except
inside the bracket.

**May be worth treating as a bug rather than documenting.**

## Contrast and themes

There are three themes: light, dark, and a seasonal winter theme. One button in
the top bar cycles between whichever of them the league has enabled.

**The app defaults to dark and does not follow the operating system.** System
preference is switched off deliberately, so a device set to light mode opens
717rec in dark mode until somebody presses the toggle. The choice is then
remembered in the browser.

**A theme the league turns off is swapped for dark under the user**, silently, on
their next visit.

Nothing in the product responds to a high-contrast or forced-colours setting.

## The interaction, event by event

The interaction is one route change, from the point of view of somebody who
cannot see the screen.

```mermaid
stateDiagram-v2
    [*] --> first_load : the app opens
    first_load --> reading : nothing announced, focus untouched (deliberate)
    reading --> navigated : a link is activated
    navigated --> announced : "<page> page" said politely
    announced --> focused : focus moves to the main content
    focused --> reading : the next Tab is inside the new page
    reading --> popped : browser back or forward
    popped --> announced_only : announced, but focus is not moved
    announced_only --> reading
```

Scroll position is not reset by any of this. The page announced, the element
focused, and the part of the page on screen can all disagree.

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | Escape closes any dialog, menu, popover, or select and returns focus to whatever opened it. **It does not close the hamburger menu**, which is the one panel in the app that is not built from those components. | Escape closes the dialog and abandons what was in it. It does not abort a request already sent. |
| In-app navigation away, or switching tab within the page | The new page is announced and focus moves to its main content. Scroll position is not reset, so a sighted user and a reader are looking at different things. | Work is discarded with no warning and nothing is announced about the loss. |
| Browser back or forward | The new page is announced but **focus is not moved**, so the next Tab continues from wherever focus happened to be. | Same, and the discarded work is silent. |
| Reload, or the tab closed | The first load after a reload announces nothing and moves no focus, by design. The reader starts at the top of the document. | Nothing is announced about a write that may or may not have landed. |
| Network lost mid-request | Silent. Nothing announces going offline, because nothing detects it. | The failure toast is announced. It says the feature failed, never that the connection did. |
| The request fails or times out | A page that falls back to an empty state announces nothing. A page that shows the shared error bar announces it assertively. | One toast, announced once. A second failure replaces the first and the first is never heard. |
| The session expires | Silent. | The refused write's toast is announced with the feature's ordinary wording. Nothing says the session ended. |
| The same record changed in another tab, or by another user | Silent everywhere. On live scoring the score moves with no announcement; elsewhere nothing arrives at all. | Silent. |
| Browser autofill or a password manager writes into the form | A filled field reads correctly, because every field has a real label. The contact form's hidden bot trap is removed from tab order and hidden from readers, so it is never reached by keyboard or voice. | Same. Validation still does not run until submit. |
| The window loses focus | Nothing. | Returning refetches stale data and numbers change with no announcement — the single most common silent change in the product. |

After any interrupt, nothing is announced about what was lost. The app has one
live region for route names and nothing that reports state.

## What is tested, and what is not

An accessibility scan runs in continuous integration as a **required** check. It
uses axe against WCAG 2 level A and AA, with **no rules silenced** — the list of
exemptions is empty. It covers six public routes — home, teams, standings,
history, playoffs, help — and three tabs of the admin dashboard: timeslots,
scores, and teams. A Lighthouse run also blocks merges below an accessibility
score of 0.9.

Everything else is unscanned. That includes `/schedule`, a team's own page,
`/compare`, `/insights`, `/message-board`, `/my-team`, `/contact`, `/auth`,
`/setup-profile`, `/oauth/consent`, `/admin/notifications`, `/timeslots`, the
page-not-found screen, and **the whole of live scoring** — the one surface used
under pressure, on a phone, by two people at once.

## Interactions with other systems

**Permissions and roles.** A control a role may not use is absent rather than
disabled, so it is equally invisible to everyone. Being refused a guarded route
moves the user to another page with no announcement. See
[`permissions.md`](permissions.md).

**Season scoping.** No difference.

**Validation and error display.** Field errors are tied to their fields, so a
reader hears the message when it moves to the field. They appear only after a
failed submit, never as the user types.

**Unsaved changes.** No warning exists for anybody.

**Optimistic updates and rollback.** A value changing back is not announced.

**Realtime.** A live score arriving is not announced.

**Offline.** Not announced, not detected. See
[`errors-and-offline.md`](errors-and-offline.md).

**Toasts and notifications.** Announced, one at a time, and a replaced toast is
lost before it is finished.

**URL state.** Nothing about accessibility is in the URL and no preference
survives a link.

**On a phone.** Touch targets are set to 44 pixels only on live scoring and the
hamburger button. See [`on-a-phone.md`](on-a-phone.md).

**Accessibility.** This document is the definition.

**Side effects the user can notice.** None. No accessibility choice is recorded
or sent anywhere.

## Edge cases

- **Reduced motion is honoured in one stylesheet and nowhere else.** The winter
  theme's two hundred animated snowflakes are the clearest case.
- **The app opens in dark mode on a device set to light**, because system
  preference is switched off.
- **Back and forward announce a page without moving focus to it.**
- **Skeleton placeholders are silent** while spinners are announced, so whether a
  reader is told the page is loading depends on which placeholder that page uses.
- **The hamburger menu is not a dialog** and behaves like none.
- **Nothing announces that a page finished loading and found nothing.**
- **The whole of live scoring is outside the accessibility scan.**
- **The scan's own comment points at a workflow file that does not exist.** The
  scan really runs inside the main build; the note in the test is stale.

## Open questions and verification

- **Reduced motion is effectively unimplemented.** Read from a search of every
  stylesheet and component; only the bracket viewer responds. **May be worth
  treating as a bug rather than documenting.**
- **The hamburger menu's keyboard and screen-reader behaviour** is read from the
  component, not tried with a reader. If it is as described, it is the most
  visible keyboard defect in the product.
- Not confirmed by hand: whether toasts are actually announced, and whether a
  replaced toast is re-announced or silently swapped.
- Not confirmed by hand: whether the route announcement is heard in practice, or
  arrives too early because the page is still loading.
- Not confirmed by hand: whether every page has exactly one first-level heading.
  The page shell was corrected once to avoid two main landmarks; headings were
  not audited.
- Not confirmed by hand: contrast ratios in any of the three themes. The
  Lighthouse floor of 0.9 leaves room for contrast failures on unscanned pages.
- Not confirmed by hand: whether the app is usable at all with a reduced-motion
  setting and the winter theme on.
- Assumption: the component library's dialogs, menus, and selects behave
  accessibly out of the box. They are used unmodified, but none was tested with a
  reader.

Verified against `717rec` commit `ea5c8f4`.
