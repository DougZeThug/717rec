# Phone polish of the whole app (November 2026)

Working plan. **Delete this file in the last wave** (`CLAUDE.md`: executed plans are
deleted, not kept).

## Why

Doug asked for "a polish of the entire app, especially the mobile experience"
(2026-11-09). Fifteen phone polish tasks already finished between Nov 2 and Nov 7 (tap
sizes, sideways overflow, bottom bars, admin drawer, history, playoffs, schedule,
standings). This pass fixes what is left. It does not redo that work.

## Doug's decisions (2026-11-09)

- **Scope: everything**, including admin setup and content screens.
- **Pop-ups:** one shared fix for all of them (side margin, height limit, own scroll).
  **Long form pop-ups become bottom sheets** on a phone with the existing
  `ResponsiveDialog` (`src/components/ui/responsive-dialog.tsx`). The house rule in
  `src/docs/MODAL_PATTERNS.md` already asks for this.
- **Parked decisions stay as they are:** no sticky top bar, no search on phones, the
  message board keeps its inner scroll box, winter step 9b and time zones untouched.

## Rules for every wave

- One wave = one factory task = one PR. One polish task at a time.
- **Keep the design.** No new look, no layout rewrite. Prefer removing or reusing.
- **No data, scoring or schema change.** No migrations, so no hand-apply step.
- **Fake data only.** Screenshots use `factory/bin/shoot.mjs` with a mock from
  `.factory/fixtures/` (see "Tools" below). The dev server reads the live database by
  default; the tool blocks it.
- Before and after shots at 390 px and 1280 px, and a 320 px scan. No sideways scroll,
  no new console errors, touched controls at least 44 px (text links at least 24 px).
- A swipe on a bottom sheet must not throw away typed scores. If it can, the sheet gets
  `dismissible={false}` and closes only with its buttons.
- Docs change in the same PR: `docs/product-description/cross-cutting/on-a-phone.md`,
  the feature doc, and the boxes in `docs/audits/UI-UX-DESIGN-AUDIT-2026-10.md`.
- Leave alone on purpose: calendar day cells, the Auto Schedule team checkbox, the
  multi-select clear cross, the sign-in and sign-up links under the login form.

## Tools

- `node factory/bin/shoot.mjs --out <dir> --routes <list> --mock <mock>`: phone and
  desktop shots, console errors, sideways overflow. A mock may export `init` and
  `initArg` to put a fake signed-in session in the page before it loads.
- Mocks in `.factory/fixtures/` (fake data only): `standings-mock.mjs` (signed out:
  home, stats, one team), and the league-night mocks added in Wave 0.
- Where the installed Chromium does not match Playwright, set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (for example `/opt/pw-browsers/chromium`).
- A full-page shot draws the fixed bottom tab bar in the middle of the page. That is
  the screenshot, not the app.

## Waves

Status: `[ ]` to do, `[x]` done (with the PR), `[-]` checked and left alone (with why).

### Wave 0: setup (no app change)

- [x] Screenshot mocks can seed a fake signed-in session (`init` export).
- [x] Fake league-night data: signed out, member and admin mocks.
- [x] Baseline shots of every route, and the defect list below.

### Wave 1: shared parts (every screen)

- [ ] `ui/dialog.tsx`: phone side margin, height limit, own scroll.
- [ ] `ui/command.tsx` and nine text fields with a `text-sm` override: 16 px on phones
      so iPhone Safari does not zoom.
- [ ] `ui/toast.tsx`: clear the notch; `dvh` not `vh`.
- [ ] Remaining `vh` to `dvh` (six places).
- [ ] `w-96` chart loading boxes cause sideways scroll while loading.
- [ ] `on-a-phone.md`: six claims that are out of date.

### Wave 2: schedule and live scoring

- [ ] Comment actions are invisible until hover.
- [ ] Calendar button is 36 px.
- [ ] Date strip weekday labels are 11 px.
- [ ] First check of live scoring mid-game with data.

### Wave 3: admin tools used at the venue

