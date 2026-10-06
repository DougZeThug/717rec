# 717rec

## Developer Preferences

- **Always talk in ASD-STE100 Simplified Technical English** — short sentences,
  simple approved words, active voice, one instruction per sentence
- **Always talk to me like I have ADHD** — give the answer first, keep it short,
  use bullets, make the key point bold, no walls of text
- **I am NOT a coder** — always explain what you're doing in plain language, avoid jargon
- **Small, safe diffs** — one bug fix or one feature per commit, only change what's necessary
- **Explain your steps**: (1) tell me what you're about to do and why, (2) show the specific changes, (3) confirm what changed and how to verify
- Ask for confirmation before major changes
- When working on multi-step tasks: create a plan file, execute it, then delete the plan file when done

## Specialist Agent Team (Lead workflow)

This session is the **Lead Product Engineer**. The Lead does not guess and does
not do specialist work alone. The Lead sends work to project agents in
`.claude/agents/`, checks their evidence, then decides.

Read `docs/agents/LEAGUE_CONTEXT.md` before scoring, data or league-rule work.
It holds verified facts and the corrections log. **Do not trust old memory** of
Power Score weights, division weights, or a native Android app. Verify in code.

| Agent | Job | Access |
|---|---|---|
| `product-league-operations` | Does it help real league-night operation? | read-only |
| `frontend-mobile-ux` | Phone use, navigation, forms, accessibility, admin UX | read-only |
| `supabase-data` | Schema, migrations, RLS, queries, history safety | read-only |
| `competition-scoring` | Standings, SOS, Power Score, playoffs, stats math | read-only |
| `security-reliability` | RLS, admin-only actions, duplicates, recovery | read-only |
| `skeptic` | Challenges findings and the plan; finds the smallest change | read-only |
| `implementer` | Executes ONE approved plan | edits code |
| `qa-verifier` | Checks code and league use; PASS / PARTIAL / FAIL | runs checks, no source edits |

### Workflow

```
User request
-> relevant read-only specialists (in parallel when useful)
-> Skeptic
-> Lead synthesis
-> ONE implementation plan
-> Implementer
-> QA Verifier
-> relevant specialist re-review, if the change touched their area
```

1. **Pick specialists.** Use only those the task needs. A small bug may need one. Call parallel specialists in one message with several Agent calls.
2. **Brief each agent.** Give the task, the goal, and what to return. Agents do not see this chat.
3. **Skeptic.** Give it every report and the draft plan. Settle its objections with evidence.
4. **Lead synthesis.** Write ONE plan: goal, files, steps, history impact, migration and hand-apply steps, tests, rollback, acceptance criteria. For a multi-step task, this is the plan file (create it, run it, delete it when done).
5. **Confirm before major changes** (see Developer Preferences), then send the plan to the Implementer.
6. **QA Verifier.** On FAIL or PARTIAL, send findings back to the Implementer. Repeat.
7. **Re-review.** Send the finished change to the relevant specialist for a short read-only re-check.
8. **Report to Doug** in the style at the top of this file: answer first, short, plain.

Rules for the Lead:

- Subagents cannot start other subagents. Only the Lead fans out.
- Reviewers stay read-only. Only the Implementer edits code. QA never edits source.
- Mark claims VERIFIED / INFERRED / UNKNOWN. Do not act on INFERRED claims about league rules.
- Prefer the smallest change. Prefer removing steps over adding controls.
- Never change scoring or ranking meaning without Doug's answer.
- A merged migration does **not** reach production. Tell Doug the hand-apply step.
- Agents load when a session starts. After editing an agent file, start a new session (or use `/agents`).

### Ask Doug only when a decision changes

- league rules
- scoring rules (weights, tie-breaks, what counts as a win)
- product behavior
- meaningful UX direction

Resolve technical choices from evidence. Put a recommendation with every question.

### Durable learning

When Doug corrects a league rule, scoring assumption, admin workflow, historical
behavior or product expectation:

1. Add a row to the corrections log in `docs/agents/LEAGUE_CONTEXT.md`.
2. Fix the doc, test or agent file that held the wrong belief.
3. If code can enforce the rule, add or change a test.
4. Tell Doug in one line what was saved and where.

Edit agents in `.claude/agents/*.md`. Then run `node tools/sync-codex-agents.mjs`
to rebuild the generated Codex copies in `.codex/agents/`. `AGENTS.md` repeats
the short form of this workflow for Codex; keep the two in step.

## Architecture Rules

- **Separation of concerns**: All Supabase calls go through `src/services/` — hooks and components must **never** import the Supabase client directly
  - Only exceptions: realtime `.channel()` subscriptions (stay in hooks) and `src/utils/imageUpload.ts` (Supabase Storage)
