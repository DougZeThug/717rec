# 717rec product description

A written description of the user experience of 717rec: what the user sees, what
they can do, and exactly what happens when they do it.

## Purpose

717rec is, from the user's point of view, a large state chart. The user moves
through it with clicks, form submissions, route changes, and — during a live
match — a stream of small score edits that other people see as they happen. Most
of that behaviour is defined implicitly, spread across 106 hooks, roughly 30
service areas, a Postgres schema with row-level security, and the tests that pin
them down. There is no single place that says, in plain language, "when a player
does X, this is what happens, and this is what happens if they close the tab
halfway through."

This project is that place. It describes the full experience a user has on the
717rec web app, signed in as an ordinary player in the active season, in the
default configuration with nothing customised.

The documents are for people who need to understand or change the product:
whoever runs the league, whoever changes the code, and anyone deciding whether a
behaviour is intentional. They are written from the outside in. They describe the
experience, not the implementation.

### What this is not

- **Not API or schema documentation.** That lives in
  [`ARCHITECTURE.md`](../../ARCHITECTURE.md),
  [`docs/BRACKETS_MANAGER_SCHEMA.md`](../BRACKETS_MANAGER_SCHEMA.md), and the
  generated `src/integrations/supabase/types.ts`.
- **Not organised by package.** `src/services/`, `src/hooks/`, and
  `src/components/` are not described separately. A single behaviour is described
  once, wherever the user meets it.
- **Not a technical design document.** Where a technical detail is critical to
  understanding the experience, it appears in a block quote labelled
  `Technical note:` and nowhere else.

## Conventions

- Describe the experience, not the code. "The Submit button stays greyed out
  until the league answers" rather than "the mutation sets `isPending`".
- Technical detail goes in block quotes, prefixed with `Technical note:`. Use it
  only when the mechanism changes what the user would expect.
- Use sentence case for headings.
- Name the vocabulary consistently. The [glossary](glossary.md) is the source of
  truth for terms like *season*, *division*, *match*, *game*, *round*, *power
  score*, *pending*, and *blind draw*.
- Every document ends with the commit of this repo it was verified against and a
  list of open questions.
- When a behaviour is surprising, say so and say why it is that way if the reason
  is known. Do not smooth it over.

## The work to be done

Each document describes one feature. Features are large things (entering scores
for a live match) or small things (the contact form), but each is described in
full, including its edge cases and its interactions with other features.

### Document template

Every feature document follows the same skeleton so that documents are comparable
and nothing is skipped.

1. **Summary.** One paragraph describing the feature abstractly. For example:
   "The contact form is the only way a visitor can reach the league from inside
   the app without an account."
2. **The simple case.** The common path in prose.
3. **The interaction, event by event.** The five phases of a page or form
   lifecycle: **arrive**, **leave without changing anything**, **begin editing**,
   **while editing**, **submit**. What loads and what is focused or prefilled,
   what is recorded if the user leaves untouched, what becomes dirty at the first
   edit, what validates live, and what is sent and committed at the end. Include
   a small state diagram (Mermaid `stateDiagram-v2`) of the states the user passes
   through.
4. **Modifiers.** A table of the variant axis — the user's role, the record's
   state, the viewport, and the keys the form honours — and what each does when
   set at arrival and when changed *during* editing.
5. **Cancel and interrupt.** The same checklist in every document:
   - Escape, or a Cancel button
   - In-app navigation away, or switching tab within the page
   - Browser back or forward
   - Reload, or the tab closed
   - Network lost mid-request
   - The request fails or times out
   - The session expires
   - The same record changed in another tab, or by another user via realtime
   - Browser autofill or a password manager writes into the form
   - The window loses focus
6. **Interactions with other systems.** The cross-cutting concerns, in this fixed
   order: **Permissions and roles.** **Season scoping.** **Validation and error
   display.** **Unsaved changes.** **Optimistic updates and rollback.**
   **Realtime.** **Offline.** **Toasts and notifications.** **URL state.**
   **On a phone.** **Accessibility.** **Side effects the user can notice.**
7. **Edge cases.** Anything a user could notice that is not covered above.
8. **Open questions and verification.** The commit the document was verified
   against, and any behaviour that could not be confirmed.

