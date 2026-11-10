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
- [x] 5a. `text-primary` on a `bg-primary/10` tint: 4.24-4.49:1 in light, 3.29-3.61:1 in dark (12 places). Found and fixed in the phone polish Wave 2 (2026-11-09): a text-only `--primary-text` token (`text-primary-text`), like `--destructive-text`. Now 4.9:1 or better in light (5.1-5.4:1 on white; 4.9:1 at worst, on a light-grey surface), 6.7:1 or better in dark and 5.5:1 or better in winter; fills keep `--primary`.
- [x] 5b. `text-primary` as plain text (no tint) on compare, the career rankings, the opponent history pop-up, the home "Your Next Matches" title and the schedule pager's Previous/Next: 3.4-3.9:1 in dark. Found and fixed in the phone polish Wave 4 (2026-11-10): they use `text-primary-text`, now 5.7:1 or better in light and 7.0:1 or better in dark (winter unchanged, 7.2:1 or better). Icons and hover colours keep `--primary`, except the schedule pager's chevrons: they take the button's colour, so they are `text-primary-text` too. "See full schedule" was 70% primary (2.9:1 light, 2.4:1 dark); it is `text-primary-text` too.
- [x] 5c. Rank pills ("2nd", `PercentileBadge`) in the light theme: 2.6-4.1:1 on their own tint. Found and fixed in the phone polish Wave 4 (2026-11-10): yellow-800, emerald-800, blue-700 and red-700 text, now 4.8:1 or better on compare and the team page; dark and winter keep their `-400` colours (5.0:1 or better).
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
- [x] 39 uses of `text-[8..11px]` carry real information. New `text-2xs` (11px) replaces all of them; stat labels, prediction text and status badges that carry information use `text-xs` (12px). The 60%-opacity prediction footnote now reads at full muted strength. The phone polish Wave 2 (2026-11-09) raised the schedule and live scoring ones to `text-xs` too: date strip weekdays, prediction numbers and confidence, "Won", the rivalry tag, the timeslot double-header pill and division badge, "Games" and the thrower headings. The phone polish Wave 3 (2026-11-10) raised the team names over the admin Scores result buttons to `text-xs`, and the League Night Status traffic chart's axis labels from 10 to 12 pixels (its left labels were also cut off; now whole). The phone polish Wave 4 (2026-11-10) raised home, standings, Insights and compare: the event tile labels, the champion card's division, "Week N" in past winners, the parity bar ends, the Division Strength scale, the rank pills (`text-2xs` in `PercentileBadge`) and the win-loss chart's names and scale. Left at 11 pixels on purpose: the standings Power Score chart and the career Power Score chart's slanted season names (check real season names first).
- [ ] Duplicate components: pills, spinners, `TeamLogo`, cards. (Step 11)
- [x] Dead or broken CSS removed in Step 10: `.compatibility-score-*`, `.auto-schedule-container`, `truncate-tab`, `--font-oswald`, `--color-cornhole-wood/green`, the stale Snowtop TODO. The Oswald font file stays (recap graphics use it). Sidebar tokens stay (shadcn defaults, harmless).
- [x] Touch targets under 44px. (Step 3) Small controls use the new `hit-area-44` utility, which grows the tap area without changing the look. Also found: the team-page section bar was `fixed` inside the page, so it scrolled away; it now uses `ViewportPortal`. The phone polish Wave 3 (2026-11-10) found the League Night Status "Developer" button at 36 pixels; it is 44 now. The phone polish Wave 4 (2026-11-10) found the home links "Read the full recap" (20 pixels) and "See full schedule" (16); both are 24 now, the text-link floor.
- [x] Toast close button is hover-only. (Step 3)
- [x] Match comment menu (…) is hover-only, so a phone never shows it. Found and fixed in the phone polish Wave 2 (2026-11-09): always shown, 44 by 44.
- [x] Admin Scores still opened with tonight's group collapsed on the first load (A-03 in `UX-AUDIT-2026-09.md`): the first list held every night, so tonight was not first. Found and fixed in the phone polish Wave 3 (2026-11-10): a date or time group opens when it becomes the open-by-default one, and never closes itself.
- [x] Live Corrections on a phone: "Change winner" was squeezed to 54-64 pixels and its words ran over the game title and past the card; Edit round was a centred pop-up. Found and fixed in the phone polish Wave 3 (2026-11-10): the button drops under the title, and Edit round is a bottom sheet that a swipe closes only while nothing is typed or saving.
- [x] Seven admin sections (`AdminSectionWrapper`) added a second 16-pixel side margin on a phone, so they sat further in than the Sections bar. Found and fixed in the phone polish Wave 3 (2026-11-10): the section padding starts at `md`.
- [x] Admin Scores: the date hint's tooltip sat on a div that no keyboard could reach and no phone could open, and the "Date: …"/"Bracket: …" tags repeated the filters. Found and fixed in the phone polish Wave 3 (2026-11-10): the hint is plain text and the tags are gone.
- [x] Home, standings, Insights and compare on a 320-pixel phone. Found and fixed in the phone polish Wave 4 (2026-11-10): the standings' "Detailed" switch was cut off (the row now wraps); the Power Score help ran off a 320x640 screen (it now scrolls inside); the League Leaderboard cut every name to "Fake Team…" and clipped its rank circles (ST-03 in `UX-AUDIT-2026-09.md`; the title now sits above the cards on a phone); next-match names were cut at 80 pixels (now up to 112); compare header names were cut to one line (now two, inside their half); Division Matchups cut both division names when a row had a record (the record now drops below).
- [x] The phone hero card added the notch height on top of the top bar, which already adds it. Found and fixed in the phone polish Wave 4 (2026-11-10): the card has 16 pixels of top padding. Read from the code; not seen on a real iPhone **(device check)**.
- [~] A rank pill's "of N teams in X" was only in a hover tooltip, which a phone and a screen reader never open. Phone polish Wave 4 (2026-11-10): a screen reader now hears it as hidden text inside the pill. A sighted phone user still sees it only in the tooltip; a visible caption would be new UI.
- [x] Team pages, the message board and the schedule on a 320-pixel phone. Found and fixed in the phone polish Wave 5 (2026-11-10): board posts grew wider than their box (Radix ScrollArea's `display: table` wrapper; forced to block in `MessageFeed.tsx` only); the board had a 1-pixel page margin (now 16); a long username or team name pushed the post time out (now "…", also in match comments, which ran past the match card); signed-out visitors got two sign-in prompts and controls that did nothing (MB-01 in `UX-AUDIT-2026-09.md`; now one card); Records by Division cut three cards in one row (now one per row below 640); "Win Percentage" was cut (now "Win %" and "Game Win %"); the opponent history pop-up showed nothing while loading (now a loading view); the live round preview wrapped and moved the grids (now one line); a link to last week's unscored match opened an empty Completed tab (now the tab that holds the match); the phone carousel kept a position, not a night (now a night).
- [x] Contrast and names found by axe on `/stats`, `/schedule` and a finished match. Fixed in the phone polish Wave 5 (2026-11-10): the Power Score band text in light (gold, green, orange, amber now `-700`, 4.9:1 or better; dark unchanged); the phone head-to-head win/loss text (light and dark 4.5:1 or better); the standings team links' spoken name now starts with the visible name (`label-content-name-mismatch`); the schedule date group's `aria-controls` is Radix's own valid id (`aria-valid-attr-value`); the finished match's player table is a focusable named region (`scrollable-region-focusable`).
- [x] Playoffs, history and the weekly recap on a 320-pixel phone. Found and fixed in the phone polish Wave 6 (2026-11-10): Update Bracket Seeding was 522 pixels wide at 320 and 390 and Create Bracket scrolled sideways at 320 (`DialogContent` is a grid whose auto track grew to the widest child; now `grid-cols-1`, plus a `sm:` floor on the team cards and a wrapping button row); the playoff score pop-up threw typed scores away on a tap outside, Escape or Cancel (now it asks; Save never asks; it stays centred, Doug 2026-11-10); Delete Bracket nested paragraphs and logged a console error (now one description block); the raw bracket id flashed as a heading for a second (PO-04 in `UX-AUDIT-2026-09.md`; now hidden as soon as the bracket draws); a long division name spilled out of its admin tab (now wraps); the History title sat 16 pixels nearer the edge than its cards (now lined up); the recap W–L wrapped to two lines and the power rankings cut off the Power column at 320 (W–L now stays on one line, the team column keeps 112 pixels and the table scrolls sideways in a focusable named region); the recap "Home" link was 20 pixels tall (now 24).
- [x] Account, help and info pages on a 320-pixel phone. Found and fixed in the phone polish Wave 7 (2026-11-10): the sign-in, forgot-password, reset-password and set-up-profile cards sat 4 pixels from a phone's edge and Contact 36 (all now 20, like the other pages; Contact's desktop card stays 608 pixels wide); "Back to login" on the expired reset link page was 20 pixels tall (now 36, as on forgot-password); the My Team name took 4 lines in a 140-pixel column at 390 (the name and team ID now drop under the logo on a phone, 2 lines at most) and Cancel ran 18 pixels past the edit row at 320 (now wraps), and the Team Image URL field opens the web-address keyboard; the Help Accessibility section had no border or icon panel and a card inside (now the same box as the other sections, and a wrapped section title starts at the left); small text under 4.5:1: Contact "Verified" (3.4:1 in light), My Team Approved badge and "You can edit team details" (3.1:1 in light), the Pending Approval badge (2.8:1 in dark; now dark amber with white text in both themes) and Help's Contact page link (not underlined; 3.8:1 in dark); all now pass 4.5:1 (axe clean except the older heading-order rule). Left alone: Help and OAuth consent keep their 16-pixel margin (a shared page frame would add a new backdrop), and the sign-in and sign-up links under the login form.
- [x] Raw error text reaches users. Fixed in Step 7 for the public pages (Standings, History, season accordion, bracket boundary) and the admin toasts that call database services. The bracket dialogs keep their messages on purpose: the bracket library throws plain, readable errors an admin needs.
- [x] No retry on History errors. Fixed in Step 7. (Stats retry already refetched teams and matches.)
- [x] Most query failures are silent. Fixed in Step 7 for Home (announcements, Team of the Week, Weekly recap) with the new `SectionError`. Other queries are still quiet.
- [x] Toasts have no success style. Titles are generic. Fixed in Step 8: a green `success` variant, and specific titles on the 20 "Success" toasts and the Error toasts for the same actions. About 40 generic "Error" titles remain (backlog).
- [~] Mixed time zones. Step 6 labels the always-Eastern event times ("EDT"). Match times stay on the viewer's clock on purpose: the Schedule page groups matches by it, and `formatUTCToLocalTimeString` documents why. Moving every display to Eastern needs a decision about that grouping first.
- [x] Non-admin gets a short toast and a redirect. Return path drops search and hash. (Step 4)
- [x] Hamburger menu has no active-page marker. `/teams/:id` does not light Teams. (Step 3)
- [x] `vh` units instead of `dvh`. Fixed widths that can clip at 375px. (Step 2)
- [x] Placeholder-only inputs. Fixed: the blind draw sign-up, quick notification post, both team searches, the team search inside the multi-select, the Challonge bracket fields (labels now linked), and the team, category, team-to-join and per-team division pickers now have a name. The blind draw errors are linked to their fields too. The bracket seed box already had one.
- [x] Auth form has no `aria-invalid` or `aria-describedby`. Fixed for sign in, sign up and forgot password: the field is marked invalid and the message is tied to it.
- [x] Table rows use `role="button"`. Fixed: the stats standings table row is no longer a button; the team name is a real button (the row keeps its mouse click). The timeslot team picker uses real `<button aria-pressed>`. The flyer upload zone keeps its role but Space no longer scrolls the page and it ignores keys while uploading. The message card and `app-card` were left as they are.
- [ ] Win/loss shown by colour alone. (Backlog)
- [x] Charts have no text alternative. Fixed: the win/loss, power score, division strength, team career and traffic charts are now `role="img"` with a text summary of the data (long lists are cut with a count). The all-teams career chart is a labelled `group` (its tooltip holds team links) and its label lists every team's score in the latest season; the full season-by-season data stays in the tooltip and on each team page. The report card radar and the power score gauge ring only repeat text that is already on screen, so they are hidden from screen readers.
- [x] Score inputs lack `inputMode="numeric"`. Fixed for the schedule score form, the match form, the playoff score editors and the seed box. The Challonge sort order is left alone on purpose: it can be negative and the phone number pad has no minus key.
- [ ] Public "Report Score" form is free text. (Backlog)
- [ ] Teams page sort control exists only on phones. (Backlog)
- [ ] Admin menu order and labels differ between desktop and phone. (Backlog)

## Low

- [x] Nine dialogs lack `DialogDescription`. Fixed: each now has a screen-reader-only description (the screen looks the same). The match editor's loading and error dialogs got a title and description too.
- [ ] Logo `alt` repeats the adjacent team name. (Step 11) The phone polish Wave 5 (2026-11-10) hid the logo from screen readers inside the standings and career rankings team links (`TeamLogo decorative`); the other places still repeat it.
- [x] `focus:` rings instead of `focus-visible:`. Fixed for buttons, triggers and badges: the badge, select trigger, dialog close, toast buttons, season accordion, date strip and the author's message card. Text inputs, the skip link and the main region keep `focus:` on purpose.
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