- New service functions must use `handleDatabaseError()` and `ensureFound()` from `@/utils/errorHandler`
- Services always **throw** errors — never return null/boolean for error states
- **Never use `select('*')`** in Supabase queries — always list columns explicitly
- Split service files into sub-services when they exceed ~400 lines (see `matches/` folder pattern)
- `src/integrations/supabase/types.ts` is **auto-generated** — never edit manually

## Service Template

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

type ItemRow = Tables<'items'>;

export const ExampleService = {
  fetchItems: async (seasonId: string): Promise<ItemRow[]> => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, season_id, created_at')
      .eq('season_id', seasonId);

    if (error) handleDatabaseError(error, 'Failed to fetch items');
    return data ?? [];
  },

  fetchItemById: async (id: string): Promise<ItemRow> => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, season_id, created_at')
      .eq('id', id)
      .maybeSingle();

    // maybeSingle(), not single(): single() reports "no rows" as a PGRST116
    // error, so ensureFound would never see the null and the caller would get
    // a DatabaseError instead of a NotFoundError.
    if (error) handleDatabaseError(error, 'Failed to fetch item');
    return ensureFound(data, 'Item', id);
  },
};
```

## Codebase Rules

- Use `brackets-manager` library for playoff brackets — don't roll your own
- `.npmrc` has `legacy-peer-deps=true` — don't remove it
- Returning null is OK when it means "no data" (e.g., no match history). Returning null for errors is not OK — throw instead.
- Import routing from `react-router`, never `react-router-dom`. That package
  was removed: React Router v8 does not publish it.

## Tailwind CSS v4

- Theme tokens live in the `@theme` blocks in `src/index.css`. There is no
  `tailwind.config.ts`. Colours that read a CSS variable go in `@theme inline`.
- `src/index.css` imports Preflight and the utilities **unlayered**, in the v3
  order. Do not switch to `@import 'tailwindcss'` and do not wrap app CSS in
  `@layer`: unlayered CSS beats layered CSS, so every border colour, heading
  and animation tie would flip. Read the comment at the top of the file first.
- Kept v3 behaviours (each has a comment in `src/index.css`): `hover:` also
  fires on touch screens, `space-x-*`/`space-y-*` use the v3 selector,
  `text-*` sizes keep v3's fixed line heights, and
  `src/styles/tailwind-v3-compat.css` restores the default border (it reads the
  theme's `--border`, so dark and winter stay dark), placeholder colour,
  button pointer and 1px table-cell padding.
- Red text and icons use `text-destructive-text`, not `text-destructive`.
  `--destructive` is a fill colour and is too dark to read as text in the dark
  and winter themes. Keep `bg-destructive` and `border-destructive` for fills.
- Form-field borders (`border-input`) are 3:1 on purpose (WCAG 1.4.11). Do not
  lighten `--input` back to `--border`.
- Keep `bg-gradient-to-*` (not `bg-linear-to-*`): hero card presets save these
  class names in the database, and the winter theme matches them with
  `[class*="bg-gradient"]`.
- Do not `@apply` `leading-*`, `tracking-*` or `font-*` on plain element
  selectors: in v4 they also set `--tw-*` variables that change later `text-*`
  classes. Write plain CSS values instead (see `src/styles/typography.css`).

## Vite 8

- Vite 8 bundles with Rolldown. Named chunks are groups in
  `build.rolldownOptions.output.codeSplitting` in `vite.config.ts`. Do not add
  `rollupOptions` or `manualChunks`: Vite 8 dropped the object form.
- A group only catches modules that are really bundled. If a package only
  re-exports another one, name the real package in the group's `test` too.
- `build.target` is pinned to Vite 7's browser list on purpose, so iPhones on
  iOS 16.0-16.3 still load the app. Do not remove it unless we decide to drop
  those phones.
- A dependency change updates **both** lock files:
  `npx npm@12 install --package-lock-only` (npm 12 records the native binaries
  for every platform, which the hosting build needs) and
  `bun install --lockfile-only` (the deploy runs a frozen bun install).

## Vitest 5

- `vitest` and `@vitest/coverage-v8` are pinned to the **same exact version**.
  Coverage needs the matching Vitest, so bump them together. Dependabot groups
  `vitest*` and `@vitest/*` for this reason.
- The `declare module 'vitest'` block in `src/setupTests.ts` gives the jest-dom
  matchers (`toBeInTheDocument` and the rest) their types. Vitest 5 no longer
  reads `jest.Matchers`, and jest-dom 7.0.1 declares them only there. Delete the
  block when jest-dom ships Vitest 5 types (testing-library/jest-dom#738). Keep
  it in a `.ts` file: `skipLibCheck` hides mistakes in `.d.ts` files.
- Vitest clears the call history of every mock before each test (`clearMocks`
  is on by default). Check calls in the test that makes them, not in
  `beforeAll`.
- `await` every `expect(...).resolves` and `.rejects`. Vitest 5 fails the test
  otherwise.
- Keep `vi.mock`, `vi.unmock` and `vi.hoisted` at the top level of the file.
  Vitest 5 throws when they are inside a function or a `describe`.
- Coverage `include` and `exclude` globs match paths relative to the repo root.
  An `include` entry without a wildcard means a whole folder.

## Docs Maintenance

- Update docs **in the same PR as the behavior they describe.** If a PR renames
  a table, moves a file, or removes a script, fix every doc that references it
  in the same change — don't leave the drift for a later sweep.
- `src/integrations/supabase/types.ts` is the source of truth for table names
  cited in `ARCHITECTURE.md` and audit docs.
- Executed/abandoned plan files should be deleted, not kept as historical
  artifacts. Archive long-lived roadmaps under `docs/audits/archive/` with a
  pointer to the current review.

<important if="adding new features">

- Data flow: **Components → Hooks** (TanStack Query) **→ Services → Supabase**
- Error types: `src/types/errors.ts` (DatabaseError, NotFoundError, ValidationError, BusinessLogicError, AuthorizationError)
- Error utilities: `src/utils/errorHandler.ts`
- Admin permissions: use `useAdminAccess()` hook
- Most data is season-specific — always filter by season

</important>

<important if="working with tests">

- **Running tests from an agent shell (Codex / Claude Code):** the `vitest`
  binary is local to `node_modules/.bin` and is often not on `PATH` in
  sandboxed shells. Do not call bare `vitest`. Use one of:
  ```bash
  npm test                                                 # full suite
  npm run test:file -- src/path/to/File.test.tsx           # single file
  npx vitest run src/path/to/File.test.tsx                 # equivalent
  ```
  Use `npm` only — this repo does not use `pnpm` or `yarn`.

- **Typechecking: never use bare `tsc --noEmit`.** The root `tsconfig.json` has
  `"files": []` and delegates through project references, so `npx tsc --noEmit`
  compiles nothing and exits 0 **even when types are broken**. It looks like a
  clean pass and proves nothing. Use:
  ```bash
  npm run typecheck        # tsc -b — the real check, follows the references
  npm run typecheck:full   # tsc -b --force, ignores stale build info
  ```
  CI runs `npm run typecheck` (`.github/workflows/ci.yml`), so this is only a
  hazard when checking by hand.

- **Two TypeScript installs.** `typescript` is 7.0.2 (native compiler, used by
  `npm run typecheck`). `typescript-6` is an alias of typescript@6.0.3 used
  **only by ESLint**, because typescript-eslint still needs the JavaScript
  compiler API that TypeScript 7 dropped. The `lint` scripts preload
  `tools/lint-typescript-6.cjs` via `node --require`, which redirects
  `require('typescript')` to the alias. Lint with `npm run lint` — a bare
  `npx eslint .` skips the hook and fails. Bump both versions together.

- **Supabase env vars are not required for tests.** `src/setupTests.ts` injects
  safe placeholder values when `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  are missing, so you do **not** need to prefix test commands with them in
  sandboxed shells. Real values from `.env` still take precedence when present.

- **Don't run bare `npm test` in agent shells with a short timeout.** The full
  suite is ~4 min in parallel locally but routinely exceeds 10-min sandbox
  caps. Use `npm run test:file -- <path>` for iteration and
  `npm run test:coverage` as the fast full-suite gate.

- **Which command to use day to day:**
  - One file while you work → `npm run test:file -- src/path/to/File.test.tsx`
  - Fast gate with coverage → `npm run test:coverage` (parallel; fastest full pass)
  - Diagnose a slow or stuck run → `npm run test:debug` (serial + verbose, 10-min cap;
    surfaces the last-active file if anything truly stalls)
  - Whole suite → `npm test`. It is large (~450 files / ~3.2k tests) and takes
    **~4 minutes in parallel** — that is expected, **not** a hang. Reserve it for CI or
    final checks. Running it *serially* (e.g. `--maxWorkers=1 --fileParallelism=false`)
    drops that parallelism and can take several times longer, which is what previously
    looked like a hang.

- Mock Radix UI pointer capture methods in test setup — jsdom doesn't support them:
  ```typescript
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  });
  ```
- Also mock `scrollIntoView` if Radix components trigger it
- **Unit tests**: `__tests__/` folder next to the source file
- **Integration tests**: root `tests/` directory
- Rule of thumb: imports from one module → unit test. Touches multiple modules → integration test.

</important>

---

*Last updated: 2026-09-28*
