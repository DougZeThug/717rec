# Goal: complete the 717rec product description

You are working in `docs/product-description/` inside the `717rec` repo. Read
`README.md`, `glossary.md`, `foundations/league-objects.md`, and
`help/contact-the-league.md` first. The README defines the purpose, the document
template, the method, the structure, and the coverage table. The other three are
the exemplars: match their depth, tone, and structure exactly. Your job is to
write every document in the README's structure until the coverage table has no
`not started` rows, then run a consistency pass.

## Source of truth

The source is this same repo, at the application code as of commit `ea5c8f4`.
Later commits on this branch add description documents only and do not change the
app, so `ea5c8f4` stays the cited commit for every footer.

Describe the experience of the 717rec web app (`src/App.tsx` holds every route),
signed in as an ordinary player in the active season, in the default
configuration with nothing customised. The Lovable editor, row-level security as
such, `/playoffs/e2e-bracket-proof`, and the native shell are out of scope.

For each document, read in this order before writing:

1. The page component in `src/pages/` for the route the feature lives on, and the
   feature folder in `src/components/` it renders.
2. The hooks that hold the interaction state, in `src/hooks/` — grouped by
   feature, TanStack Query throughout. These decide what is cached, what is
   optimistic, what invalidates what, and what a failure does.
3. The services in `src/services/` the hooks call. Services always throw on
   failure and never return null for an error, so "what happens when it fails" is
   always a thrown error becoming a toast. Reading the service tells you exactly
   what is sent and what comes back.
4. The tests. `src/**/__tests__/` for units, `tests/` for integration, and `e2e/`
   for browser behaviour. The `e2e/` specs read most like specifications of
   user-visible edge cases: `score-submission.spec.ts`, `admin-mass-score.spec.ts`,
   `admin-access.spec.ts`, `playoff-bracket.spec.ts`, `smoke.spec.ts`,
   `a11y.spec.ts`.
5. Defaults and rules: `src/utils/liveScoring/rules.ts` (game rules),
   `src/constants/`, and `src/integrations/supabase/types.ts` for the schema and
   the enums.

Do not describe code. Describe what the user sees and does. Technical detail goes
only in `> Technical note:` block quotes, and only when the mechanism changes what
the user would expect.

## Writing rules

- Follow the eight-section template in the README for every page, form, and
  action document. Foundations and cross-cutting documents may drop sections that
  do not apply (a glossary-like foundation has no submit phase) but must still
  cover cancel and interrupt behaviour wherever an interaction exists.
- Modifiers and cancel/interrupt go in tables, split by phase (**at arrival** and
  **while editing**) as in `help/contact-the-league.md`. The interrupt rows and
  the order of cross-cutting concerns are fixed in the README; do not add, drop,
  or reorder them in a single document.
- Use the glossary's words. If you need a term the glossary lacks, add it to
  `glossary.md` in the right section with a one-paragraph definition, then use it.
  Do not coin a synonym for a term that already exists.
- Sentence case for all headings. Short sentences, active voice, one idea per
  sentence. Direct, concrete language. No hedging, no marketing.
- State surprising behaviour plainly and say why if the reason is in the code or a
  comment. If it looks like a bug, say so in "Open questions" rather than
  smoothing it over.
- Cross-reference other documents with relative links rather than repeating their
  content. The foundations own the shared facts; do not restate them, link.
- Every document ends with "## Open questions and verification" listing what was
  read from code but not confirmed by hand, followed by
  ``Verified against `717rec` commit `ea5c8f4` ``.
- Mermaid `stateDiagram-v2` for each interaction's states. Keep it to the states
  the user passes through; omit internal bookkeeping states.

## Things already established (do not re-derive, do not contradict)

**Game and match rules** (`src/utils/liveScoring/rules.ts`, confirmed in a code
comment as agreed with the league admin):

- A game is first to **21**, **win by 2**. There is **no bust rule** and **no hard
  cap**, so a game can run past 21 indefinitely until one side leads by two.
- A match is **best of 3**. **2 game wins** takes the match.
- A side has at most **2 players**.
- Rounds are numbered from 1 within a game. Only one side scores in a round; the
  round's *net points* is the difference between the two sides.

**Seasons** (`seasons` table):

- At most one season is active at a time. `is_active`, `is_archived`,
  `confirmation_open`, and `playoffs_active` are four independent flags.
- A season stores its own champion, runner up, and third place.
- Archived seasons are frozen: their power scores do not move when the formula or
  a division weight changes.

**Roles:**

- There are exactly three: visitor, player, admin. Admin is the single boolean
  `profiles.is_admin`, read from the loaded profile rather than a separate call.
- A membership (`team_memberships`) is approved or not; an unapproved membership
  grants nothing.
