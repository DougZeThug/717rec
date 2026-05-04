# Run ESLint Auto-Fix and Report

## What I'll do

1. **Baseline check** — run `npx eslint .` (no `--fix`) and capture the current count of errors/warnings by rule. This is the "before" snapshot.
2. **Run auto-fix** — execute `npx eslint . --fix`. Only auto-fixable rules will change files. Based on `eslint.config.js`, the auto-fixable rules in this repo are:
   - `simple-import-sort/imports` and `simple-import-sort/exports` (reorders imports)
   - `prettier/prettier` (formatting: quotes, semicolons, spacing, line width 100)
   - `prefer-const` (lets → consts where never reassigned)
   - `no-var` (var → let/const)
   - Some `react-hooks` and `@typescript-eslint` fixes (minor)
   
   **Not auto-fixable** (will remain as warnings/errors): `@typescript-eslint/no-explicit-any`, unused vars, `react-refresh/only-export-components`, vitest focused-tests.
3. **Post-fix check** — re-run `npx eslint .` to capture remaining issues.
4. **Safety verification** — run the typecheck/build the harness uses, plus `npm test` to confirm nothing broke. Auto-fixes are syntactic only and shouldn't affect behavior, but tests confirm.
5. **Report** — give you:
   - List of files changed (count + grouped by directory)
   - Breakdown of fixes by rule (e.g. "142 import-sort, 38 prettier formatting, 5 prefer-const")
   - Before/after error+warning counts
   - Test + build status
   - Any remaining lint issues that need manual attention

## Risk

Very low. All auto-fixable rules in this config are safe syntactic transforms. The biggest visible change will be reordered imports across many files. If the build or any test fails after the fix, I'll surface exactly which file and revert if needed.

## What I will NOT do

- Touch ignored paths (`dist`, `node_modules`, `*.config.js`, `src/integrations/supabase/types.ts`)
- Manually fix non-auto-fixable issues (those need separate decisions)
- Change ESLint config
