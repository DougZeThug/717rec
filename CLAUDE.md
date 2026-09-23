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

## Tailwind CSS v4

- Theme tokens live in the `@theme` blocks in `src/index.css`. There is no
  `tailwind.config.ts`. Colours that read a CSS variable go in `@theme inline`.
- `src/index.css` imports Preflight and the utilities **unlayered**, in the v3
  order. Do not switch to `@import 'tailwindcss'` and do not wrap app CSS in
  `@layer`: unlayered CSS beats layered CSS, so every border colour, heading
  and animation tie would flip. Read the comment at the top of the file first.
- Kept v3 behaviours (each has a comment in `src/index.css`): `hover:` also
  fires on touch screens, `space-x-*`/`space-y-*` use the v3 selector, and
  `src/styles/tailwind-v3-compat.css` restores the gray-200 border, placeholder
  colour and button pointer.
- Keep `bg-gradient-to-*` (not `bg-linear-to-*`): hero card presets save these
  class names in the database, and the winter theme matches them with
  `[class*="bg-gradient"]`.
- Do not `@apply` `leading-*`, `tracking-*` or `font-*` on plain element
  selectors: in v4 they also set `--tw-*` variables that change later `text-*`
  classes. Write plain CSS values instead (see `src/styles/typography.css`).

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

*Last updated: 2026-09-23*
