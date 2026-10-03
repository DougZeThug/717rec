# UI / UX / Design Audit — October 2026

Code-only audit. Nobody ran the app in a browser for the first pass. Items marked
**(device check)** need a look on a real phone.

This audit lists only items still open or new after `UX-AUDIT-2026-09.md`.

## Status key

- [ ] open
- [x] fixed (the commit that fixed it ticks the box)

## High

### Phone layout (device check)

- [x] 1. Bottom bars stack on the phone bottom nav (Playoffs season bar, message-board
      sign-in bar, realtime dot, footer). Fixed in Step 2. Checked in a browser: the real cause was
      deeper. Every route sits in a box with `contain: layout`, so `fixed` bars were never pinned to
      the screen. The sign-in bar and the "Live updates" pill now use `ViewportPortal` and
      `--bottom-nav-h`. The Playoffs season picker moved to the top of the page. The footer clears
      the tab bar.
- [x] 2. `overflow-x-hidden` on the app shell stopped `sticky` bars working. Fixed in Step 2
      (`overflow-x-clip`). Checked in a browser: the header itself was never sticky, because
      `tailwind-merge` dropped `sticky` in favour of the later `relative`. It still scrolls away,
      on purpose. Decision for the owner: make it sticky if wanted (then sub-bars need an offset).
- [x] 3. Hamburger menu caps height at 500px and clips the Admin link. Fixed in Step 2: the panel
      scrolls inside `100dvh - 5rem`.

### Colour and contrast

- [x] 4. Default `Button` has no text colour (about 1.7:1 in light theme). (Step 1)
- [x] 5. `text-destructive` is about 2:1 in dark and winter themes. (Step 1)
- [ ] 6. Status colours (amber/emerald/green 400-500, white on amber/orange) fail contrast in light theme. (Step 10)
- [x] 7. `--input` equals `--border`: 1.2:1 in light, 1.3:1 in dark. Needs 3:1. (Step 1)
- [x] 8. Plain `border` resolves to gray-200 in every theme. (Step 1)
- [ ] 9. Winter theme never gets the `dark` variant. About 81 `!important` patches hide it. (Step 9)
- [x] 10. No `color-scheme` on the page. (Step 1)

### Accessibility

- [x] 11. Icon-only buttons with no accessible name (schedule pager, message controls,
       history editing, team form). (Step 3)

### UX flows

- [x] 12. No session-expiry message. Expired-token errors read "permission denied". (Step 4)
- [x] 13. Standings and Schedule do not refresh on league night. No "last updated". Fixed in Step 6: refetch on focus and on mount, a 60-second poll from 4 PM Thursday (league time), and an "Updated 2:41 PM" line with a refresh button on both pages.
- [x] 14. A failed team fetch shows "Team Not Found". (Step 5)
- [x] 15. Team page has no "next match" for signed-out visitors. (Step 5)

## Medium

- [ ] Unused status tokens (`--success`, `--warning`, `--info`) not mapped in `@theme inline`. (Step 10)
- [ ] Two competing division colour systems. (Step 10)
- [ ] Button, Input and Select heights differ. (Step 11)
- [ ] 50 raw `<button>` elements skip the `Button` component. (Steps 3, 11)
- [ ] Inconsistent type: hand-made page headings, fake-bold Bebas. (Step 12)
- [ ] 39 uses of `text-[8..11px]` carry real information. (Step 12)
- [ ] Duplicate components: pills, spinners, `TeamLogo`, cards. (Step 11)
- [ ] Dead or broken CSS (`.compatibility-score-*`, `.auto-schedule-container`, unused tokens). (Step 10)
- [x] Touch targets under 44px. (Step 3) Small controls use the new `hit-area-44` utility, which grows the tap area without changing the look. Also found: the team-page section bar was `fixed` inside the page, so it scrolled away; it now uses `ViewportPortal`.
- [x] Toast close button is hover-only. (Step 3)
- [x] Raw error text reaches users. Fixed in Step 7 for the public pages (Standings, History, season accordion, bracket boundary) and the admin toasts that call database services. The bracket dialogs keep their messages on purpose: the bracket library throws plain, readable errors an admin needs.
- [x] No retry on History errors. Fixed in Step 7. (Stats retry already refetched teams and matches.)
- [x] Most query failures are silent. Fixed in Step 7 for Home (announcements, Team of the Week, Weekly recap) with the new `SectionError`. Other queries are still quiet.
- [x] Toasts have no success style. Titles are generic. Fixed in Step 8: a green `success` variant, and specific titles on the 20 "Success" toasts and the Error toasts for the same actions. About 40 generic "Error" titles remain (backlog).
- [~] Mixed time zones. Step 6 labels the always-Eastern event times ("EDT"). Match times stay on the viewer's clock on purpose: the Schedule page groups matches by it, and `formatUTCToLocalTimeString` documents why. Moving every display to Eastern needs a decision about that grouping first.
- [x] Non-admin gets a short toast and a redirect. Return path drops search and hash. (Step 4)
- [x] Hamburger menu has no active-page marker. `/teams/:id` does not light Teams. (Step 3)
- [x] `vh` units instead of `dvh`. Fixed widths that can clip at 375px. (Step 2)
- [ ] Placeholder-only inputs. (Backlog)
- [ ] Auth form has no `aria-invalid` or `aria-describedby`. (Backlog)
- [ ] Table rows use `role="button"`. (Backlog)
- [ ] Win/loss shown by colour alone. (Backlog)
- [ ] Charts have no text alternative. (Backlog)
- [ ] Score inputs lack `inputMode="numeric"`. (Backlog)
- [ ] Public "Report Score" form is free text. (Backlog)
- [ ] Teams page sort control exists only on phones. (Backlog)
- [ ] Admin menu order and labels differ between desktop and phone. (Backlog)

## Low

- [ ] Nine dialogs lack `DialogDescription`. (Backlog)
- [ ] Logo `alt` repeats the adjacent team name. (Step 11)
- [ ] `focus:` rings instead of `focus-visible:`. (Backlog)
- [x] Auth wording: Login / Sign In / Sign Up mixed. Fixed in Step 8: Sign in / Sign up / Sign out everywhere.
- [x] Misleading copy ("An administrator has been notified"). (Step 4)
- [x] Stale examples ("Spring 2025"). Fixed in Step 8.
- [ ] Thursday-only date picker. `datetime-local` uses the browser zone. (Backlog)
- [ ] "Go Home" does a full page reload. (Backlog)
- [ ] Images without `loading` or size attributes. (Backlog)
- [x] Duplicate DOM id `season-selector`. (Step 2)
- [ ] `LoginRequired` adds a 1-second wait. (Step 8)
- [ ] `ScoreButton` logs on every render. (Backlog)
- [ ] Emoji in UI text. (Backlog)
