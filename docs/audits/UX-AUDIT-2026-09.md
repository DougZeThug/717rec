# 717 Rec — UI/UX Audit (September 2026)

**Reviewed build:** branch `claude/717-rec-uiux-audit-vmlt5r` at commit `db8d183` (tip of `main` on 2026-09-07).
**Environments actually tested:**

| Environment | What it was used for | Writes |
|---|---|---|
| Local Vite dev server (`npm run dev`, port 8080) rendering **live production data** as an anonymous visitor (the client's built-in production Supabase fallback) | Every public route at 360 / 390 / 430 / 768 / 1440 px, plus light theme, reduced motion, offline, landscape (844×390), 150 % text zoom, keyboard focus walks | **None.** A network write-guard aborted every non-GET request to Supabase and every edge-function call; the guard log is committed as evidence (`ux-audit-2026-09/guard-log.jsonl`). |
| Same server with a **fake signed-in member** (session seeded in the browser, membership row fixture, all writes answered locally) | Home "my matches", My Team, Message Board, the full live-scoring flow (setup → rounds → undo → end game → save official result → recap), score report modal | Mocked in the browser. Nothing reached production. |
| Same server with a **fake admin** (`profiles.is_admin=true` stubbed, admin-only tables answered by fixtures, all writes answered locally) | All 21 admin sections and their sub-tabs, `/timeslots`, `/admin/notifications`, playoff admin view, and 10 admin workflows (approve/reject a score, assign a timeslot, mass score entry, edit/delete a round, approve a request, approve a membership, post a notification, create season/division/hero card, blind-draw clear, theme toggle, auto-schedule walk) | Mocked in the browser. |
| Browser: Chromium 1194 (Playwright 1.62), timezone `America/New_York`, DPR 1 | | |

**Not tested (see §7):** a real admin login, the installed PWA (the manifest and service worker live on Progressier, outside this repo), iOS/Android devices, real realtime channels (blocked by the harness so no fake token could leave the browser), and Supabase Storage uploads.

**Evidence conventions used below**
- **Observed** — seen in a screenshot or measured by the harness (axe-core 4.13, tap-target and font-size scans, console capture). Screenshot paths are relative to `docs/audits/ux-audit-2026-09/screenshots/`.
- **Inferred from code** — read in the source but not reproduced in the browser (mostly things a screenshot cannot show: focus handling, guards, mutation feedback). Cited as `file:line`.
- **Preference** — a design opinion, labelled as such.
- Prior triaged defects are cited by their `B-xx` id from `docs/product-description/bug-triage.md`; the July 2026 quality review is at `docs/quality-review-2026-07/`.

---

## 1. Overall assessment and the five highest-impact improvements

**Overall.** 717 Rec is a genuinely good league app with one outstanding screen and a handful of structural gaps. The live-scoring flow is the best thing in it: setup, round entry, undo, game-won banner, "Save official result" and the recap are clear, fast and honest about state (saved / view only / final). The public pages have real personality (champions card, weekly recap, division colours, hero cards) and the desktop standings table is well built. The July 2026 review's fixes hold: reduced motion, keyboard-sortable tables, confirmations on destructive actions, toast stacking, the mobile bracket toolbar.

The problems are mostly about **reach and orientation rather than polish**: a tablet-width header that hides Login and the admin entry; a Teams page that shows no teams on a phone; a Schedule that opens on an empty future date; rankings whose central number is never explained where it is shown; Compare links that forget their teams; an admin console whose sections have no URLs and whose phone menu pushes every task below the fold; and no password recovery at all. Accessibility is decent at the primitive level (focus rings, skip link, announcer, sortable headers) but weak at the page level (unlabelled landmarks, missing `h1`s, unnamed icon buttons, a collapsed sidebar with 21 nameless buttons, small text and sub-24 px targets on the busiest pages). Offline behaviour is the biggest risk for the venue: a lost connection produces no message and a navigation dead-ends the app.

Ranked by how often a real task is blocked or made wrong, the five changes with the most leverage are:

1. **Fix the tablet/landscape header (X-01)** — one breakpoint change restores Login, notifications and the Admin Panel entry at 768–1023 px. *Critical, Small.*
2. **Give admin sections URLs and a phone menu that gets out of the way (A-01, X-06, A-02)** — Back stops exiting the console, sections become linkable from League Night and Help, the phone shows the section first, and the collapsed sidebar becomes usable with a screen reader. *High, Medium.*
3. **Make league night's two busiest admin screens open ready to work (A-03, A-04, A-05)** — Mass Score Entry defaults to tonight with the first group open and a sticky Submit; Timeslots defaults to Thursday and explains block pairs; approving a request points to where the change actually happens. *High, Small.*
4. **Fix the three public "nothing here" moments (SC-01, T-01, ST-01)** — Schedule between nights, Teams on a phone, and Standings without an explanation of Power Score. Each is a small change to an empty state, a default, or a popover. *High, Small.*
5. **Add password recovery and offline resilience (X-04, X-12, LS-03)** — the two dead ends a player cannot recover from on their own. *High, Medium.*

Everything else in this report is ordered behind these in §5, with the first twelve commits laid out in §6.

---

## 2. Coverage matrix

Status key: **V** visually inspected (screenshot at the listed widths) · **I** interaction tested (clicked through with mocked writes) · **C** code only · **B** blocked / could not verify. Roles: **A** anonymous, **M** member (fixture), **Ad** admin (fixture).

### 2.1 Routes

| Route | Roles | Widths | States seen | Status |
|---|---|---|---|---|
| `/` Home | A, M, Ad | 360/390/430/768/1440 | populated, light theme, reduced motion, offline, 150 % zoom, focus walk, member "my matches", pending-scores card (fixture), report modal | V + I |
| `/teams` | A | all five | populated (collapsed divisions), light theme, expand division | V + I |
| `/teams/:teamId` (slug) | A | all five | populated, longest team name, sticky section nav | V + I |
| `/schedule` | A, M | all five | empty next-Thursday default, Timeslots/Upcoming/Completed tabs, search, calendar, offline, focus walk, landscape | V + I |
| `/stats` | A | all five | populated, Division/All, Compact/Detailed, light theme, offline (chunk failure), zoom | V + I |
| `/compare` and `?team1&team2` | A | all five | empty, deep link, UI selection + reload | V + I |
| `/insights` | A | all five | populated | V |
| `/playoffs`, `?bracket=` | A, Ad | all five (+ bracket at 360/390/430) | current season (no brackets), past-season bracket, season picker, admin view | V + I |
| `/history` | A | all five | populated, season expand, division expand | V + I |
| `/message-board` | A, M | all five | signed-out prompt, fixture feed, compose, reply | V + I |
| `/help` | A | all five | accordion | V + I |
| `/contact` | A, M | all five | empty-submit validation, mocked submit | V + I |
| `/auth` | A | all five | login/sign-up tabs | V |
| `/setup-profile` | A, M | 360–1440 | signed-out, member | V |
| `/my-team` | A, M | 360–1440 | signed-out, member with team (fixture) | V |
| `/oauth/consent` | A | all five | error state (no params) | V |
| `/matches/:matchId/live` | A, M | 360–1440 | completed (view only), missing id, member scoring flow (mocked), offline | V + I |
| `/timeslots` (admin) | A, Ad | 390 | redirect signed-out; rendered as admin | V |
| `/admin` | A, Ad | 390/768/1440 | redirect signed-out; 21 sections | V + I |
| `/admin/notifications` | A, Ad | 390 | redirect signed-out; rendered as admin | V |
| `*` not found | A | all five | | V |
| `/playoffs/e2e-bracket-proof` | — | — | dev-only route, excluded from the production experience | C |

### 2.2 Admin sections (`/admin`, sidebar id in parentheses)

| Section | Data shown | Widths | Interactions | Status |
|---|---|---|---|---|
| Timeslots (`timeslots`) | production reads | 390/768/1440 | pick team, pick time, confirm (mocked), delete dialog | V + I |
| Match Creation (`batch-matches`) | production reads | 390/1440 | empty submit validation | V + I |
| Auto Schedule (`auto-schedule`) | production reads | 390/768/1440 | Load Teams, Generate, tabs 2 and 3 (no save) | V + I |
| Matchups (`matchups`) | production reads | 390/1440 | — | V |
| Scores / Mass Score Entry (`scores`) | production reads | 390/768/1440 | expand group, tap result, submit (mocked), delete dialog | V + I |
| Live Corrections (`live-corrections`) | **fixture** games + rounds (production has no live-scored match visible to anon) | 390/1440 | select match, edit round (mocked), delete-round dialog, change-winner dialog | V + I |
| Season (`seasons`) | production reads | 390/1440 | create form + empty submit, archive dialog | V + I |
| Participation (`participation`) | production reads | 390/1440 | — | V |
| Requests (`requests`) | **fixture** (4 rows) | 390/1440 | approve dialog + confirm (mocked) | V + I |
| Contact Inbox (`contact-inbox`) | **fixture** (3 requests + 1 ticket) | 390/1440 | — | V |
| Notifications (`notifications`) | production active rows + **fixture** expired row | 390/1440 | post (mocked), edit | V + I |
| Teams (`teams`) + Manage/Create/Logos/Approvals | production reads; approvals **fixture** | 390/768/1440 | approve membership (mocked), reject dialog | V + I |
| Divisions (`divisions`) | production reads | 390/1440 | create dialog, delete dialog | V + I |
| Pending (`pending-matches`) | **fixture** (3 submissions incl. a conflicting pair) | 390/1440 | approve (result picker, mocked), reject | V + I |
| Hero (`hero-cards`) + Challonge fallback | production reads | 390/1440 | create form | V + I |
| Themes (`themes`) | production reads | 390/1440 | toggle (mocked) | V + I |
| Blind Draw (`blind-draw`) | **fixture** signups (anon gets permission-denied) | 390/1440 | Clear All dialog | V + I |
| Help (`help`) | static | 390/1440 | — | V |
| League Night (`league-night-status`) | **fixture** drift + traffic; realtime blocked | 390/1440 | quick action → Live Corrections | V + I |
| Power Score Review (`power-migration`) | **blocked**: its status RPC is admin-only and was aborted by the write-guard; error state captured | 390/1440 | — | B (error state V) |
| Power Score Sandbox (`power-sandbox`) + Career | production reads | 390/1440 | sub-tab | V |
| Playoff admin (`/playoffs` admin view + toolbar) | production reads | 390/1440 | admin view, Teams tab, create bracket dialog | V + I |
| Sidebar / mobile nav | — | 390/1440 | search, collapse, empty search, keyboard | V + I |

---

## 4. Cross-app issues (navigation, shared components, accessibility, consistency)

Each finding lists: where · who · what happens and how to reproduce · evidence · why it matters · recommended change · priority with rationale · effort (S/M/L, with uncertainty) · acceptance criterion.

### X-01 · Tablet header clips the navigation: Login, notifications and theme toggle are unreachable at 768 px — **Critical**
- **Where / who:** `src/components/layout/Navbar.tsx` + `navbar/NavLinks.tsx` (desktop list is `md:flex` with nine items) · anyone on an iPad-class width, portrait phones in landscape, small laptops with a sidebar.
- **Repro:** open any page at 768 px wide. **Observed:** brand text overlapped by "Home"; items cut off after "History"; Messages, Help, Contact, **Login / user menu, bell and theme toggle are off-screen** with no hamburger (the hamburger is `md:hidden`). Evidence: `anon/home--t768.jpg`, `admin/tab-scores--t768--fold.jpg`. axe also reports the unnamed `.size-9` icon button at this width.
- **Why it matters:** a signed-out tablet user cannot sign in; a signed-in admin cannot open the Admin Panel (the only link to it is inside the user menu, see X-03).
- **Recommend:** keep the hamburger up to `lg` (1024 px) and show the desktop list only from `lg:`; or collapse the last four links into a "More" menu below `lg`. Smallest change: swap `md:` → `lg:` on `NavLinks` and `MobileMenu`.
- **Priority:** Critical — blocks sign-in and admin access on a common width. **Effort:** S (one breakpoint change; low uncertainty).
- **Accept:** at 768 and 820 px every header action is visible and clickable, and axe `button-name` no longer fires on the header.

### X-02 · Four navigation surfaces disagree about what the app contains — **High**
- **Where / who:** Navbar (9 links), `BottomNav` (4 tabs: Standings, Schedule, Teams, Playoffs), `DesktopNav` pill bar (3, no Playoffs) rendered *below* `<main>` above the footer, `CommandPalette` (7 quick actions, desktop-only). `/compare`, `/insights`, `/my-team` are in **no** primary navigation; `/insights` is reachable only from a button on `/stats`, `/compare` only by URL. Evidence: `anon/schedule--d1440.jpg` (pill bar sitting in empty space at the page bottom), `anon-extras/command-palette--d1440.jpg`, inventory in `src/components/navigation/*`.
- **Why:** users learn one map per surface; the desktop pill bar duplicates the header with fewer items and sits where nobody looks; features that took real effort (Compare, Insights) are undiscoverable.
- **Recommend:** delete `DesktopNav` (keep the search trigger in the header), add Compare and Insights to the palette and to Help's Quick Navigation, and make the bottom tab bar's four items match the header's first four. Remove the unused `GlobalNav.tsx` duplicate.
- **Priority:** High (discoverability + wasted space on every desktop page). **Effort:** S–M (mostly deletion; check tests that reference `DesktopNav`).
- **Accept:** every route in `App.tsx` is reachable from at least one of header, bottom bar, user menu or palette; no navigation renders below `<main>`.

### X-03 · The Admin Panel is reachable from exactly one place (the user menu) and the playoff admin from nowhere in the console — **High**
- **Where / who:** `src/components/auth/UserMenu.tsx` (only `/admin` link in the UI); `src/components/admin/**` contains no link to `/playoffs`; Help tab step "Run Playoffs" points at Match Creation (`help/GettingStartedTab.tsx:66-71`). Inferred from code, confirmed by journey J9 (no `/playoffs` link found inside `/admin`).
- **Why:** on league night the admin's entry points are hidden behind a dropdown; playoff administration is a separate island.
- **Recommend:** show an "Admin" item in the header/bottom bar when `isAdminAccessGranted`; add "Playoffs" to the League Night quick actions and fix the Help step target.
- **Priority:** High. **Effort:** S.
- **Accept:** an admin sees an Admin entry in the primary nav on phone and desktop; League Night links to `/playoffs`.

### X-04 · No password recovery anywhere — **High**
- **Where / who:** `/auth` (`src/components/auth/AuthForm.tsx`) · any member who forgot a password. **Observed:** the sign-in card has Login / Sign Up / Google and a "Sign up" link only (`anon/auth--m390--fold.jpg`); grep of `src/` finds no `resetPasswordForEmail` and no "forgot" copy.
- **Why:** a locked-out player cannot join a team, post, or live-score; the only workaround is emailing the admin.
- **Recommend:** add "Forgot password?" under the password field, wired through a new `resetPassword(email, redirectTo)` in `src/services/auth/AuthService.ts` (the repo rule keeps Supabase calls in services; the component and `useAuthMethods` stay Supabase-free) and a `/reset-password` route that handles the recovery session and calls an `updatePassword` service function.
- **Priority:** High (dead end for a core account task). **Effort:** M (new route + email template; moderate uncertainty around Supabase redirect config).
- **Accept:** a user can request a reset from `/auth`, receive the email, set a new password and land signed in.

### X-05 · Centered dialogs and bottom sheets disagree on button order on phones — **Medium**
- **Where / who:** `src/components/ui/dialog.tsx:59-61` (`DialogFooter` is `flex-col-reverse`, so on a phone the *last* DOM button — the primary — renders on **top**) versus `src/components/ui/drawer.tsx:57-59` (`DrawerFooter` is `flex-col`, so the primary renders at the **bottom**). Sheets built on `ResponsiveDialog` (score report, "Record the result", player picker) put the primary lowest; centered dialogs used on phones by admin corrections (`EditRoundDialog.tsx:299-306`, `DeleteRoundDialog`, `ChangeGameWinnerDialog`) put it on top. **Observed:** "Record the result" shows Cancel above "Record and approve" (`admin/pending-approve-dialog--m390.jpg`), while "Edit round 1" shows "Save changes" above Cancel (`admin/lc-edit-round-dialog--m390.jpg`).
- **Why it matters:** the two most common admin flows on league night use opposite orders, which invites mis-taps; neither order is wrong on its own, the inconsistency is.
- **Recommend:** pick one convention for phones (primary lowest is the thumb-reach norm and is what the sheets already do) and render the round-correction dialogs through `ResponsiveDialog` so they become sheets with the same order. Do **not** reverse `DrawerFooter`: the sheets' DOM order is already Cancel → primary, so reversing it would move the primary above Cancel. (Correction to an earlier draft of this finding, thanks to PR review.)
- **Priority:** Medium. **Effort:** S. **Accept:** on a 390 px viewport every dialog or sheet with a Cancel button renders the primary action as the lowest button.

### X-06 · Mobile admin navigation consumes the whole first screen — **High**
- **Where / who:** `src/components/admin/dashboard/AdminMobileNav.tsx` renders search + Quick Access + six accordion groups **above** the section content. **Observed:** on 390 px every admin section starts ~660 px down; the user must scroll past the entire menu each time (`admin/tab-scores--m390--fold.jpg`, `admin/tab-timeslots--m390.jpg`).
- **Why:** league-night tasks on a phone (enter scores, fix a timeslot) begin with a full-screen scroll; the open section's group also fails to follow programmatic switches (`AdminMobileNav.tsx:128-133`).
- **Recommend:** make the mobile admin menu a `Drawer` opened from a sticky "Sections ▾" button under the page title, keep Quick Access visible, and set `aria-current` on the active item.
- **Priority:** High. **Effort:** M.
- **Accept:** on 390 px the active section's heading is visible without scrolling; switching sections via League Night quick actions updates the menu state.

### X-07 · Signed-in username collides with the brand text in the header on phones — **Medium**
- **Observed:** "717REC" and "audit_admin"/"audit_player" overlap at 390 px (`admin/tab-scores--m390--fold.jpg`, `player/live/01-setup--m390.jpg`). `NavActions` renders the username as text next to the brand; long usernames make it worse.
- **Recommend:** below `md`, show only the avatar/initial in `UserMenu` (the name is already in the dropdown).
- **Priority:** Medium. **Effort:** S. **Accept:** no overlap at 360 px with a 20-character username.

### X-08 · Two `<nav>` landmarks with no labels, no `h1` on eight pages, a second `<main>` on live-scoring and consent pages — **Medium**
- **Observed (axe, every viewport):** `landmark-unique` ×81 (header nav and bottom nav unlabelled), `page-has-heading-one` on `/schedule`, `/stats`, `/insights`, `/auth`, `/setup-profile`, 404, live match pages and admin redirects; `landmark-no-duplicate-main` / `landmark-main-is-top-level` on `/matches/:id/live` and `/oauth/consent` (`LiveScoring.tsx` and `OAuthConsent.tsx` render their own `<main>` inside `App.tsx`'s `<main id="main-content">`); `heading-order` on `/help`, `/contact`, `/my-team`; the Home page has **two** `h1`s.
- **Why:** screen-reader users rely on landmarks and the h1 to orient; the skip link exists but lands in an unlabelled structure.
- **Recommend:** `aria-label="Primary"` / `"Section"` on the two navs; one visible `h1` per page (the page title already exists as styled text on Schedule/Stats); change the inner `<main>` to `<section>`.
- **Priority:** Medium. **Effort:** S. **Accept:** axe reports zero landmark/heading violations on all 24 public loads.

### X-09 · Unnamed controls: Compare selects, division chevrons, swap button, command palette dialog — **Medium**
- **Observed:** axe `button-name` **critical** on `/compare` (both `SelectTrigger`s and the swap button have no accessible name, every width), `/teams` division-header chevrons ×3 (they also do nothing on click — `TeamsDivisionSection.tsx:53-77`), `aria-dialog-name` + `aria-required-children` on the command palette (`ui/command.tsx:26-36`, no `DialogTitle`).
- **Recommend:** `aria-label="Team 1"`/`"Team 2"`/`"Swap teams"`; move the division toggle onto the chevron button with `aria-expanded`; add an sr-only `DialogTitle` to `CommandDialog`.
- **Priority:** Medium (critical for screen-reader users, small surface). **Effort:** S. **Accept:** zero `button-name`/`aria-dialog-name` violations.

### X-10 · Tap targets below 24 px and 10 px text on the pages people use most on a phone — **Medium**
- **Observed (390 px):** Home weekly-recap team links 20 px tall (8 of them); Stats rank rows 34 px and the section chevron 28 px; Teams control row (Sort/View/Style) 20 px tall and clipped at 360 px (`anon/teams--m360--fold.jpg`); team-details head-to-head links 16 px; History "FULL SEASON RECAP" 33 px; footer links 20 px. Text under 12 px: History 83 elements, Stats 34, Schedule date-strip weekday labels 10 px, bracket viewer team names ≈8 px small caps (`anon/playoffs-bracket-summer1-intermediate--m390.jpg`).
- **Why:** WCAG 2.5.8 minimum is 24 px; 44 px is the platform norm; 10 px labels are unreadable in a bar.
- **Recommend:** `min-h-11` on list-row links, 12 px minimum for labels (`text-xs` = 12 px, drop `text-[10px]`), enlarge bracket participant names via `brackets-viewer-717rec-theme.css`.
- **Priority:** Medium. **Effort:** S–M. **Accept:** harness tap-target scan reports 0 interactive elements under 24 px on `/`, `/stats`, `/teams`, `/history` at 390 px.

### X-11 · Light theme fails contrast on muted text and an unstyled link — **Medium**
- **Observed:** with `theme=light`, `#64748b` (slate-500) text on the card background measures 4.34–4.48:1 on `/stats` (38 nodes), `/schedule`, `/teams`; the Home "Use the Contact page" link has 1.08:1 contrast with surrounding text (`link-in-text-block`); dark theme: `/auth` "Sign up" link 3.84:1, `/contact` link 3.84:1 (`anon-extras/light-stats--d1440.jpg`, `anon/contact--m390.jpg`).
- **Recommend:** darken `--muted-foreground` in `:root` (slate-600) and underline in-text links.
- **Priority:** Medium. **Effort:** S. **Accept:** axe `color-contrast` = 0 on `/stats` in both themes.

### X-12 · Offline: nothing tells the user, and a client-side navigation while offline dead-ends the whole app — **Medium**
- **Observed:** on `/schedule` with the network off, tab changes show a skeleton with no message; navigating to Standings shows the full-screen app error boundary "Something went wrong — We've been notified… Failed to fetch dynamically imported module" with the header gone, and it **does not recover when the connection returns** (`anon-extras/offline-stats-nav--m390.jpg`, `offline-recovered--m390.png`). Code: only two `navigator.onLine` checks exist, both to pause polling (`useTimeslotQuery.ts:28`, `useMatchTimeslots.ts:76`); the route-level `Suspense` has no failure path (`errors-and-offline.md`).
- **Why:** venues have poor signal; a scorer who loses connection mid-night sees a developer error.
- **Recommend:** an `online`/`offline` listener that shows a persistent top banner; catch chunk-load failures in `RouteErrorBoundary` with "You're offline — retry" that re-imports on reconnect (React Query's `onlineManager` already resumes queries).
- **Priority:** Medium (High for live scoring, see S-LS-03). **Effort:** M. **Accept:** going offline shows a banner within 2 s; navigating while offline shows an offline page that retries automatically on reconnect.

### X-13 · The same concept has up to five labels (status vocabulary) — **Medium**
- **Inferred from code, confirmed in screenshots:** "Final / Completed / finalized / Champion" for a finished match; "Pending Scores / Unresolved matches / Pending Review / Pending / Score reports / Score submissions" for the approval queue (`PendingScoresCard.tsx:27`, `PendingMatchesSection.tsx:59`, `ScoreSubmissionsList.tsx:42`, `AdminSidebar.tsx:119`, `LeagueNightStatusTab.tsx:216`); "Reject" vs "Deny"; "Match Creation / Batch Match Creation / Create Multiple Matches / Batch Matches"; "Live" in the scoring header means *websocket connected*, not *match in progress* (`MatchScoringHeader.tsx:27,40`). There is no match-status enum; six components derive status from different fields (see `notes` §5 in the evidence folder).
- **Recommend:** one `deriveMatchStatus()` + `MATCH_STATUS_LABELS` map; rename the sidebar item to "Score approvals"; use "Reject" everywhere; rename the realtime pill to "Connected / Reconnecting".
- **Priority:** Medium. **Effort:** M. **Accept:** grep finds one label per status; the admin menu item, section heading and League Night tile use the same noun.

### X-14 · Four persistence mechanisms, only two shareable — **Medium**
- **Inferred, confirmed by interaction:** Schedule date and search reset on every visit (`Schedule.tsx:47-49`); Playoffs season resets while the bracket id is in the URL, producing a bracket from Summer 1 under a selector that says "Summer 2 2026 (Current)" (`anon/playoffs-bracket-summer1-intermediate--m390.jpg`); Standings Division/All toggle resets; team-details section anchors never reach the URL; Home "my matches" links to bare `/schedule` so a previous match lands on a week that does not contain it (`MyMatchRow.tsx:250`).
- **Recommend:** put `date`, `season`, `view` and the team-page section in the URL (`useSearchParams`, replace-mode) and read them on mount; link `MyMatchRow` to `/schedule?date=…#match-<id>`.
- **Priority:** Medium. **Effort:** M. **Accept:** reloading `/schedule?date=2026-09-03` and `/playoffs?season=…&bracket=…` restores the same view; a shared link to a team's Match History opens that section.

### X-15 · Notification bell shows a red count to signed-out visitors — **Low**
- **Observed:** every anonymous screenshot shows a bell with a red "4" (`anon/home--m360--fold.jpg`). Public announcements are fine, but an unread badge for someone who can't have read anything reads as a broken state and competes with Login.
- **Recommend:** hide the badge (or show a plain dot) when signed out; clear it after the panel opens.
- **Priority:** Low. **Effort:** S. **Accept:** no numeric badge for anonymous visitors.

### X-16 · Error boundaries reload the whole app for "Home" and expose raw error text — **Low**
- **Inferred:** `ErrorBoundary.tsx` and `RouteErrorBoundary.tsx` use `window.location.href='/'` and `history.back()`; dev builds show `error.message` (observed in `admin/BUG-contact-inbox-null-contact-crash--d1440.jpg`, a fixture-induced crash used here only as an example of the boundary UI).
- **Recommend:** use router navigation and hide the raw message behind a "Details" disclosure. **Priority:** Low. **Effort:** S.

### X-17 · Console errors visible on public pages — **Low**
- **Observed:** `/schedule` logs "Maximum update depth exceeded" once per load (a `useEffect`/`setState` loop — needs a root-cause look; it did not visibly break the page); `/` logs a 406 from `WeeklyRecapService` (`.single()` with no row, B-11 sibling); `/stats` warns "`ref` is not a prop"; `/playoffs` and `/history` warn "Select is changing from uncontrolled to controlled".
- **Priority:** Low (no user-visible effect found), but the Schedule loop is worth a look because it burns CPU on the page scorers keep open. **Effort:** S–M.

### What already works well (cross-app)
- Skip link, route announcer and focus-to-main on navigation exist and work (`src/components/a11y/*`); focus rings are visible on every control we tabbed through (no ring suppression found in 12 focus walks).
- Reduced motion is honoured globally while keeping loading spinners (B-22 fix verified: only the loader animation ran).
- Bottom tab bar respects the safe-area inset; no horizontal page overflow at any of the five widths, including 150 % text zoom and 844×390 landscape.
- The write-guard log shows the public site makes **no** write requests on any page load (`guard-log.jsonl`).

---

## 3. Findings by section

Format per finding: **ID · title — priority** · where/who · what happens (repro) · evidence · why it matters · recommendation · effort · acceptance. "Works well" lists close each section.

### 3.1 Home `/`

**Works well (observed):** the hero's four CTAs map to the four bottom tabs; the Champions card, Team of the Week, Weekly Recap (upsets, streaks, movers) and Top Teams carousel make the page feel alive and are the best "league personality" moments in the app — keep them. Hero cards are admin-editable.

- **H-01 · A first-time visitor is never told how to join — High.** *Where:* `HeroSection.tsx` CTAs are Standings / Full Schedule / History / Teams; the only "join" path is the generic "Send us a message" form at the very bottom of a 2,800 px page (`anon/home--m390.jpg`), whose first option is "General message". Journey J1 found zero links matching join/sign up/register on the home page above the form. *Why:* recruitment is the league's growth loop; the brief's first task ("understand the league and discover how to participate") has no answer above the fold. *Recommend:* one hero CTA "Join the league" → `/contact?type=join_league` (pre-select the request type) or an FAQ anchor in Help; put a one-line "What is 717 Rec" under the tagline. *Effort:* S. *Accept:* a join CTA is visible in the first viewport at 390 px and pre-selects the join request type.
- **H-02 · Two contact forms with different purposes — Medium.** The home form ("Request a timeslot change, report a score, join the league… Got a bug? Use the Contact page instead") and `/contact` ("Need a timeslot change…? Use the message form at the bottom of the home page instead") each redirect users to the other (`anon/home--m390.jpg`, `anon/contact--m390.jpg`). B-10 merged the *inbox*; the *entry* is still split, with different field sets (home: request type + team; contact: subject select). *Recommend:* one `/contact` form with a "What is this about?" select whose options are the union (timeslot, score, join, bug, other); replace the home form with a compact card linking to it. *Effort:* M. *Accept:* one form, one inbox, no cross-referral copy.
- **H-03 · Weekly-recap team links are 20 px tall; division labels are 10 px — Medium.** Observed at 390 px: 8 links at 132×20 px, `text-[10px]` division labels (`anon/home--m390.jpg`, tap scan). *Recommend:* `min-h-11 py-2` rows, `text-xs`. *Effort:* S. *Accept:* 0 links under 24 px on `/` at 390 px.
- **H-04 · Second `h1`, redundant alt text — Low.** axe `page-has-heading-one` passes but Home has two `h1`s (hero title + SEO title); champions logos repeat the team name in `alt` (`image-redundant-alt` ×6). *Recommend:* make the SEO heading an `h2`/`p`; `alt=""` on decorative logos next to text. *Effort:* S.
- **H-05 · Notification badge for signed-out visitors** — see X-15.

### 3.2 Teams `/teams` and `/teams/:teamId`

**Works well:** team pages are compact and scannable at 390 px (logo, division pill, "Last match: L 0-1 vs …", Power Score gauge, Ranking 5/26, collapsible Roster/Stats/Matchups/Match History — `anon/teams-3-amigos--m390.jpg`); slugs make URLs shareable; long names ("Burning Holes & Taking Souls") wrap without overflow.

- **T-01 · On a phone the Teams page shows no teams — High.** Observed at 360/390: three collapsed division accordions and a cramped control row ("Sort: Rank · View: By Division · Style: Grid") that wraps to two lines and clips "Style: Grid" at 360 px (`anon/teams--m360--fold.jpg`); the chevron buttons have no accessible name and do nothing on click (`TeamsDivisionSection.tsx:53-77`, axe `button-name` in light theme). A first-time visitor sees zero teams. *Recommend:* expand the first (or the user's) division by default on mobile, or default "View: All"; move the three controls into a single "Sort & view" sheet; make the header a `CollapsibleTrigger` with `aria-expanded`. *Effort:* S–M. *Accept:* at 360 px at least eight team cards are visible on load without a tap; the control row fits on one line.
- **T-02 · Sort control exists only on mobile; view controls persist in localStorage but the division toggle on Stats does not — Low (consistency).** `useTeamsPreferences.ts` persists three prefs; Standings' Division/All resets. *Recommend:* same persistence for both (URL param preferred, see X-14). *Effort:* S.
- **T-03 · Team page sections cannot be linked and Match History is collapsed by default — Medium.** `TeamDetailsStickyNav.tsx:94-114` scrolls without writing a hash; the section a player most wants (matches) needs a tap (`anon/teams-3-amigos--m390.jpg`). *Recommend:* open Match History by default; write `#matches` to the URL and honour it on load. *Effort:* S. *Accept:* `/teams/3-amigos#matches` opens with the list expanded and scrolled into view.
- **T-04 · Head-to-head links inside team pages are 16 px tall — Medium** (tap scan, `anon/teams-3-amigos--m390.jpg`). *Recommend:* row padding. *Effort:* S.
- **T-05 · "— 0" trend placeholder under Ranking** (also on Standings) shows a dash and a zero with no legend — Low. *Recommend:* hide the trend until a prior snapshot exists, or label it "no change". *Effort:* S.

### 3.3 Schedule `/schedule`

**Works well:** the swipeable date strip, tabs (Timeslots / Upcoming / Completed) and per-match cards with "Live score this match" / "View match recap" are the right primitives; the "smart default" that switches to Completed for past dates is helpful when it applies.

- **SC-01 · The default view is an empty future date — High.** Observed (New York time): the page opens on the *next* Thursday (Sep 10) on the Timeslots tab with "No timeslots scheduled for this date." and nothing else, on every width (`anon/schedule--m390--fold.jpg`, `anon/schedule--d1440.jpg` — 800 px of empty space on desktop). The season's last match night (Sep 3) is one tap away but nothing points there. *Why:* on Friday morning every player opening the app to check last night's results sees an empty screen; between seasons the page is permanently empty. *Recommend:* when the selected date has no timeslots and no matches, render a rich empty state: "Nothing scheduled for Thu Sep 10 — See results from Thu Sep 3 → / Next scheduled night: …"; default the date to the most recent night with matches when the upcoming Thursday has none. *Effort:* S–M. *Accept:* opening `/schedule` between league nights shows either the next scheduled night or the last results, never an empty card.
- **SC-02 · No season, division or team filter; search is free text — Medium.** `Schedule.tsx` exposes date + search only; a player looking for "my team's next match" must know the date or type the name; past seasons are unreachable from Schedule (History shows standings, not fixtures). *Recommend:* a division chip row (uses the existing division colours) and a "My team" chip when signed in; keep search. *Effort:* M. *Accept:* a member can filter the week to their team in one tap.
- **SC-03 · Date strip is 14 tab stops before the content and weekday labels are 10 px — Medium.** Focus walk: first Tab lands inside the strip (the selected day is focused on load) and each day is a stop (`anon-extras/focus-schedule--m390--tab03.jpg`); labels `text-[10px]`. *Recommend:* `role="tablist"`-style roving tabindex (one stop, arrow keys), 12 px labels. *Effort:* S–M. *Accept:* Tab from the search field reaches the tab list in one press.
- **SC-04 · State is lost on every navigation — Medium** (X-14): selected date and search reset; "my matches" links from Home land on the default week. *Effort:* S–M.
- **SC-05 · Intermittent React "Maximum update depth exceeded" on load — Low/verify.** Seen once in the UTC run, not in the New York run (`utc-run/anon.final.utc.json`). Likely the `useScheduleTabs` smart-default effect racing the date; worth a look because scorers keep this page open. *Effort:* S–M.

### 3.4 Live scoring `/matches/:matchId/live`

**Works well (interaction-tested with mocked writes, desktop and phone):** the flow is the strongest screen in the app — game setup sheet ("Pick up to 2 players", add-a-player inline, Done), thrower pills that auto-alternate, a 12-key score grid with dots on the ambiguous 3/4/6 and an inline "bags in the hole?" prompt, Save Round, Undo with a confirm dialog ("Undo last round? — Keep round / Undo round"), a game-won banner that explicitly says "Wrong score? Undo the last round instead of ending the game", an end-game confirm, "Save official result" as a clearly labelled point of no return, and a recap with top performer, round stats, player table and round-by-round (`player/live/06-round1-saved--d1440.jpg`, `11-round2-saved-game-won--d1440.png`, `18-result-saved--d1440.png`). Saved / pending / final states are unambiguous: "View only" badge + "Match result saved — Final: 2–0. Standings updated." B-04/B-05/B-17 fixes hold.

- **LS-01 · "Connecting…" is the first thing on the screen and "Live" means the socket, not the match — Medium.** The header pill shows realtime channel state ("Connecting… / Live"); with the socket blocked it stayed "Connecting…" for the whole match and on the completed-match view (`player/live/01-setup--m390.jpg`, `anon/live-completed-anon--m390--fold.jpg`). Code: `MatchScoringHeader.tsx:27,40`. *Why:* scorers will read "Connecting…" as "my scores aren't saving" even though saves are HTTP and succeed. *Recommend:* label it "Live updates: connecting / on / off", move it below the scoreboard, and show a distinct "Saved ✓" confirmation per round. *Effort:* S. *Accept:* after a round saves, the UI shows a saved confirmation independent of realtime state.
- **LS-02 · "The round number moved… your tapped scores were cleared" toast fires after the scorer's own save — Medium (observed in harness, verify on production).** After every successful Save Round the toast appeared (`player/live/06-round1-saved--d1440.jpg`, `11-…`); `LiveMatchView.tsx:110-118` intends it for *remote* round changes. In the harness the server round replaced the optimistic one with a new id, which may be what triggers it. *Recommend:* suppress when the change originated from the local mutation (compare `round_number` + `entered_by_user_id`). *Effort:* S. *Accept:* no toast after a local save; toast still appears when another scorer saves the same round.
- **LS-03 · No offline safety net for a scorer — High.** Observed: offline produces no banner; a navigation while offline throws the full-screen error (X-12). Code: no local draft of tapped scores or unsaved rounds; rollback + toast only (`useRoundMutations.ts`). *Why:* the venue is exactly where connectivity drops; B-05 fixed loss on a failed save, but a *dead* connection still means the scorer must remember and retry. *Recommend:* persist the current game's unsaved round taps to `sessionStorage` keyed by game id; queue Save Round while offline and flush on `online`; show "Offline — 1 round waiting to sync". *Effort:* M–L. *Accept:* with the network off, Save Round shows "waiting to sync"; reconnecting saves it without user action.
- **LS-04 · Duplicate `<main>` and missing `h1` — Low** (X-08): `LiveScoring.tsx` wraps in its own `<main>`; the page has no heading (team names are `p`). *Recommend:* `<section>` + visually-hidden `h1` "Live scoring: A vs B". *Effort:* S.
- **LS-05 · Completed, non-live-scored match page is a dead end — Low.** For a match that was never live-scored, the page shows only "Connecting…", "View only", "0–2 GAMES" and "X wins the match" with no date, court, or link to the recap/team pages (`anon/live-completed-anon--m390--fold.jpg`). *Recommend:* show date/location and "Back to schedule for Sep 3". *Effort:* S.
- **LS-06 · Reopen is a two-press control with no confirm text — Low.** `ReopenGameButton` deliberately requires two presses; the second-press state should say what will happen ("Press again to reopen Game 2 — the result will be recalculated"). *Preference.* *Effort:* S.

### 3.5 Standings `/stats`

**Works well:** the desktop table (Power, W-L, Win %, Games, Game %, SOS, Streak) with keyboard-sortable headers and `aria-sort` (B-34 fix verified), the phone card view with Compact/Detailed and Division/All toggles, the League Leaderboard strip and the Insights button (`anon/stats--d1440.jpg`, `anon/stats--m360--fold.jpg`).

- **ST-01 · Power Score and the coloured numbers are never explained where they appear — High.** Observed: "Power 84.8" in green, SOS 0.863 in orange, Game % in blue/red, fire/arrow/chart badges next to names, "#1 (1) — 0" rank cells — no tooltip, legend or "What is Power?" link on the page; the explanation lives in `/help` (`StandingsSection.tsx`). Journey J6: tapping "Power" does nothing. *Why:* the brief's "understand rankings" task fails on the page that shows them; colour is the only cue for good/bad values (WCAG 1.4.1). *Recommend:* an info icon next to "Power" opening a `Popover` with the one-sentence formula and weights (already available from `usePowerScoreWeights`), a legend row for badges, and a `title`/`sr-only` text for percentile colours. *Effort:* S–M. *Accept:* a visitor can read what Power Score means without leaving `/stats`; colours carry a text equivalent.
- **ST-02 · Rank cell noise "#1 (1) — 0" and an empty Trend column — Medium.** Every row shows the division rank, the overall rank in parentheses and a "— 0" trend; the Trend column is blank on desktop (`anon/stats--d1440.jpg`). *Recommend:* show overall rank only in the All view; hide trend until week 2 data exists; render an up/down chip with a number when it does. *Effort:* S.
- **ST-03 · Leaderboard strip truncates team names ("Degenerati…", "Cuzzo…") at 360–390 px — Low.** (`anon/stats--m360--fold.jpg`). *Recommend:* two-line names or logo-only tiles with the name below at 12 px. *Effort:* S.
- **ST-04 · 34 elements under 12 px and 34-px rows on the phone card view — Medium** (X-10). *Effort:* S.
- **ST-05 · No `h1`; the season badge "Summer 2 2026 · Week 4" is the only orientation** — Low (X-08). "Week 4" is computed from the season start date while the schedule shows the fourth *match night* as a different week when byes exist (`useSeasonWeek.ts`) — inferred, not observed. *Effort:* S.

### 3.6 Compare `/compare`

- **CP-01 · Deep links and reloads lose the selected teams — High (observed, root cause confirmed in code).** `/compare?team1=<id>&team2=<id>` rendered both selects empty at every width and the URL was rewritten to `/compare` (`anon/compare-deeplink--m390--fold.jpg`); selecting via the UI writes a URL, and reloading *that* URL empties the selects again (J6). *Root cause:* `Compare.tsx` has two effects — one that initialises `team1`/`team2` from the params once `teams` have loaded (`:23-40`), and one that syncs the URL from state. On mount both selections are `null` and `teams` is still loading, so the sync effect writes empty params first, wiping the incoming ids before the init effect can match them. *Recommend:* keep an `initialized` ref that the init effect sets after applying the incoming params, and skip `setSearchParams` until it is set (or skip the sync while both selections are null and params are present); show "Loading teams…" in the selects meanwhile. *Effort:* S. *Accept:* opening `/compare?team1=a&team2=b` with teams loading after mount shows both teams and leaves the URL unchanged; reloading the URL produced by the UI restores the same comparison.
- **CP-02 · Both selects and the swap button have no accessible name — Medium** (X-09, axe critical). *Effort:* S.
- **CP-03 · Compare is unreachable from navigation — Medium** (X-02). Add "Compare" to team pages ("Compare with…") and Standings rows. *Effort:* S.

### 3.7 Insights `/insights`

**Works well:** stat tiles, the parity gauge with plain-language labels, Top Performers cards with a reason line ("7-1 record", "Strength of schedule") — this is the most explanatory page in the app.

- **IN-01 · Division Matchups shows self-pairings ("Competitive vs Competitive 433–433") and raw game counts — Medium.** (`anon/insights--m390.jpg`). The symmetric rows carry no information; the cross-division rows ("288–30") have no unit or percentage. *Recommend:* drop self rows; show "Competitive beat Intermediate 91 % of games (288–30)". *Effort:* S.
- **IN-02 · Division Strength chart rendered empty at first paint — Low/verify.** Axes drawn, no bars at capture time (`anon/insights--m390.jpg`, UTC run); the lazy recharts bundle may arrive later. *Recommend:* a skeleton/empty state while the chart bundle loads. *Effort:* S.
- **IN-03 · No `h1`, no route in any nav** (X-02, X-08).

### 3.8 Playoffs `/playoffs`

**Works well:** past-season brackets show a Final Standings list first (with tie handling: 7, 7, 9, 9), then the bracket; the admin toolbar collapses into a menu on phones (B-24 fix); the season selector is pinned at the bottom on mobile.

- **PO-01 · The bracket is cut off on phones with no scroll affordance and 8-px team names — High.** Observed at 360/390/430: only Round 1 is visible; later rounds are off-canvas to the right with no shadow, arrow or "swipe" hint; participant names are tiny small-caps (`anon/playoffs-bracket-summer1-intermediate--m390.jpg`; J7 records the container's `scrollWidth` vs `clientWidth`). axe: 48 logos without `alt`, container not keyboard-scrollable. *Recommend:* a "Swipe to see later rounds →" hint that hides after the first scroll, `tabindex="0"` + `aria-label` on the scroll container, larger names via `brackets-viewer-717rec-theme.css`, `alt` on participant images (or `aria-hidden` since the name is adjacent); consider a "rounds" tab list on phones that scrolls the viewer. *Effort:* M. *Accept:* at 390 px a user can reach the final without guessing; axe `image-alt` = 0.
- **PO-02 · Season selector and bracket disagree — Medium.** With `?bracket=<Summer 1 id>` the page shows the Summer 1 bracket while the pinned selector says "Summer 2 2026 (Current)" (`anon/playoffs-bracket-summer1-intermediate--m390.jpg`); code: `usePlayoffPageData.ts:66-79` re-derives the season on mount. *Recommend:* derive the season from the bracket when a bracket id is in the URL; put `season` in the URL. *Effort:* S.
- **PO-03 · Current season shows three "No brackets yet for this division" cards and nothing else — Medium.** (`anon/playoffs--d1440.jpg`). Between the regular season and playoffs this is the whole page; no date, no "seeding as of today", no link to standings. *Recommend:* show projected seeds (top N by Power) with "Brackets are created by the admin after week X" and a link to Standings. *Effort:* M.
- **PO-04 · Bracket page injects the raw bracket UUID as an `h1`** (axe `page-has-heading-one` passes because of it; observed in the h1 scan). *Recommend:* use the bracket title. *Effort:* S.
- **PO-05 · "Loading…" spinner for several seconds on phones — Low/perf.** The first capture at 360 px was still loading after the settle window (`utc-run`); the viewer bundle is loaded dynamically. *Recommend:* skeleton with the division cards first, bracket after. *Effort:* S.

### 3.9 History `/history`

**Works well:** season cards with champions per division, highlights, "Full season recap" expanders and breadcrumbs (`anon/history--m390--fold.jpg`); the active season shows "No champion" honestly.

- **HI-01 · 83 text elements under 12 px on one page — Medium.** Labels like "Champions", "Highlights", "Most Wins", "26 teams" are 10–11 px (`anon/history--m390.jpg`, font scan). *Recommend:* `text-xs` minimum. *Effort:* S.
- **HI-02 · Division panels are mouse-only — Medium.** `DivisionPanel.tsx:70-77`: a clickable `div` with a chevron `Button` that has no handler and no name; keyboard users cannot expand a division (inferred from code; confirmed by axe `button-name` on `/teams` for the sibling component). *Recommend:* `CollapsibleTrigger` pattern as in `DateMatchGroup.tsx`. *Effort:* S.
- **HI-03 · "FULL SEASON RECAP" expander is 33 px tall and repeats nine times** — Low. *Effort:* S.

### 3.10 Message board `/message-board`

- **MB-01 · Signed-out users see two sign-in CTAs plus unusable search/refresh/filter controls — Low.** (`anon/message-board--m390--fold.jpg`). *Recommend:* hide the controls and the sticky bar for signed-out users; one CTA. *Effort:* S.
- **MB-02 · Composer and category/character counter** — evaluated in J8 (see §6). Code: `MessageInputForm.tsx:102` disables submit while pending (good).

### 3.11 Account: `/auth`, `/setup-profile`, `/my-team`, `/oauth/consent`

- **AC-01 · No password recovery — High** (X-04).
- **AC-02 · `/my-team` and `/setup-profile` have no route guard — Medium.** Signed-out `/my-team` renders "My Team" with a sign-in prompt inside the page (`anon/my-team--m390.jpg`), `/setup-profile` redirects; `/message-board` guards content but not the route. *Recommend:* one `RequireAuth` wrapper that redirects to `/auth?next=` for all three, so bookmarks behave the same. *Effort:* S.
- **AC-03 · Login button contrast and the "Sign up" link at 3.84:1 — Medium** (X-11; `anon/auth--m390--fold.jpg`).
- **AC-04 · `/oauth/consent` without parameters shows "Authorization error" inside a second `<main>` with no layout** — Low (`OAuthConsent.tsx` bypasses `PageLayout`). *Effort:* S.
- **AC-05 · After sign-up, the profile setup page is the only place to pick a username; the flow from "Join a Team" → membership request → approval → "My Team" is documented (B-18 fix) but the member sees no status timeline** — inferred from `TeamMembershipSection.tsx`; J2 shows the approved state only. *Recommend:* a three-step status strip (Requested → Approved → Active). *Effort:* S–M.

### 3.12 Help `/help` and Contact `/contact`

**Works well:** Help has a real `h1`, quick navigation, an accordion that mirrors the nav, and an Accessibility section; Contact has labelled fields, a subject select, inline zod validation and a success screen (J8).

- **HC-01 · Help's Quick Navigation omits Compare, Insights, Message Board and Contact** — Low (X-02). *Effort:* S.
- **HC-02 · Contact's cross-referral copy** — see H-02.
- **HC-03 · Heading order skips levels on both pages** (axe `heading-order`) — Low.

### 3.13 Administration `/admin` (21 sections), `/timeslots`, `/admin/notifications`, playoff admin

**Works well (observed with a mocked admin):** the approval sheet "Record the result" (reads the report, four legal results, one confirm — `admin/pending-approve-dialog--m390.jpg`); Live Corrections' dialogs ("Edit round 1", "Delete round 1? — Keep round / Delete round", "Change game 1 winner") with the best destructive copy in the app and archived-season locking; Requests cards with Approve/Deny and an admin-notes dialog; Notifications with an expiry field, EXPIRED tag and instant list refresh (`admin/notifications-posted--m390.jpg`); Divisions' inline validation; League Night's integrity cards and one-tap repair; the Timeslots date-scoped table with a confirm on delete; every destructive action we opened had a confirmation (B-11 holds). The write-guard log shows zero real writes during 64 admin tests.

- **A-01 · Admin sections have no URLs: Back leaves the console, links can't be shared, and the mobile menu doesn't follow programmatic switches — High.** *Observed:* after approving a submission in Pending, pressing Back lands on `/` (J9); after League Night's "Live corrections" quick action the phone menu still shows the *Operations* group open and nothing highlighted (`admin/ln-quick-action-live-corrections--m390.jpg`, `navState.groupsOpen = []`). *Code:* `AdminSidebar.tsx` keeps the tab in `sessionStorage`; `AdminMobileNav.tsx:128-133` computes open groups once. *Recommend:* `/admin/:section` routes (or `?tab=`) with `useSearchParams`; derive the open group from the active tab. *Effort:* M. *Accept:* Back returns to the previous section; `/admin/pending-matches` opens Pending; the active item is highlighted after a quick action.
- **A-02 · Collapsed desktop sidebar has 21 unnamed icon buttons and drops its only badge — High (a11y).** *Observed:* axe `button-name` **critical ×21** after collapsing (`admin/sidebar-collapsed--d1440.jpg`, `collapsedNames` all empty); `aria-current` count 0 in both states. *Recommend:* `aria-label={label}` + `title` on each item, keep the badge outside the `!isCollapsed` guard, `aria-current="page"` on the active item. *Effort:* S. *Accept:* axe 0 `button-name` when collapsed; screen reader announces "Scores, current page".
- **A-03 · Mass Score Entry hides tonight's matches behind collapsed date and timeslot groups and opens on the *latest* scheduled date — High.** *Observed:* the section opens with the date group collapsed ("Thursday, September 3, 2026 ▾") and "Submit All Changes" disabled; nothing is enterable until two taps (`admin/tab-scores--d1440--fold.jpg`, `admin/scores-option-tapped--m390.jpg` shows the calendar popover covering the form). *Code:* `useScoreEntryData.ts:99-107` picks `[0]` of a date-descending sort, so once next week's schedule exists the tab opens on a night with no scores to enter, and the empty state blames "your current filters" (`MatchesTable.tsx:79`); the submit button is at the bottom of a 20-match list with no sticky bar. *Recommend:* default to the most recent date ≤ today; expand the first group; sticky Submit bar; rename the toast "✅ Matches Submitted / 2 match(es) successfully submitted. (2 saved, 0 failed.)" to "Scores saved — 2 matches". *Effort:* S–M. *Accept:* on league night the tab opens on tonight with the first timeslot expanded and Submit visible without scrolling.
- **A-04 · Selecting one timeslot books two, and the grid truncates team names to ambiguity — Medium.** *Observed:* one team + "6:30 PM" + Confirm produced a single request with **two** rows (6:30 PM and 7:00 PM, `admin/timeslots-double-tap-confirm--m390.jpg`); nothing on the chips says a block pair is booked. At 390 px tiles read "Bag Ass…", "Baggin' …", "Baggin …" (Baggin' & Braggin' vs Baggin Rights indistinguishable). Date defaults to today (a Monday) rather than the next Thursday, unlike Match Creation (`useBatchMatchForm.ts:16-27`). *Code:* `TimeslotAssignment.tsx:44` dead single mode; no `disabled` while submitting (`:309-328`). *Recommend:* label chips as blocks ("6:30 + 7:00 block"), show two-line names or logo + full name on wrap, default the date to the next Thursday, add an in-flight disabled state. *Effort:* S. *Accept:* the confirmation reads "Booked 3 Amigos for the 6:30/7:00 block"; names are unique at 360 px.
- **A-05 · Approving a request changes only a status word — High (inferred, code).** `useTeamRequests.ts:99-104` writes `status/admin_notes/processed_by`; a TIME_CHANGE approval moves nothing and the dialog offers no route to Timeslots (`admin/requests-approve-dialog--m390.jpg`: "Approve Request" with notes only; no success toast captured after confirm). *Recommend:* after approve, toast "Approved — now move {team} to {requested_timeslot} in Timeslots" with an action calling `switchAdminTab('timeslots')`; wrap `mutateAsync` in try/catch so a failure doesn't leave the dialog open with a live button (`RequestsTab.tsx:44-56`). *Effort:* S. *Accept:* the admin can reach the matching Timeslots date from the approval toast.
- **A-06 · Auto Schedule's Export step claims matches were created and links to an empty form — High (inferred, code + screenshot).** `ExportTab.tsx:34,53,57,111-117` ("{n} matches have been created", "Go to the Batch Matches tab"); Match Creation owns separate state, so the button lands on a blank form. Observed: tab 3 rendered (`admin/tab-auto-schedule-3-export--m390.jpg`); the page also carries a **Beta** badge and a "🔍 Diagnostic Panel" with ✅/❌ badges (`DiagnosticPanel.tsx:129-162`). *Recommend:* delete the button, say "N matches ready — press Save", show the Save button on the Matches tab in preview mode too (`MatchesTab.tsx:111,134`), rename the diagnostic panel "Team assignments". *Effort:* S. *Accept:* no copy says matches exist before Save; Save is visible on tabs 2 and 3.
- **A-07 · Unsaved work is lost on any section switch — High (inferred, code; partially observed).** No route blocker exists; `AutoScheduleTab.tsx:75-88` is the only `beforeunload` and it ignores generated-but-unsaved schedules (`index.ts:185-189`); Mass Score Entry keeps local edits (`useScoreEntryData.ts:68`) but switching sections discards them silently; the hero-card form replaces the list with no guard (`HeroCardsTab.tsx:33-35`); `ScoreSubmissionModal` resets on backdrop tap. *Recommend:* one `useUnsavedChangesGuard(dirty)` hook (beforeunload + `window.confirm` in `AdminSidebar.handleTabChange`) wired to Mass Score Entry, Auto Schedule, Hero form, Edit Round and Blind Draw settings. *Effort:* M. *Accept:* switching sections with unsaved scores asks first.
- **A-08 · Help tab is inert and misdirects — Medium.** `help/GettingStartedTab.tsx:163-182` prints raw ids ("batch-matches") as badges, "Run Playoffs" targets Match Creation, 11 of 21 sections undocumented (observed: `admin/tab-help--m390.jpg`). *Recommend:* make each step a button calling `switchAdminTab`, show labels, fix step 6, list every section. *Effort:* S.
- **A-09 · Orphan admin routes duplicate sections with drifted copy — Medium.** `/timeslots` ("Weekly Timeslot Assignments") and `/admin/notifications` ("Admin Notifications") render as admin (`admin/orphan-timeslots--m390.jpg`, `admin/orphan-admin-notifications--m390.jpg`) but nothing links to them; `Timeslots.tsx` bypasses the hook the tab uses and has different toasts (`Timeslots.tsx:59-62` vs `TimeslotsTab.tsx:41`). *Recommend:* `<Navigate to="/admin" replace />` for both and delete the pages. *Effort:* S.
- **A-10 · Pending queue: Reject has no confirmation, conflicting reports for the same match are not grouped, four names for one queue — Medium.** *Observed:* two submissions for the same match rendered as independent cards (`admin/tab-pending-matches--m390.jpg`); Reject fires immediately (`ScoreSubmissionsList.tsx:93-101`); menu "Pending", heading "Score submissions", badge "Pending Review", tile "Score reports". *Recommend:* group by match with a "2 reports disagree" banner, `ConfirmDialog` on Reject, one noun ("Score approvals"). *Effort:* S–M.
- **A-11 · Live Corrections opens on "All seasons" with no date or team filter; on a phone the detail panel is below the whole list — Medium.** *Observed:* selecting a match scrolls nowhere (`scrollY` unchanged, `admin/lc-match-selected--m390.jpg`); "Clear selection" is a ghost button at the bottom right. *Recommend:* default to the active season + tonight; `scrollIntoView` on selection; a "Back to list" affordance. *Effort:* S.
- **A-12 · Seasons: archived seasons remain editable, only the active season can be archived, end date is not validated — Medium (inferred; edit buttons observed on every archived card in `admin/tab-seasons--d1440.jpg`).** `SeasonsList.tsx:130-140`, `SeasonManagementTab.tsx:90`, `SeasonForm.tsx:22-26`. *Effort:* S.
- **A-13 · Contact Inbox: one row's action disables every row; support tickets can't be deleted with no explanation — Low.** `ContactInboxSection.tsx:169-170,289,299,140`. *Effort:* S.
- **A-14 · Participation table has no overflow wrapper, exports a UUID-named CSV without quote escaping — Low.** `SeasonParticipationTab.tsx:211,94,100` (axe `scrollable-region-focusable` on 390). *Effort:* S.
- **A-15 · Teams pane breaks at `sm:` while the shell breaks at `md:`; no team delete; "Hero" vs "Hero Cards" labels; logo status uses emoji values — Low.** `TeamListMobile.tsx:93`, `TeamTableDesktop.tsx:111`, `AdminSidebar.tsx:120` vs `AdminMobileNav.tsx:62`, `BulkLogoUpdateTab.tsx:165-167`. *Effort:* S.
- **A-16 · League Night: header says "Everything here is read-only" above a "Repair now" button; quick actions cover 2 of ~9 league-night jobs; SQL editor link one tap away — Medium.** (`admin/tab-league-night-status--m390.jpg`; `LeagueNightStatusTab.tsx:130-132,256-292`). *Recommend:* add Timeslots, Match Creation, Notifications, Blind Draw and Playoffs to quick actions; move the developer links under a "Developer" disclosure; fix the header copy. *Effort:* S.
- **A-17 · Blind Draw "Clear All" has no pending state; Themes toggle disables every switch while one saves; both toast without descriptions — Low.** `BlindDrawSignupsTab.tsx:166-171`, `ThemeManagementTab.tsx:80,26-37`. *Effort:* S.
- **A-18 · Match Creation: validation says "Please fill in all match details" with no row highlighted, the toast is titled "Notification Error", courts are numbered per row across the night, timeslot list includes 10:00 PM which the scheduler never produces — Medium.** *Observed:* empty submit → toast "Notification Error — Please fill in all match details" (`admin/batch-create-empty--m390.jpg`). *Code:* `useBatchMatchForm.ts:77-112,142`, `MatchPairsList.tsx:28-40` vs `constants.ts:101-103`. *Effort:* S.
- **A-19 · Power Score Review / Sandbox address the admin as a developer** ("run the Lovable prompt from the pull request…", "copy-paste into the Supabase SQL editor") — Low. `PowerMigrationReviewTab.tsx:63-83`, `PowerScoreSandboxTab.tsx:63-68`. Review's status RPC is admin-only; it showed its error state under the harness (`admin/tab-power-migration--m390.jpg`), which itself reads well.
- **A-20 · Playoff admin is reachable only from the public Playoffs page; bracket admin toolbar works on phones (B-24 verified)** — see X-03.

### 3.14 Journey walkthroughs (what the nine tasks felt like)

| # | Journey | Result | Friction found |
|---|---|---|---|
| J1 | First-time visitor: understand the league, find how to join | **Partial** | No join CTA (H-01); Teams page shows no teams on a phone (T-01); Help answers "how do I" only after expanding accordions; the mobile menu is fine (`journeys/J1/04-menu-open--m390.jpg`). |
| J2 | Find my team and my next match | **Works, with detours** | Home shows "My matches" for a member; the row links to bare `/schedule` (SC-04); Schedule opens on a future empty date (SC-01); My Team's "Leave Team" button is clipped off-screen at 390 px (`player/my-team--m390.jpg`) and the page has no next-match summary. |
| J3 | Find an outstanding match and its status | **Works** | Completed cards are excellent (FINAL, WON, H2H, tags); the date strip's window (Fri 4 → Thu 17 on Mon 7) excludes the last league night; on the Completed tab the strip highlights Thu 10 while the carousel shows Thu 3 (`journeys/J3/04-schedule-date-thu3--m390.jpg`); five of six timeslot groups collapsed. The public score-report modal could not be opened because production has no pending matches; it was exercised with a fixture in the player pass. |
| J4 | Enter scores, correct a mistake, know the state | **Works (best flow in the app)** | See §3.4; only LS-01/LS-02 clarity issues and the offline gap (LS-03). Admin approval and corrections: A-03, A-10, A-11. |
| J5 | Follow a result → team → standings → history → playoffs | **Works** | Team names on cards link to team pages; standings rows link back; History expands; Playoffs for the current season is three empty cards (PO-03). |
| J6 | Understand rankings | **Fails on-page** | No explanation of Power/SOS/colours on `/stats` (ST-01); Compare deep links and reloads lose the selection (CP-01 **confirmed**: the URL is rewritten to `/compare` on load). |
| J7 | Follow a bracket on a phone | **Partial** | Rounds beyond the first are off-canvas with no hint; names ≈8 px; season selector disagrees with the bracket (PO-01, PO-02). |
| J8 | Read or contribute to league communication | **Works** | Board filters, compose and post fine (fixture data); Contact validation and "Message Sent!" confirmation good; two entry channels (H-02). |
| J9 | Run league night | **Partial** | League Night → Pending → approve works in two taps; Back exits the console (A-01); Scores opens collapsed (A-03); no path to Timeslots/Notifications/Playoffs from League Night (A-16, X-03); every section starts below the phone menu (X-06). |

---

## 5. Prioritized implementation backlog

Effort: S = under half a day, M = 1–3 days, L = a week or more. Items reference findings above.

### 5.1 Quick fixes (S, low risk, high confidence)

✅ marks an item that has been implemented.

| # | Item | Findings | Priority |
|---|---|---|---|
| Q1 ✅ | Change the header breakpoint so the hamburger shows below 1024 px | X-01 | Critical |
| Q2 ✅ | Every phone dialog puts the primary action lowest — fixed at the source by dropping `flex-col-reverse` from `DialogFooter`/`AlertDialogFooter` (leave `DrawerFooter` unchanged) | X-05 | Medium |
| Q3 ✅ | Fix Compare deep links: delay the URL-sync effect until the init-from-params effect has run (initialized ref), so empty params are never written over incoming ones | CP-01 | High |
| Q4 ✅ | Add "Forgot password?" + `/reset-password` route, with `resetPassword`/`updatePassword` in `AuthService` and the auth hook | X-04 | High |
| Q5 ✅ | `aria-label`/`title` on collapsed sidebar items; badge outside the collapse guard; `aria-current` | A-02 | High |
| Q6 ✅ | Mass Score Entry: default to the latest date ≤ today, expand the first group, sticky Submit | A-03 | High |
| Q7 ✅ | Delete the Auto Schedule "Go to Batch Matches" exit; fix its copy; show Save on tab 2 | A-06 | High |
| Q8 ✅ | Requests approve → toast with "Move team in Timeslots" action; try/catch around approve | A-05 | High |
| Q9 ✅ | Teams page: expand the first division on mobile; make chevrons real toggles with names | T-01, X-09 | High |
| Q10 ✅ | Schedule empty state with "See last night's results →" and a default that prefers the last played date | SC-01 | High |
| Q11 ✅ | Power Score info popover + colour legend on `/stats` | ST-01 | High |
| Q12 | Label both `<nav>`s, single `h1` per page, `<section>` instead of nested `<main>` | X-08 | Medium |
| Q13 | Names on Compare selects/swap; sr-only title on the command palette | X-09 | Medium |
| Q14 | Min 24 px tap rows and 12 px labels on Home, Stats, Teams, History, footer | X-10, H-03, HI-01 | Medium |
| Q15 | Darken `--muted-foreground` for light theme; underline in-text links | X-11 | Medium |
| Q16 | Hide the notification badge when signed out | X-15 | Low |
| Q17 | Redirect `/timeslots` and `/admin/notifications` to `/admin`; delete the pages | A-09 | Medium |
| Q18 | Help tab: make steps navigate; fix "Run Playoffs" target; list all 21 sections | A-08 | Medium |
| Q19 | Rename the realtime pill ("Live updates: on/off"), add a per-round "Saved" confirmation | LS-01 | Medium |
| Q20 | Suppress the "round number moved" toast for the scorer's own save | LS-02 | Medium |
| Q21 | "Leave Team" button wraps inside the membership card at 390 px | J2 / MT | Medium |
| Q22 | Bracket: swipe hint, focusable scroll container, `alt`/`aria-hidden` on participant logos, larger names | PO-01 | High |
| Q23 | Playoffs: derive season from `?bracket=`; put `season` in the URL | PO-02 | Medium |
| Q24 | Timeslots: label chips as blocks, default date to next Thursday, disable Confirm while submitting | A-04 | Medium |
| Q25 | One vocabulary: "Score approvals", "Reject", "Match Creation"; `MATCH_STATUS_LABELS` | X-13 | Medium |
| Q26 | Match Creation validation names the row; toast title "Missing details" not "Notification Error"; per-timeslot court numbers; block-time list | A-18 | Medium |
| Q27 | League Night: fix header copy; add Timeslots, Match Creation, Notifications, Blind Draw, Playoffs quick actions; tuck developer links away | A-16, X-03 | Medium |
| Q28 | Insights: drop self-pairing rows, show percentages | IN-01 | Medium |
| Q29 | Pending: confirm on Reject; group conflicting reports | A-10 | Medium |
| Q30 | Seasons: disable Edit on archived, allow Archive on inactive, validate end ≥ start | A-12 | Medium |

### 5.2 Workflow improvements (M)
| # | Item | Findings |
|---|---|---|
| W1 | URL-addressable admin sections (`/admin/:section`) + mobile menu that follows the active section | A-01, X-06 |
| W2 | Mobile admin menu as a drawer behind a sticky "Sections" button; Quick Access stays visible | X-06 |
| W3 | Unsaved-changes guard hook wired to Mass Score Entry, Auto Schedule, Hero form, Edit Round, Blind Draw | A-07 |
| W4 | URL state for Schedule date/search, Standings view, team-page section; Home "my match" deep link | X-14, SC-04, T-03 |
| W5 | Offline banner + chunk-load recovery in the route boundary | X-12 |
| W6 | Live scoring offline queue (persist taps, flush on reconnect, "waiting to sync") | LS-03 |
| W7 | One contact form with a unified "What is this about?" select; compact home card | H-02 |
| W8 | Schedule filters: division chips + "My team" | SC-02 |
| W9 | Playoffs pre-bracket state: projected seeds + "brackets open after week X" | PO-03 |
| W10 | Live Corrections defaults (active season, tonight), scroll-to-panel, back affordance | A-11 |
| W11 | Consolidate navigation: remove `DesktopNav`, add Compare/Insights to palette and Help, show Admin in nav for admins | X-02, X-03 |
| W12 | Pending queue grouping by match with conflict banner | A-10 |

### 5.3 Larger changes (L)
| # | Item | Findings | Why it is worth it |
|---|---|---|---|
| L1 | One status model: `deriveMatchStatus()` used by Schedule, Home, Pending, Corrections, Live scoring, Playoffs; excludes postponed/canceled from queues | X-13 | Removes five vocabularies and the canceled-match leak into admin queues |
| L2 | Theme tokens for winter/light/dark instead of 77 files of inline branches; fixes the light-mode contrast class of bugs at the source | X-11, code §7 | Every new component today has to remember three branches |
| L3 | Responsive table primitive (`TableHead` with default `scope`, card-mode below `md`) replacing the duplicated mobile/desktop rankings, career and H2H views | code §4d, ST-04 | 9 admin tables lack `scope`; three ranking components are duplicated |
| L4 | Request approval that performs the requested change (timeslot move / bye) or opens Timeslots prefilled | A-05 | Turns a status flip into the actual league-night action |

---

## 6. Recommended first implementation batch

Goal: one league night's worth of pain removed with small, verifiable commits. Order matters only where noted.

| Step | Change | Depends on | Verify |
|---|---|---|---|
| 1 | **Q1** header breakpoint `md:` → `lg:` (`NavLinks.tsx`, `MobileMenu.tsx`, `Navbar.tsx`) | — | Playwright at 768 and 820 px: `getByRole('button', {name: 'Open menu'})` visible; Login reachable; axe `button-name` = 0 on `/`. |
| 2 | **Q2** round-correction dialogs via `ResponsiveDialog` | — | Render `EditRoundDialog`, `DeleteRoundDialog` and `ChangeGameWinnerDialog` at 390 px in tests and assert the primary button's `getBoundingClientRect().top` is greater than Cancel's; `ScoreSubmissionModal` and `ApproveSubmissionDialog` keep passing the same assertion. |
| 3 | **Q3** Compare URL-sync ordering fix | — | Unit test: mount `/compare?team1=a&team2=b` with teams resolving after mount → both selects populated and `setSearchParams` never called with empty values; second test: reload with the UI-produced URL restores the selection. |
| 4 | **Q5** sidebar names + `aria-current` | — | Existing `e2e/a11y.spec.ts` admin scan with the sidebar collapsed; assert `[aria-current="page"]` exists. |
| 5 | **Q6** Mass Score Entry defaults + sticky Submit | — | Unit test for the date default with a future date present; e2e: Submit button in viewport on load at 390 px. |
| 6 | **Q7 + Q8** Auto Schedule exit copy; Requests approve toast + try/catch | — | Unit tests on `ExportTab` copy and `RequestsTab` failure path (dialog shows error, stays open). |
| 7 | **Q9 + Q10** Teams mobile default expand; Schedule empty state | — | e2e at 360 px: ≥ 8 team cards visible on `/teams`; `/schedule` with no matches on the selected date shows the "See results from …" link. |
| 8 | **Q11** Power Score popover | — | e2e: clicking the info icon on `/stats` shows the formula text; axe passes. |
| 9 | **Q4** Forgot password (service + hook + route) | Supabase email template + redirect URL configured | Unit test on `AuthService.resetPassword`; manual: request reset, follow link, set password, land signed in. |
| 10 | **Q12 + Q13 + Q14** landmark labels, single `h1`, control names, tap sizes | — | `e2e/a11y.spec.ts` extended to `/schedule`, `/compare`, `/insights`; harness tap scan 0 under 24 px on `/`. |
| 11 | **W1** URL-addressable admin sections | after 4 (sidebar) | e2e: `/admin/pending-matches` opens Pending; browser Back returns to the previous section; `switchAdminTab` still works. |
| 12 | **W3** unsaved-changes guard | after 11 (route change hook) | e2e: enter a score, switch section → confirm prompt; cancel keeps the edit. |

Each step is one commit (per `CLAUDE.md`), run `npm run typecheck`, `npm run lint`, the touched unit tests, and `npm run e2e` for steps 1, 7, 8, 11.

---

## 7. Remaining coverage gaps and what would close them

| Gap | Why it could not be verified here | What is needed |
|---|---|---|
| Real admin session against live admin-only data (score submissions, contact inbox, membership approvals, blind-draw signups, counter drift, Power Score Review status) | No staging Supabase credentials in the sandbox; fixtures were used and are labelled in §2.2 | A Supabase **branch** (never production) plus `E2E_SUPABASE_*` and a test admin login; then re-run `specs/30-admin.spec.ts` with `rewriteAuth=false` |
| Realtime behaviour (the "Live" pill, reconnect toasts, second-scorer conflicts, notifications badge updates) | WebSocket blocked so the fake token never left the browser | Same staging project; run two browser contexts scoring the same match |
| Installed PWA: manifest, icons, splash, standalone back button, safe areas on notched devices | Manifest and service worker are hosted by Progressier and not in the repo | Install on an iPhone and an Android phone; inspect the Progressier dashboard for manifest values |
| Real devices: landscape on a notched phone, iOS Safari toolbar behaviour with the fixed bottom nav, native share sheet | Headless Chromium only | 30 minutes on an iPhone 13/15 and a Pixel; the harness screenshots show where to look |
| Score report edge function and contact email delivery | Functions were answered locally | Send one real report/contact on staging and confirm inbox + email |
| Winter theme | Disabled in production settings; not exercised | Enable it on staging and re-run the light-theme probe |
| Performance measurements | Lighthouse runs in CI (`lighthouserc.json`); the harness only recorded time-to-content (avg 2.0 s navigation + 4.9 s settle on a shared 4-core sandbox), not comparable to a phone | Lighthouse mobile run against `https://717rec.app` from a real network; watch the bracket viewer bundle and recharts chunks |
| Schedule "Maximum update depth exceeded" | Seen once in 125 loads, not reproducible on demand | React DevTools profiling of `useScheduleTabs` with the date changed rapidly |

**Harness:** every screenshot and metric in this report was produced by the Playwright scripts in the session scratchpad (`audit/specs/*.spec.ts`, `audit/lib/*.ts`). They were not committed; they read production only as an anonymous user through a relay that rewrites the Authorization header to the anon key and aborts all writes. If you want them re-runnable from the repo, they fit under `tools/ux-audit/` unchanged.

