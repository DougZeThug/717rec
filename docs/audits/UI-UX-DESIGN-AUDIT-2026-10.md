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
- [x] 6. Status colours fail contrast in light theme. Fixed in Step 10 for text that carries meaning (win %, W/L, rank, trend, status, character counter): `-700` with a `dark:` twin. White-on-amber/orange fills now use dark text or deeper colours. Decorative icons beside a text label (about 90) are left as they are.
- [x] 7. `--input` equals `--border`: 1.2:1 in light, 1.3:1 in dark. Needs 3:1. (Step 1)
- [x] 8. Plain `border` resolves to gray-200 in every theme. (Step 1)
- [~] 9. Winter theme never gets the `dark` variant. Step 9a done: the `dark:` variant, the cornhole background and the bracket viewer now treat `.winter-frozen` as dark. Checked at 375px on 9 pages with empty data: no visible change. NOT checked with real data. Step 9b (removing the ~80 `!important` patches in `winter-homepage.css`) is waiting for a go-ahead.
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

- [x] Unused status tokens (`--success`, `--warning`, `--info`) not mapped in `@theme inline`. Mapped in Steps 8 and 10 (`bg-success`, `text-warning-foreground`, ...). Migrating the ~1,500 raw palette classes is not planned.
- [x] Two competing division colour systems. The unused hex set is deleted; the HSL set stays, and badge text gets darker `--*-soft-text` tokens (4.5:1 or better).
- [ ] Button, Input and Select heights differ. (Step 11)
- [ ] 50 raw `<button>` elements skip the `Button` component. (Steps 3, 11)
- [x] Inconsistent type: Help, Contact and My Team now use `PageHeader`; the weekly recap heading uses `typeScale.h1`. Bebas Neue has one weight, so `font-semibold`/`font-bold` next to it (typeScale h1-h3, Standings table head, division heading) is removed to stop the faked bold. Mono bold is left: IBM Plex Mono ships 600, which `font-bold` resolves to.
- [x] 39 uses of `text-[8..11px]` carry real information. New `text-2xs` (11px) replaces all of them; stat labels, prediction text and status badges that carry information use `text-xs` (12px). The 60%-opacity prediction footnote now reads at full muted strength.
- [ ] Duplicate components: pills, spinners, `TeamLogo`, cards. (Step 11)
- [x] Dead or broken CSS removed in Step 10: `.compatibility-score-*`, `.auto-schedule-container`, `truncate-tab`, `--font-oswald`, `--color-cornhole-wood/green`, the stale Snowtop TODO. The Oswald font file stays (recap graphics use it). Sidebar tokens stay (shadcn defaults, harmless).
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
- [x] Auth form has no `aria-invalid` or `aria-describedby`. Fixed for sign in, sign up and forgot password: the field is marked invalid and the message is tied to it.
- [ ] Table rows use `role="button"`. (Backlog)
- [ ] Win/loss shown by colour alone. (Backlog)
- [x] Charts have no text alternative. Fixed: the win/loss, power score, division strength, team career, all-teams career and traffic charts are now `role="img"` with a text summary of the data (long lists are cut with a count). The report card radar and the power score gauge ring only repeat text that is already on screen, so they are hidden from screen readers.
- [x] Score inputs lack `inputMode="numeric"`. Fixed for the schedule score form, the match form, the playoff score editors and the seed box. The Challonge sort order is left alone on purpose: it can be negative and the phone number pad has no minus key.
- [ ] Public "Report Score" form is free text. (Backlog)
- [ ] Teams page sort control exists only on phones. (Backlog)
- [ ] Admin menu order and labels differ between desktop and phone. (Backlog)

## Low

- [x] Nine dialogs lack `DialogDescription`. Fixed: each now has a screen-reader-only description (the screen looks the same). The match editor's loading and error dialogs got a title and description too.
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
