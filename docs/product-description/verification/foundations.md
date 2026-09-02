# Verification: foundations

How to run this file: most of these items need no data of your own, but several
need a **second season**, an **admin**, and a **second browser**. Start signed
out in a private window for the visitor items, then sign in as a player, then as
an admin. Between sections, reload rather than navigating, so the cache is
genuinely empty. Device values: `visitor`, `player`, `admin`, `browser`,
`phone`, `offline`, `slow`, `second browser`.

## foundations/league-objects.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OBJ-01 | P1 | browser | A game is first to 21 and must be won by two; there is no cap ([Game](../foundations/league-objects.md#game)). | A completed match whose game went past 21. | 1. Open a finished match's live scoring review.<br>2. Read the game scores. | At least one game in league history ends above 21, e.g. 23–21. No game ends at 21–20. | — |
| OBJ-02 | P1 | browser | A match is best of three; two game wins takes it ([Match](../foundations/league-objects.md#match)). | Any completed match. | 1. Open its review.<br>2. Count the completed games. | No completed match has more than three games, and the winner has exactly two game wins. | — |
| OBJ-03 | P2 | browser | Only one side scores in a round; a tied round scores nothing ([Round](../foundations/league-objects.md#round)). | A match with a round history. | 1. Open the round-by-round history.<br>2. Find a round where both sides threw equally. | The round is listed and adds nothing to either total. | — |
| OBJ-04 | P2 | browser | A side has at most two players ([Round](../foundations/league-objects.md#round)). | Live scoring on an open match, as a scorer. | 1. Open game setup.<br>2. Try to tick a third name for one team. | The third name cannot be ticked. It is shown disabled, not hidden. | — |
| OBJ-05 | P2 | visitor | A hidden team disappears from listings but its past matches still count ([Division](../foundations/league-objects.md#division)). | A team known to be in the Hidden division. | 1. Open `/teams` and search for it.<br>2. Open a past opponent's team page and find that fixture. | The team is absent from `/teams`. The opponent's record still includes the result. | — |
| OBJ-06 | P2 | browser | A team persists across seasons, which is what makes career numbers possible ([Team](../foundations/league-objects.md#team)). | A team that has played more than one season. | 1. Open its team page.<br>2. Compare its season record with its career record. | Both are shown and they differ. | — |
| OBJ-07 | P3 | browser | Bags in, on, and off are optional detail; a round can be recorded by points alone ([Round](../foundations/league-objects.md#round)). | Live scoring, a score with no ambiguity, e.g. 5. | 1. Tap 5 for one side and 0 for the other.<br>2. Save. | The round saves without asking any further question. | — |
| OBJ-08 | P1 | browser | A player may exist without an account ([Player](../foundations/league-objects.md#player)). | Live scoring game setup, as a scorer. | 1. Add a player by typing a name.<br>2. Look for that name on the team's roster. | The player appears on the roster with no account and no invitation. | — |

Not checkable by hand:

- Whether the app prevents the same player being on two teams in one season, and
  what the statistics pages do if it happens. Needs a database that can be put in
  that state deliberately.
- Whether there are exactly four divisions and whether those are their current
  names. Ask the league.

## foundations/seasons.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEAS-01 | P1 | visitor | Pages that do not name a season show the active season ([The simple case](../foundations/seasons.md#the-simple-case)). | Signed out. | 1. Open `/schedule`, `/stats`, `/teams`.<br>2. Look for any season control. | No page offers a season picker. Each shows the current season's data. | — |
| SEAS-02 | P1 | admin, second browser | After a season changeover, a user already in the app keeps seeing the old season for up to ten minutes ([Realtime](../foundations/seasons.md#interactions-with-other-systems)). | Two browsers: one admin, one player already on `/stats`. | 1. In the player browser, load `/stats` and leave it.<br>2. In the admin browser, activate a different season.<br>3. Watch the player browser without touching it for 12 minutes. | The player's standings do not change on their own. They change only after a reload, or after leaving the tab and returning past the ten-minute window. **(suspected: worth timing exactly)** | — |
| SEAS-03 | P1 | admin | Nothing tells a player that a season changed over ([Toasts and notifications](../foundations/seasons.md#interactions-with-other-systems)). | As SEAS-02. | 1. Perform the changeover.<br>2. Watch the player browser. | No toast, no banner, no notification. Record what happens. **(suspected bug)** | — |
| SEAS-04 | P2 | visitor | Archived seasons are readable through history and their numbers are frozen ([What "frozen" means](../foundations/seasons.md#what-frozen-means)). | An archived season. | 1. Open `/history` and note a team's power score in an archived season.<br>2. Return a week later, or after any formula change, and check it. | The number is unchanged. | — |
| SEAS-04b | P2 | admin | The freeze covers the raw rounds too, not only the computed numbers ([What "frozen" means](../foundations/seasons.md#what-frozen-means)). | Admin, Live Corrections, an archived season holding a live-scored match. | 1. Set the season filter to the archived season and select a match.<br>2. Read the banner and look for any edit, delete, winner or re-save control. | The rounds and totals are readable and there is no control to change any of them. A grey banner names the season and says what the freeze covers. | — |
| SEAS-05 | P2 | visitor | A link to `/schedule` means "whatever season is active when you open it" ([URL state](../foundations/seasons.md#interactions-with-other-systems)). | Any. | 1. Copy the `/schedule` URL.<br>2. Inspect it. | The URL contains no season. | — |
| SEAS-06 | P1 | admin | With no active season, each page shows an empty state rather than an error ([Edge cases](../foundations/seasons.md#edge-cases)). | A moment with no season marked active. | 1. Open `/`, `/schedule`, `/stats`, `/teams`, `/playoffs` in turn.<br>2. Record exactly what each shows. | Record what happens on each page. They are expected to differ. **(suspected: inconsistent)** | — |
| SEAS-07 | P2 | admin | The four season flags are independent and can be set in combinations that make no sense ([The four flags](../foundations/seasons.md#the-four-flags)). | Admin season management. | 1. Try to set a season both active and archived.<br>2. Try to set playoffs active on an archived season. | Record whether either is refused. **(suspected: neither is)** | — |
| SEAS-08 | P3 | admin | A match dated outside its season's dates still belongs to it, and its week number can be zero or negative ([Edge cases](../foundations/seasons.md#edge-cases)). | Admin, a test match. | 1. Set a match's date to before the season start.<br>2. Open `/schedule`. | Record which week group it falls into. | — |

Not checkable by hand:

- Whether the database enforces at most one active season or whether it is only a
  convention the admin tools follow. Needs schema inspection, not the UI.

## foundations/accounts-and-roles.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ROLE-01 | P1 | visitor | Only `/admin`, `/admin/notifications` and `/timeslots` are route-guarded ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Private window, signed out. | 1. Visit each of the 20 routes by typing the URL. | Only those three redirect. Every other route renders. **Confirmed by the automated pass on 2026-08-25 for all three.** | pass |
| ROLE-02 | P1 | visitor | A guarded route signed out redirects to `/auth` ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed out. | 1. Type `/admin`.<br>2. Watch the address bar. | Briefly "Checking access...", then `/auth`. **Confirmed 2026-08-25.** | pass |
| ROLE-03 | P1 | player | A signed-in non-admin on `/admin` sees one "Access Denied" toast and is sent home ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed in, not admin. | 1. Type `/admin`.<br>2. Count the toasts.<br>3. Note where you land. | Exactly one red toast reading "Access Denied — You do not have admin privileges", then `/`. | — |
| ROLE-04 | P2 | player | The post-sign-in redirect returns the user to the guarded page they asked for ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed out; an admin account to hand. | 1. Type `/admin` while signed out.<br>2. Sign in as an admin on the page you land on. | You arrive at `/admin`, not `/`. **(suspected: may drop you at home)** | — |
| ROLE-05 | P1 | visitor | `/my-team` has no guard and shows a join prompt, not an error ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed out. | 1. Open `/my-team`. | "Join a team to participate in matches and track your stats. Admin approval is required." **Confirmed 2026-08-25.** | pass |
| ROLE-06 | P1 | visitor | `/message-board` has no guard and offers a Sign In prompt ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed out. | 1. Open `/message-board`. | "Sign in to post messages" and a Sign In button. Messages are readable. **Confirmed 2026-08-25.** | pass |
| ROLE-07 | P1 | player, second browser | Signing out in another tab takes effect here without a reload ([Signing in](../foundations/accounts-and-roles.md#signing-in)). | Signed in, same account in two tabs. | 1. In tab A, sit on `/my-team`.<br>2. In tab B, sign out.<br>3. Watch tab A without touching it. | Tab A's signed-in controls disappear without a reload. | — |
| ROLE-08 | P1 | admin, player | An unapproved membership grants nothing ([Membership](../foundations/accounts-and-roles.md#membership)). | A player with a pending, unapproved membership request. | 1. As that player, open one of their team's open matches in live scoring. | No scoring controls. The screen is the spectator view. | — |
| ROLE-09 | P1 | admin, player | An admin approving a membership does not reach the waiting user's browser ([Realtime](../foundations/accounts-and-roles.md#interactions-with-other-systems)). | Player waiting on `/my-team`; admin in another browser. | 1. Admin approves the membership.<br>2. Watch the player's screen for two minutes without touching it. | The player still sees "waiting for approval". It changes only after a reload or a return to the tab. | — |
| ROLE-10 | P2 | player | A profile without a username sends the user to `/setup-profile` ([Profile](../foundations/accounts-and-roles.md#profile)). | A freshly registered account with no username. | 1. Sign in.<br>2. Try to navigate anywhere else. | You are taken to `/setup-profile`. | — |
| ROLE-11 | P2 | admin | Admin revoked mid-session leaves the controls on screen and the writes failing ([Edge cases](../foundations/accounts-and-roles.md#edge-cases)). | Two admins; one revokes the other. | 1. Admin A sits on `/admin`.<br>2. Admin B removes A's admin flag.<br>3. A presses an admin control. | The control is still visible. The write fails. Record what message, if any, appears. **(suspected: silently failing writes)** | — |
| ROLE-12 | P3 | player | The "Access Denied" toast is shown once per visit, not on every render ([How pages are gated](../foundations/accounts-and-roles.md#how-pages-are-gated)). | Signed in, not admin. | 1. Type `/admin`.<br>2. Count toasts over ten seconds. | Exactly one. | — |

Not checkable by hand:

- What happens to a user with approved memberships of two teams that are playing
  each other. Needs a deliberately constructed account.

## foundations/navigation.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NAV-01 | P1 | browser | **Scroll position is not reset on navigation** ([Arrive](../foundations/navigation.md#arrive)). | Any long page. | 1. Open `/schedule` and scroll down 900px.<br>2. Click an in-app link to `/help`.<br>3. Read the scroll position. | You are still scrolled down on the new page. **Confirmed defect 2026-08-25: 337px before, 337px after.** See [B-01](../bug-triage.md). **(suspected bug)** | fail |
| NAV-02 | P2 | browser | Four routes restore their own scroll position: `/teams`, `/stats`, `/history`, `/insights` ([Arrive](../foundations/navigation.md#arrive)). | Each of the four, with enough content to scroll. | 1. Scroll the route down 700px.<br>2. Navigate away and scroll the *intermediate* page to a clearly different position.<br>3. Press back. | You return to 700px, not to the intermediate page's position. The intermediate step is what distinguishes restoration from NAV-01's non-reset. | — |
| NAV-03 | P1 | browser | The first page load does not move focus or announce ([Arrive](../foundations/navigation.md#arrive)). | Fresh load. | 1. Load `/` directly.<br>2. Read the focused element. | Focus is on the body, not the main content. **Confirmed 2026-08-25.** | pass |
| NAV-04 | P1 | browser | An in-app navigation moves focus to the main content and announces the page ([Arrive](../foundations/navigation.md#arrive)). | Loaded `/`. | 1. Click an in-app link.<br>2. Read the focused element and the live region. | Focus is on the main content; the live region names the new page. **Confirmed 2026-08-25: focus `main-content`, announced "Help page".** | pass |
| NAV-05 | P2 | browser | A page not yet fetched shows "Loading page..." ([Arrive](../foundations/navigation.md#arrive)). | Throttled connection, fresh session. | 1. Open `/stats`, which is deliberately not preloaded.<br>2. Watch the middle of the screen. | A spinner reading "Loading page...". | — |
| NAV-06 | P2 | browser | Teams, schedule and history are preloaded and are usually instant ([Arrive](../foundations/navigation.md#arrive)). | Throttled, fresh session on `/`. | 1. Wait five seconds.<br>2. Navigate to `/teams`, then `/stats`. | `/teams` appears without a loading spinner; `/stats` shows one. | — |
| NAV-07 | P1 | browser | No route blocks navigation for unsaved work ([Unsaved changes](../foundations/navigation.md#interactions-with-other-systems)). | Any form part-filled, e.g. `/contact`. | 1. Type into the form.<br>2. Click a link away. | You leave immediately. No confirmation. The text is gone. | — |
| NAV-08 | P2 | browser | An unknown route shows Page Not Found ([When a page fails](../foundations/navigation.md#when-a-page-fails)). | Any. | 1. Type a nonsense path. | "Page Not Found — Oops! The page you are looking for does not exist or has been moved." with Go Home and Go Back. **Confirmed 2026-08-25.** | pass |
| NAV-09 | P2 | browser | Filters are lost on every navigation and are not in the URL ([URL state](../foundations/navigation.md#interactions-with-other-systems)). | `/schedule` with a filter applied. | 1. Filter the schedule.<br>2. Check the URL.<br>3. Open a match, then press back. | The URL never changed. The filter is gone. | — |
| NAV-10 | P2 | offline | A page whose code has not downloaded hangs on the spinner with no error ([Cancel and interrupt](../foundations/navigation.md#cancel-and-interrupt)). | Fresh session, `/` loaded, then go offline. | 1. Go offline.<br>2. Navigate to `/playoffs`, which is not preloaded.<br>3. Wait two minutes. | The spinner stays. No error, no timeout, no retry. **(suspected bug)** | — |
| NAV-11 | P3 | browser | "Home" on the route error screen is a full page load ([When a page fails](../foundations/navigation.md#when-a-page-fails)). | A page forced to fail. | 1. Reach the route error screen.<br>2. Press Home and watch the network. | The whole app reloads rather than navigating in place. | — |
| NAV-12 | P2 | browser | The first Tab reaches a skip link ([Accessibility](../foundations/navigation.md#interactions-with-other-systems)). | Any page, fresh load. | 1. Press Tab once. | Focus is on "Skip to main content". **Confirmed 2026-08-25.** | pass |

Not checkable by hand:

- Whether "Try Again" on the route error screen recovers or re-throws. Needs a
  reproducible render failure.

## foundations/saving-and-freshness.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FRESH-01 | P1 | browser | Returning to the tab refetches data older than five minutes, and the old value is shown until the new one arrives ([What makes the app go back for more](../foundations/saving-and-freshness.md#what-makes-the-app-go-back-for-more)). | `/stats` loaded. | 1. Leave the tab for six minutes.<br>2. Return and watch the numbers without touching anything. | The old numbers are visible, then update. No spinner replaces them. | — |
| FRESH-02 | P1 | browser | Within five minutes nothing refetches ([How long data is kept](../foundations/saving-and-freshness.md#how-long-data-is-kept)). | `/stats` loaded. | 1. Leave the tab for one minute.<br>2. Return and watch the network. | No request is made. | — |
| FRESH-03 | P1 | offline | There is no offline write queue; a write offline fails and is lost ([Offline](../foundations/saving-and-freshness.md#offline)). | Signed in, any form. | 1. Go offline.<br>2. Fill in a form and submit.<br>3. Go back online and wait five minutes. | The submit fails with a message. Nothing is sent when the connection returns. | — |
| FRESH-04 | P1 | offline | An offline user still looks signed in and still sees every control ([Offline](../foundations/saving-and-freshness.md#offline)). | Signed in. | 1. Go offline.<br>2. Look at the navigation and any page with write controls. | Still signed in, all controls present, nothing warns. | — |
| FRESH-05 | P1 | player, second browser | Standings have no subscription: a change by another user does not reach the browser ([Realtime](../foundations/saving-and-freshness.md#realtime)). | Two browsers on `/stats`. | 1. In browser B (admin), change something that affects standings.<br>2. Watch browser A for two minutes. | Browser A does not change. | — |
| FRESH-05b | P2 | player, second browser | The message board and match comments DO arrive live ([Realtime](../foundations/saving-and-freshness.md#realtime)). | Two browsers on `/message-board`. | 1. Post from browser B.<br>2. Watch browser A without touching it. | The message appears in browser A within a few seconds. | — |
| FRESH-06 | P2 | slow | A write's control is disabled while the request is in flight ([What "saved" means](../foundations/saving-and-freshness.md#what-saved-means)). | Throttled, signed in. | 1. Submit any form.<br>2. Watch the button. | It goes dead and shows a working label until the answer arrives. | — |
| FRESH-07 | P2 | browser | Only a handful of things poll, and they pause when the tab is hidden ([What makes the app go back for more](../foundations/saving-and-freshness.md#what-makes-the-app-go-back-for-more)). | `/schedule` with a date selected. | 1. Watch the network for three minutes.<br>2. Switch to another tab for three minutes and watch again.<br>3. Return. | Timeslot requests about every 60 seconds while in front; none while hidden; they resume on return. `/stats` and `/teams` make no periodic requests at all. | — |
| FRESH-08 | P2 | browser | A reload clears the whole cache ([Cancel and interrupt](../foundations/saving-and-freshness.md#cancel-and-interrupt)). | Several pages visited. | 1. Reload.<br>2. Navigate to a page visited a moment ago. | It fetches again. | — |
| FRESH-09 | P3 | admin, second browser | Season data is cached for ten minutes, not five ([How long data is kept](../foundations/saving-and-freshness.md#how-long-data-is-kept)). | As SEAS-02. | 1. Time how long after a season change the other browser picks it up on return to the tab. | Closer to ten minutes than five. | — |

Not checkable by hand:

- Which writes in the app are actually optimistic. Each feature's own document
  answers this; this file does not duplicate them.

## foundations/messages-to-the-user.md

| ID | P | Device | Claim | Setup | Steps | Expected | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MSG-01 | P1 | browser | Up to three toasts are shown at once; a fourth pushes the oldest out ([Toasts](../foundations/messages-to-the-user.md#toasts)). **Fixed, [B-13](../bug-triage.md#b-13-only-one-toast-is-shown-at-a-time-so-paired-messages-are-lost)** — the limit used to be one. | Anything that can raise several messages close together, e.g. bulk admin score entry. | 1. Trigger two messages within a second and count what is on screen.<br>2. Trigger four and count again. | Two toasts for the first, both readable, with a gap between them. Three for the second — the oldest is dropped. | — |
| MSG-02 | P1 | browser | A toast survives navigation and can appear over an unrelated page ([Toasts](../foundations/messages-to-the-user.md#toasts)). | Signed in. | 1. Submit something.<br>2. Navigate away immediately. | The result toast appears on the new page. | — |
| MSG-03 | P1 | slow | A failed write always produces a visible message ([What a failed write should produce](../foundations/messages-to-the-user.md#what-a-failed-write-should-produce)). | Offline, signed in. | 1. Attempt each write in the app in turn.<br>2. Record any that fail silently. | Every failure produces a red toast. Any that does not is a defect. | — |
| MSG-04 | P1 | offline | A page whose data cannot load shows an empty state or an error, not a blank area ([Empty states](../foundations/messages-to-the-user.md#empty-states)). | Network blocked. | 1. Load `/stats`, `/teams`, `/schedule`, `/playoffs` with the database unreachable.<br>2. Record what each shows. | Each shows something. **Automated pass 2026-08-25 found `/stats` rendered no message at all between the nav bar and the footer. (suspected bug)** | fail |
| MSG-05 | P2 | browser | A destructive toast is visibly an error ([Toasts](../foundations/messages-to-the-user.md#toasts)). | Any failing write. | 1. Cause a failure. | The toast is red and distinguishable from a success toast at a glance. | — |
| MSG-06 | P3 | browser | A toast dismisses itself after about five seconds ([Toasts](../foundations/messages-to-the-user.md#toasts)). | Any toast. | 1. Raise one and time it. | Around five seconds. | — |
| MSG-07 | P2 | browser | Server failure reasons are replaced by a generic per-feature sentence ([What a failure message says](../foundations/messages-to-the-user.md#what-a-failure-message-says)). | The contact form, over-length message. | 1. Submit a message longer than 5000 characters.<br>2. Read the toast. | "Failed to send message. Please try again." — advice that cannot work. See [B-02](../bug-triage.md). **(suspected bug)** | — |
| MSG-08 | P2 | browser | A development build shows error detail that the published build hides ([Edge cases](../foundations/messages-to-the-user.md#edge-cases)). | Both builds. | 1. Force a route error in each.<br>2. Compare. | The dev build shows the message; the published build does not. | — |

Not checkable by hand:

- Whether toasts are announced by a screen reader, and whether a replaced toast
  is re-announced. Needs a real screen reader; see
  [`cross-cutting/accessibility.md`](../cross-cutting/accessibility.md).