- Hiding a control and the database refusing the write are two independent
  mechanisms. Where they can disagree, say so.

**Data and freshness:**

- Every read goes through TanStack Query. The app shows stale data while it
  refetches rather than a spinner, so numbers can change under the user with no
  action from them.
- Services throw on failure and never return null for an error
  (`src/utils/errorHandler.ts`, `handleDatabaseError`, `ensureFound`). A failed
  write therefore always has an error to report; if no toast appears, that is a
  bug worth flagging.
- There is no offline write queue anywhere in the product. Offline means requests
  fail.
- Realtime subscriptions exist only where a hook opens a channel; live scoring is
  the main one. Everywhere else, "changed elsewhere" means the user keeps seeing
  the old value until a refetch.

**Scores:**

- A *pending score submission* is waiting for review. A *pending match* is a match
  completed with no winner — a tie — waiting for an admin. These are different
  things and the word "pending" must always be qualified.
- Approving a submission writes the result onto the match. Reopening a completed
  match reverses the statistics the original result produced.

**Power score:**

- A weighted average, not a running total. One result can move it either way.
- Opponents are weighted by the division they were in **on the match date**, not
  the division they are in now.
- Computed on the server. Season and career power scores are computed separately
  and can disagree.

**Naming decisions:**

- The schema's `iscompleted` is written as "completed" in prose.
- The schema's `match_rounds` row is a *round*; `games` is a *game*; `matches` is
  a *match*. Never use "game" and "match" interchangeably.
- The code's `v_team_details` and other `v_` views are never named in prose; say
  what the user sees.

**Which document owns which live-scoring state:** `start-a-live-match.md` owns
everything up to the first game existing. `set-up-a-game.md` owns a game that
exists with no rounds. `enter-a-round.md` owns a game with at least one round and
no winner. `correct-a-round.md` owns edits to rounds that already exist, in any
game state. `finish-a-game.md` owns the moment a game's winner is determined and
the confirmation that follows. `finish-the-match.md` owns everything from the
second game win to the written result and the recap.

## Order of work

1. `help/contact-the-league.md` — the pilot. Settle the template on it before
   anything else.
2. `foundations/`, in this order: `league-objects.md`, `seasons.md`,
   `accounts-and-roles.md`, `navigation.md`, `saving-and-freshness.md`,
   `messages-to-the-user.md`. Everything else links to them.
3. `live-scoring/`, all six documents. This is the hardest part. Read every file
   in `src/hooks/live-scoring/`, `src/services/liveScoring/`, and
   `src/utils/liveScoring/` before starting any of them, because the states hand
   off to each other and the documents must agree on where one ends and the next
   begins. The ownership split is fixed above.
4. The remaining areas: `getting-started/`, `home/`, `teams/`, `schedule/`,
   `scores/`, `playoffs/`, `stats/`, `history/`, `message-board/`, `help/`,
   `admin/`, `cross-cutting/`. These are independent of each other and can be
   drafted in parallel with subagents once the foundations and live-scoring
   documents exist to link to. If you parallelise, give each subagent this file,
   `README.md`, `glossary.md`, the pilot, and the foundation the feature depends
   on; then review every result yourself for consistency with the glossary and
   the established facts above before accepting it.
5. Consistency pass over the whole set: same term for the same thing everywhere,
   no two documents describing the same behaviour differently, every relative
   link resolves
   (`python3 ../../.claude/skills/product-description/references/check-links.py .`),
   every document has a verification footer, every glossary term used is defined.
6. Update the coverage table in `README.md` as you go: `drafted` when written.
   Only a hand-verification pass moves a row to `verified`.

## Working rules

- Commit after each document or coherent group of documents with a message of the
  form `docs: add {path}` or `docs: revise {path}`. Follow the repo's existing
  commit convention for attribution trailers — check `git log` for the current
  shape rather than inventing one.
- Do not modify anything in `src/`, `supabase/`, `tests/`, or `e2e/`. They are
  read-only reference material for this work.
- Do not add files outside the README's structure without updating the structure
  block and the coverage table to match.
- When a behaviour cannot be determined from code and tests, write down what you
  could determine, put the rest in "Open questions", and move on. Do not guess and
  do not block.
- Depth bar: `help/contact-the-league.md` is roughly 200 lines for a small form.
  The live-scoring and admin documents will be longer; a static page will be
  shorter. Completeness matters more than length. Every phase, every modifier row,
  and every cancel/interrupt row must be accounted for, even when the answer is
  "no effect".
- If the README's structure turns out to be wrong for something you discover — a
  document that should be split, two that should merge — make the change, update
  the structure and coverage table, and say why in the commit message.

You are done when the coverage table has no `not started` rows, the consistency
pass is complete, and everything is committed.