Item 5 matters most. Asking the same interrupt questions of every feature is how
gaps and inconsistencies are found.

### Method

For each document:

1. Read the hooks that hold the interaction state, under `src/hooks/`, and the
   services they call, under `src/services/`.
2. Read the matching tests. Files under `src/**/__tests__/`, `tests/`, and `e2e/`
   are close to executable specifications of the edge cases; `e2e/score-submission.spec.ts`,
   `e2e/admin-mass-score.spec.ts`, and `e2e/playoff-bracket.spec.ts` especially.
3. Draft the document.
4. Try anything ambiguous in the running app: `npm run dev`, then
   `http://localhost:8080`. Tests settle "what happens"; the running app settles
   how it feels, what is visible while a request is in flight, and what the timing
   is like.
5. Record the commit verified against.

### Verification

Drafting reads the code; verification watches the product. The `verification/`
directory holds one checklist per cluster of documents, each item a single
observable claim with setup, steps, expected result, a priority, and what it
needs. A tester runs them against the running app, records `pass`, `fail`, or
`blocked` in the Result column, and files every failure in
[`bug-triage.md`](bug-triage.md) with the item's ID. A document moves from
`drafted` to `verified` in the coverage table only when every P1 and P2 item for
it has passed or been filed.

`bug-triage.md` is the other half: every behaviour the documents flagged as a
likely defect, deduplicated, with reproduction steps, the reason in the code, a
severity, and the decision the league needs to make. Entries confirmed in the
running app carry a Status line.

### Order of work

1. **Pilot: the contact form.** Small and self-contained: one form, one
   validation rule, one submit. Used to settle the template, tone, and depth.
2. **Foundations: seasons, accounts and roles, league objects, navigation, saving
   and freshness, messages to the user.** Everything else refers to them.
3. **Live scoring.** The bulk of the hardest experience: six documents that must
   agree on where one state hands off to the next.
4. **Everything else.** Once the template and the exemplars exist, the remaining
   documents can be drafted in parallel, followed by a consistency pass and a
   verification pass across the whole set.

