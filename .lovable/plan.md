## Problem

Two distinct issues from the agent-shell run:

1. **`npm run test:file -- ...` failed without Supabase env vars.** `src/integrations/supabase/client.ts` throws at import time when `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing. Vite normally loads `.env` automatically, but sandboxed agent shells (Codex / Claude Code) often don't, so any test that imports a module touching the supabase client crashes during collection.
2. **`npm test` hit the 10-minute timeout.** The full suite (~285 files / ~2.3k tests) takes ~3 minutes in parallel under normal conditions, but in constrained sandboxes it can exceed 10 minutes. It's the wrong command for an agent shell.

Tests should not require real Supabase credentials — every test mocks the client. The env check is purely a guard for the running app.

## Fix

### 1. Inject safe test defaults for Supabase env vars

In `src/setupTests.ts`, before any module that might import the supabase client, set placeholder values when missing:

```ts
// Ensure supabase client import doesn't throw in test/agent shells
// where .env isn't auto-loaded. Tests always mock the client.
import.meta.env.VITE_SUPABASE_URL ||= 'http://localhost:54321';
import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= 'test-anon-key';
import.meta.env.VITE_SUPABASE_PROJECT_ID ||= 'test-project';
```

(Equivalent `process.env` assignments as a belt-and-suspenders fallback.)

This removes the need to prefix every test command with `VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... npm run test:file ...`.

### 2. Document correct test commands for agent shells in `CLAUDE.md`

Add a short "Running tests from a sandboxed agent shell" callout reinforcing what's already there:

- Prefer `npm run test:file -- <path>` or `npx vitest run <path>` for iteration.
- Use `npm run test:coverage` as the fast full-suite gate.
- **Do not run bare `npm test`** in agent shells with a <15 min timeout — it's a parallel ~3 min run locally but routinely exceeds short sandbox timeouts.

### 3. Verification

- Run `npm run test:file -- src/components/history/__tests__/SeasonAccordion.test.tsx` with **no** env vars set and confirm it passes.
- Run one additional file that imports a service touching supabase to confirm the defaults take effect.

## Out of scope

- No changes to the production supabase client guard (it still throws in real builds).
- No changes to vitest config, test parallelism, or coverage thresholds.
- No attempt to make the full `npm test` finish faster in the sandbox.