- [ ] Live Corrections pop-ups become bottom sheets (Edit round, Change game winner).
- [ ] Fixed widths: timeslot date button, Live Corrections filters.
- [ ] Score filter hint is in a tooltip only.
- [ ] Space above the work on a phone (title, Sections bar, Quick Access).

### Wave 4: home, standings, insights, compare

- [ ] Hero pads the notch twice.
- [ ] Compare rows are cramped; the view toggle row does not wrap at 320 px.
- [ ] Names cut short (leaderboard, My Next Match); Insights labels fixed at 110 px.
- [ ] Percentile shown only in a tooltip.
- [ ] Pop-ups never checked on a phone (Power Score help, opponent history).

### Wave 5: teams and message board

- [ ] Team page section pills and badge buttons have overlapping tap areas.
- [ ] Three cards in one row (team totals, player stats).
- [ ] Message board: 32 px send button, about 5 px page margin, tooltip-only info,
      filter bar shown to signed-out visitors.

### Wave 6: playoffs, history, weekly recap

- [ ] Recap tables do not scroll sideways; recap "Home" link height.
- [ ] Bracket admin pop-ups become bottom sheets.
- [ ] Division tabs squeeze long names.
- [ ] Seeding and rearrange drag by touch (fix only if it fails).
- [ ] PO-04 (raw bracket ID as heading), PO-05 (slow spinner).

### Wave 7: account, help and info pages

- [ ] Page side margins differ (Contact about 36 px, others about 20 px).
- [ ] Long forms and the leave-team confirmation at 320 px.

### Wave 8: admin setup and content, then close-out

- [ ] Fixed-width selects and date buttons.
- [ ] Blind draw sign-ups table clips instead of scrolling.
- [ ] Team Management tabs wrap unevenly.
- [ ] Edit team, create division and request pop-ups become bottom sheets.
- [ ] Auto Schedule switches: a tap in the gap hits the lower one.
- [ ] Doug's own-phone check of the P1 phone cases in
      `docs/product-description/verification/`.
- [ ] Delete this file.

## Baseline findings (Wave 0, 2026-11-09)

How: the three league-night mocks, `shoot.mjs` at 390 and 1280 px, and a scan at 320
and 390 px (touch on) of 13 signed-out, 7 member and 26 admin routes, plus the static
pages. Each wave still runs its own audit; these findings are its starting list.

**Clean everywhere:** no page scrolls sideways at 320 or 390 px, no console errors, and
no text field on an open page is under 16 px. (The zoom risk is in pop-ups and in
fields opened later: the team picker and multi-select search boxes, and the comment and
message edit boxes. Wave 1 fixes those.)

**New items found, added to their wave:**

- Wave 2, live scoring: long team names are cut at both screen edges under the big
  game score, and long names run past the card edge in the round list. The "Games"
  label and the thrower headings are 11 px.
- Wave 2, schedule: the match prediction numbers (for example 72 / 28, "High") and
  "Won" are 11 px. Two "Go to Thu …" buttons are under 44 px in one direction.
- Wave 3, Scores: the night's match group opens collapsed, so the admin taps once
  before any match shows. The score form sits in a second padded box on a phone.
- Wave 3, League Night Status: the traffic chart draws no line on a phone and its axis
  labels are cut (they are 10 px). The "Developer" button is under 44 px.
- Wave 4, home: the event card labels (Check-in, Start, Buy-in, Payouts, Week) and the
  division labels on the champions card are 11 px. "Read the full recap" and "See full
  schedule" are links under 24 px high.
- Wave 4, insights: chart axis labels and "Lopsided" are 11 px.
- Wave 5, message board: **posts run past the right edge inside the message box**, so
  lines are cut off, and a long team name badge wraps onto three lines over the time.
  The page itself does not scroll sideways, which is why earlier scans missed it.
- Wave 6, recap: the "Home" link is under 24 px high.
- Wave 7, reset password: "Back to login" is 20 px high (the forgot-password page was
  fixed earlier; this one was not).
- Wave 8, contact inbox and notifications: dates and "Expires" are 11 px.

**Out-of-date doc found:** `on-a-phone.md` says no label on the home page is under
12 px. The event card labels are 11 px (Wave 4 fixes the labels or the sentence).
