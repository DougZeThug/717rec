# Hand verification

The feature documents were written from the code and the tests. This directory is
the protocol for checking them against the running app, one observable claim at a
time.

## What is here

| File | Covers |
| --- | --- |
| [foundations.md](foundations.md) | `foundations/*` |
| [getting-started.md](getting-started.md) | `getting-started/*` |
| [home-and-teams.md](home-and-teams.md) | `home/*` and `teams/*` |
| [schedule-and-scores.md](schedule-and-scores.md) | `schedule/*` and `scores/*` |
| [live-scoring.md](live-scoring.md) | `live-scoring/*` |
| [standings.md](standings.md) | `playoffs/*`, `stats/*`, and `history/*` |
| [community.md](community.md) | `message-board/*` and `help/*` |
| [admin.md](admin.md) | `admin/*` |
| [cross-cutting.md](cross-cutting.md) | `cross-cutting/*` |

Each file has one table per document. Each row is an item with a stable ID
(`CONTACT-07`, `ROUND-12`), a priority, what it needs, the claim with a link to
the document section, the setup, numbered steps, the expected result, and a
Result column for the tester. Items that cannot be checked by hand are listed
under each document as "Not checkable by hand".

Priorities: **P1** is an established fact, a claim many documents depend on, or a
suspected bug; **P2** is an ordinary claim; **P3** is a number, a colour, or a
timing.

## How to run a pass

1. **Bring up the app.** From the repo root:

   ```sh
   npm ci
   npm run dev      # http://localhost:8080
   ```

   No `.env` is needed. The app carries working public credentials, so the dev
   server talks to the league's real database. **That means every write you make
   during a pass is a real write to the real league.** Use a throwaway account,
   and never run write items against a match, team, or season that matters.

   For anything involving a signed-in player or an admin you need real accounts.
   There is no seeded test data and no local database.

2. **Confirm the commit.** Every document ends with ``Verified against `717rec`
   commit `ea5c8f4` ``. Run `git rev-parse --short HEAD`. If the app code has
   moved on since `ea5c8f4`, some failures will be drift rather than defects.

3. **Keep the document open beside the app.** Read the linked section before each
   item; the item is a summary, the section is the claim.

4. **Work through P1 first** across all files, then P2, then P3.

5. **Record `pass`, `fail`, or `blocked`** in the Result column, with a note for
   anything other than a clean pass. A fail is something the document says that
   the app does not do. A blocked item could not be run — no second account, no
   phone, no live match to hand.

6. **File every fail** in [`bug-triage.md`](../bug-triage.md). If the entry
   exists, add a Status line quoting the item ID; if not, add an entry with the
   item ID under "Raised by". A fail is not automatically a product bug —
   sometimes the document is wrong, and the fix is to the document. The Status
   line says which.

7. **When every P1 and P2 item for a document has passed or been filed**, change
   its row in the [coverage table](../README.md#coverage) from `drafted` to
   `verified`.

## Devices and conditions

- **browser** — a desktop browser at a normal window width. The default for every
  item that does not say otherwise.
- **phone** — a real phone, or a browser at 390 × 844 with touch emulation on.
  Live scoring is designed phone-first and several claims are only meaningful
  there.
- **visitor** — signed out. Use a private window; signing out in one tab signs
  out the others.
- **player** — signed in, with a completed profile, with an **approved**
  membership of a named team. An unapproved membership is a different condition
  and grants nothing; several items depend on the difference.
- **admin** — signed in with the admin flag. There is no partial admin.
- **second scorer** — a second account, on a second device or in a second
  browser, with an approved membership of the *other* team in the same match. A
  second tab in the same browser is **not** the same thing for realtime items:
  it shares a session and can mask a bug that two real users would hit.
- **offline** — the network genuinely unavailable. The devtools offline toggle is
  close enough for ordinary requests, but it does not drop an open realtime
  websocket the way losing signal does; for live-scoring items, use aeroplane
  mode on a real phone.
- **slow** — a throttled connection. Needed for any claim about what is visible
  *while* a request is in flight; on a fast connection those states flash past.

## Driving the app from a script

Most of this app is not scriptable in a useful way: the claims are about what is
on screen, and there is no console handle on the app's state. Playwright can
drive it, and the repo already has specs under `e2e/` that read as partial
verification passes — `score-submission.spec.ts`, `admin-mass-score.spec.ts`,
`admin-access.spec.ts`, `playoff-bracket.spec.ts`. Running them needs
`E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`,
`E2E_TEST_USER_EMAIL`, and `E2E_TEST_USER_PASSWORD`.

Use a script to **observe**, not to act, wherever the item is about input. Two
traps in particular:

- A scripted click does not reproduce a thumb on a phone, and several live
  scoring claims are about whether a control can be hit at speed.
- A script cannot judge whether a message was noticed. "A toast appears" is
  scriptable; "the scorer sees the toast before it is replaced" is not.

## Results so far

**One automated pass was run** on 2026-08-25, against commit `ea5c8f4`, on the
dev server, in Chromium, **signed out only**.

What it covered and what it found:

| Item | Result |
| --- | --- |
| All 13 public routes render content when signed out | pass (13/13) |
| `/admin`, `/admin/notifications`, `/timeslots` redirect a signed-out visitor to `/auth` | pass (3/3) |
| An unknown route shows "Page Not Found" | pass |
| `/my-team` signed out shows a "Join a team to participate…" prompt, not an error | pass — answers an open question in `foundations/accounts-and-roles.md` |
| `/message-board` signed out shows "Sign in to post messages" and a Sign In button | pass — answers the same open question |
| Submitting an empty contact form shows all four field messages and sends nothing | pass |
| No field is focused on arrival at `/contact` | pass |
| The contact form's hidden bot trap exists, with `tabindex="-1"` and `aria-hidden="true"` | pass |
| **Scroll position carries across an in-app navigation** | **confirmed defect** — scrolled to 337px on `/schedule`, clicked through to `/help`, still at 337px |
| **The support function refuses the dev origin** | **confirmed defect** — a preflight from `https://717rec.app` returns `access-control-allow-origin`; one from `http://localhost:8080` returns none |

**What this pass did not cover, and why it matters:**

- **Nothing signed in.** No player, no admin, no second scorer. That is the
  majority of every checklist in this directory, and all of `live-scoring/`,
  `scores/`, and `admin/`.
- **No data-dependent claim.** The container the pass ran in could not reach the
  league's database from inside the browser, so every page rendered its frame
  with no league data in it. Every claim about what a populated schedule,
  standings table, bracket, or team page looks like is **unverified**.
- **Nothing visual.** No screenshot was compared, no colour, no spacing, no
  animation, no layout at any width.
- **No timing.** Nothing about how long a state is visible, whether a toast is
  read before it is replaced, or how a loading state feels.
- **Nothing on a phone.**
- **No realtime.** Two scorers on one match is the central case in live scoring
  and was not exercised at all.

One thing the pass revealed by accident and is worth a deliberate item: with the
database unreachable, `/stats` rendered **no message at all** between the
navigation bar and the footer — no error, no empty state, no visible loading
state. That matches the concern raised in
[`foundations/messages-to-the-user.md`](../foundations/messages-to-the-user.md)
about silent failures and should be checked properly with the network throttled
or blocked.

**No document is marked `verified`.** An automated pass on its own is not enough,
and this one reached only a fraction of what the checklists ask for. The two
confirmed defects are filed in [`bug-triage.md`](../bug-triage.md) and carry a
Status line quoting their item IDs.