Progress is tracked in the [coverage table](#coverage) below.

### Scope decisions

- **The Lovable editor is out of scope.** The app can be edited at
  lovable.dev and changes land in this repo automatically, but that is a
  developer surface, not a user surface.
- **Supabase edge functions and row-level security are out of scope as such.**
  They are described only where a user notices them: a request refused, a row
  invisible, an email sent. The rules themselves live in
  [`docs/RLS_NOTES.md`](../RLS_NOTES.md).
- **`/playoffs/e2e-bracket-proof` is out of scope.** It is a test route, not a
  feature.
- **The native shell is out of scope.** `useNativePlatform` exists, but this
  description covers the web app in a browser. Phone behaviour is covered as
  mobile web, in each document's "On a phone" paragraph and in
  [`cross-cutting/on-a-phone.md`](cross-cutting/on-a-phone.md).
- **Admin is described in this repo, not a separate one.** The admin surface is
  large enough to be its own product, but it acts on the same records players
  see, and splitting it would make the two halves drift. It gets its own area
  and its own eleven documents.
- **Permissions are described in every document and once in a cross-cutting
  document.** Each document says what its own feature does for a visitor, a
  player, and an admin; [`cross-cutting/permissions.md`](cross-cutting/permissions.md)
  owns the general rules so the per-document paragraphs can stay to one line.
- **Interaction shape.** The unit of interaction is a page or form lifecycle and
  its phases are arrive, leave without changing anything, begin editing, while
  editing, submit. The interrupt list and the order of cross-cutting concerns are
  fixed as written in the document template above.
- **Numbered rules.** These are prose documents, not numbered specifications.
  Stable heading anchors are enough for cross-references.

## Structure

```
README.md                        this file
goal.md                          the standing instructions for whoever drafts
AGENTS.md, CLAUDE.md             entry points for agents: read README.md, then goal.md
glossary.md                      shared vocabulary
bug-triage.md                    suspected defects collected from every document, with repro steps and decisions needed

verification/
  README.md                      how to run a hand-verification pass and record results
  foundations.md                 checklists for foundations/
  getting-started.md             checklists for getting-started/
  home-and-teams.md              checklists for home/ and teams/
  schedule-and-scores.md         checklists for schedule/ and scores/
  live-scoring.md                checklists for live-scoring/
  standings.md                   checklists for playoffs/, stats/, and history/
  community.md                   checklists for message-board/ and help/
  admin.md                       checklists for admin/
  cross-cutting.md               checklists for cross-cutting/

foundations/
  seasons.md                     what a season is and why nearly every page is scoped to one
  accounts-and-roles.md          visitor, player, admin; signing in; what a profile is
  league-objects.md              team, player, division, match, game, round, timeslot, bracket
  navigation.md                  routes, what is in the URL, what a page shows while it loads
  saving-and-freshness.md        what "saved" means, caching, realtime, optimistic updates
  messages-to-the-user.md        toasts, error screens, empty states, push notifications

getting-started/
  sign-in-and-sign-up.md         the auth page: sign in, register, reset a password
  set-up-your-profile.md         the profile setup page and what it gates
  join-a-team.md                 requesting to join a team and waiting for approval
  authorize-an-app.md            the OAuth consent screen

home/
  the-home-page.md               the signed-out and signed-in home dashboard
  your-next-match.md             the next-match card and what it does when there is none

teams/
  browse-teams.md                the teams list, its filters, and hidden teams
  team-details.md                one team's page: roster, record, history, badges
  my-team.md                     the page a player manages their own team from
  compare-teams.md               the two-team comparison page

schedule/
  the-schedule-page.md           the season schedule, its filters, and week grouping
  a-match-card.md                one match in a list: what it shows in each state
  timeslot-preferences.md        choosing which timeslots a team can play

scores/
  submit-a-score.md              entering the result of a completed match
  confirm-or-dispute-a-score.md  what the other team does with a submitted score
  pending-scores.md              matches waiting on a decision, and who can act

live-scoring/
  start-a-live-match.md          opening a match for live scoring and who may
  set-up-a-game.md               choosing players and who throws first
  enter-a-round.md               the round input: the core loop of a live match
  correct-a-round.md             editing or deleting a round that was already entered
  finish-a-game.md               reaching the target score and what happens next
  finish-the-match.md            finalising, the recap, and what is written

playoffs/
  the-playoffs-page.md           the playoffs route, its states across the season
  read-a-bracket.md              how a bracket is drawn and what each cell means
  blind-draw-signup.md           signing up for the blind draw and withdrawing

stats/
  standings-and-rankings.md      the standings table and how it is ordered
  power-score.md                 what power score is, how it moves, where it shows
  team-and-player-stats.md       per-team and per-player numbers and where they come from
  insights.md                    the league insights page
  badges.md                      the badges a team can earn and when they appear

history/
  past-seasons.md                browsing archived seasons
  head-to-head.md                one team's record against another

message-board/
  read-the-board.md              the board, its threads, and reactions
  post-and-reply.md              writing a message, replying, and what can be removed

help/
  the-help-page.md               the help route and its content
  contact-the-league.md          the contact form (the pilot)

admin/
  the-admin-dashboard.md         the dashboard, its sections, and how access is gated
  manage-seasons.md              creating, activating, and archiving a season
  manage-teams-and-divisions.md  teams, divisions, weights, seeds, and hiding
  build-the-schedule.md          auto-scheduling and batch match creation
  manage-timeslots.md            defining timeslots and reading team preferences
  enter-scores-in-bulk.md        the mass score entry tool
  correct-a-live-match.md        admin corrections to a match already scored
  handle-requests.md             membership requests and contact requests
  run-the-playoffs.md            creating brackets, blind draw, the Challonge fallback
  send-notifications.md          the notifications admin page
  site-settings.md               theme, hero cards, help content, and ops health

cross-cutting/
  permissions.md                 what each role can do, and what refusal looks like
  errors-and-offline.md          what the user sees when a request fails or the network drops
  on-a-phone.md                  what changes on a small screen
  accessibility.md               keyboard, screen reader, motion, contrast
  what-the-league-sees.md        pageviews, emails, and push: side effects a user can notice
```

## Coverage

Status is one of `not started`, `drafted`, or `verified`.

| Document | Status |
| --- | --- |
| glossary.md | drafted |
| bug-triage.md | not started |
| verification/ (9 checklists) | not started |
| foundations/seasons.md | drafted |
| foundations/accounts-and-roles.md | drafted |
| foundations/league-objects.md | drafted |
| foundations/navigation.md | drafted |
| foundations/saving-and-freshness.md | drafted |
| foundations/messages-to-the-user.md | drafted |
| getting-started/sign-in-and-sign-up.md | drafted |
| getting-started/set-up-your-profile.md | drafted |
| getting-started/join-a-team.md | drafted |
| getting-started/authorize-an-app.md | drafted |
| home/the-home-page.md | drafted |
| home/your-next-match.md | drafted |
| teams/browse-teams.md | drafted |
| teams/team-details.md | drafted |
| teams/my-team.md | drafted |
| teams/compare-teams.md | drafted |
| schedule/the-schedule-page.md | drafted |
| schedule/a-match-card.md | drafted |
| schedule/timeslot-preferences.md | drafted |
| scores/submit-a-score.md | drafted |
| scores/confirm-or-dispute-a-score.md | drafted |
| scores/pending-scores.md | drafted |
| live-scoring/start-a-live-match.md | drafted |
| live-scoring/set-up-a-game.md | drafted |
| live-scoring/enter-a-round.md | drafted |
| live-scoring/correct-a-round.md | drafted |
| live-scoring/finish-a-game.md | drafted |
| live-scoring/finish-the-match.md | drafted |
| playoffs/the-playoffs-page.md | drafted |
| playoffs/read-a-bracket.md | drafted |
| playoffs/blind-draw-signup.md | drafted |
| stats/standings-and-rankings.md | drafted |
| stats/power-score.md | drafted |
| stats/team-and-player-stats.md | drafted |
| stats/insights.md | drafted |
| stats/badges.md | not started |
| history/past-seasons.md | drafted |
| history/head-to-head.md | drafted |
| message-board/read-the-board.md | drafted |
| message-board/post-and-reply.md | drafted |
| help/the-help-page.md | drafted |
| help/contact-the-league.md | drafted |
| admin/the-admin-dashboard.md | drafted |
| admin/manage-seasons.md | drafted |
| admin/manage-teams-and-divisions.md | drafted |
| admin/build-the-schedule.md | drafted |
| admin/manage-timeslots.md | drafted |
| admin/enter-scores-in-bulk.md | drafted |
| admin/correct-a-live-match.md | drafted |
| admin/handle-requests.md | drafted |
| admin/run-the-playoffs.md | drafted |
| admin/send-notifications.md | drafted |
| admin/site-settings.md | drafted |
| cross-cutting/permissions.md | drafted |
| cross-cutting/errors-and-offline.md | drafted |
| cross-cutting/on-a-phone.md | drafted |
| cross-cutting/accessibility.md | drafted |
| cross-cutting/what-the-league-sees.md | drafted |

## Reference

The source of truth is this repo, at the application code as of commit
`ea5c8f4`. Later commits on this branch add description documents only; they do
not change the app. The relevant locations are:

- `src/App.tsx`: every route, and which ones are gated
- `src/pages/`: the surface this project describes, one file per route
- `src/hooks/`: where interaction state lives — 106 hooks, TanStack Query, grouped
  by feature; `src/hooks/live-scoring/` is the densest
- `src/services/`: every database call, grouped by feature; services throw on
  error and never return null for failure
- `src/integrations/supabase/types.ts`: the generated schema, and the source of
  truth for table and column names
- `src/components/`: the UI, in 20 feature folders plus `ui/` for shadcn base
  components
- `src/**/__tests__/`, `tests/`, `e2e/`: behavioural tests; the `e2e/` specs read
  most like specifications of the user-visible edge cases
- `src/contexts/auth-context`, `src/hooks/useAdminAccess.ts`: the role model
- `src/utils/errorHandler.ts`, `src/types/errors.ts`: how failures become
  messages the user sees
- `supabase/`: migrations and edge functions, for the side effects a user notices
