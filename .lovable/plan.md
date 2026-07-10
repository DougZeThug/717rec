## Problem

Lint/prettier failures across three e2e files. Pure formatting + two non-null assertions.

## Fixes

**`playwright.config.ts`**
- Dedent lines 8–11 (continuation from 4 → 2 spaces) inside `Boolean(...)`.
- Collapse the `command:` ternary onto one line.
- Replace `process.env.E2E_SUPABASE_URL!` / `E2E_SUPABASE_ANON_KEY!` with `?? ''` to drop the non-null assertion warnings.

**`e2e/helpers/realBackend.ts`**
- Line 28–31: put `ensureTestUser` params on one line.
- Line 68–69: fold the `throw` onto the same line as the `if`.
- Lines 71–72: replace `teams.find(...)!` with a proper narrow — destructure via a lookup that throws if missing (already guarded above, but restate to satisfy lint):
  ```ts
  const team1 = teams.find((t) => t.name === team1Name);
  const team2 = teams.find((t) => t.name === team2Name);
  if (!team1 || !team2) throw new Error('Seeded teams missing after insert');
  ```
- Line 106: add trailing newline at EOF.

**`e2e/real-backend.spec.ts`**
- Run import sort (move `@playwright/test` and `@supabase/supabase-js` imports into the correct order per `simple-import-sort`).
- Collapse the `consoleErrors.filter(...)` arrow back onto one line inside `expect(...)`.
- Add trailing newline at EOF.

## Verification

- `npx eslint e2e playwright.config.ts` → 0 errors, 0 warnings.
- `npx prettier --check e2e playwright.config.ts` → passes.
- No runtime behavior change.
