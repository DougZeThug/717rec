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
- [ ] Fake league-night data: signed out, member and admin mocks.
- [ ] Baseline shots of every route, and the defect list below.

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

## Baseline findings (Wave 0)

To be filled in from the baseline shots and scan.
