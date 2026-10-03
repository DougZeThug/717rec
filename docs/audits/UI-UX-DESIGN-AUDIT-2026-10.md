# UI / UX / Design Audit — October 2026

Code-only audit. Nobody ran the app in a browser for the first pass. Items marked
**(device check)** need a look on a real phone.

This audit lists only items still open or new after `UX-AUDIT-2026-09.md`.

## Status key

- [ ] open
- [x] fixed (the commit that fixed it ticks the box)

## High

### Phone layout (device check)

- [ ] 1. Bottom bars stack on the phone bottom nav (Playoffs season bar, message-board
      sign-in bar, realtime dot, footer). Fix: one shared `--bottom-nav-h` offset. (Step 2)
- [ ] 2. `overflow-x-hidden` on the app shell can stop `sticky top-0` working. Fix: `overflow-x-clip`. (Step 2)
- [ ] 3. Hamburger menu caps height at 500px and clips the Admin link. (Step 2)

### Colour and contrast

- [x] 4. Default `Button` has no text colour (about 1.7:1 in light theme). (Step 1)
- [x] 5. `text-destructive` is about 2:1 in dark and winter themes. (Step 1)
- [ ] 6. Status colours (amber/emerald/green 400-500, white on amber/orange) fail contrast in light theme. (Step 10)
- [x] 7. `--input` equals `--border`: 1.2:1 in light, 1.3:1 in dark. Needs 3:1. (Step 1)
- [x] 8. Plain `border` resolves to gray-200 in every theme. (Step 1)
- [ ] 9. Winter theme never gets the `dark` variant. About 81 `!important` patches hide it. (Step 9)
- [x] 10. No `color-scheme` on the page. (Step 1)

### Accessibility

- [ ] 11. Icon-only buttons with no accessible name (schedule pager, message controls,
       history editing, team form). (Step 3)

### UX flows

- [ ] 12. No session-expiry message. Expired-token errors read "permission denied". (Step 4)
- [ ] 13. Standings and Schedule do not refresh on league night. No "last updated". (Step 6)
- [ ] 14. A failed team fetch shows "Team Not Found". (Step 5)
- [ ] 15. Team page has no "next match" for signed-out visitors. (Step 5)

## Medium

- [ ] Unused status tokens (`--success`, `--warning`, `--info`) not mapped in `@theme inline`. (Step 10)
- [ ] Two competing division colour systems. (Step 10)
- [ ] Button, Input and Select heights differ. (Step 11)
- [ ] 50 raw `<button>` elements skip the `Button` component. (Steps 3, 11)
- [ ] Inconsistent type: hand-made page headings, fake-bold Bebas. (Step 12)
- [ ] 39 uses of `text-[8..11px]` carry real information. (Step 12)
- [ ] Duplicate components: pills, spinners, `TeamLogo`, cards. (Step 11)
- [ ] Dead or broken CSS (`.compatibility-score-*`, `.auto-schedule-container`, unused tokens). (Step 10)
- [ ] Touch targets under 44px. (Step 3)
- [ ] Toast close button is hover-only. (Step 3)
- [ ] Raw error text reaches users. (Step 7)
- [ ] No retry on History errors. Stats retry skips teams. (Step 7)
- [ ] Most query failures are silent. (Step 7)
- [ ] Toasts have no success style. Titles are generic. (Step 8)
- [ ] Mixed time zones. (Step 6)
- [ ] Non-admin gets a short toast and a redirect. Return path drops search and hash. (Step 4)
- [ ] Hamburger menu has no active-page marker. `/teams/:id` does not light Teams. (Step 3)
- [ ] `vh` units instead of `dvh`. Fixed widths that can clip at 375px. (Step 2)
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
- [ ] Auth wording: Login / Sign In / Sign Up mixed. (Step 8)
- [ ] Misleading copy ("An administrator has been notified"). (Step 4)
- [ ] Stale examples ("Spring 2025"). (Step 8)
- [ ] Thursday-only date picker. `datetime-local` uses the browser zone. (Backlog)
- [ ] "Go Home" does a full page reload. (Backlog)
- [ ] Images without `loading` or size attributes. (Backlog)
- [ ] Duplicate DOM id `season-selector`. (Step 2)
- [ ] `LoginRequired` adds a 1-second wait. (Step 8)
- [ ] `ScoreButton` logs on every render. (Backlog)
- [ ] Emoji in UI text. (Backlog)
