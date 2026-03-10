# Codebase Cleanup Plan

> A staged plan to reduce tech debt, improve code quality, and enforce existing conventions.
> Each stage is independent and can be implemented one at a time without breaking anything.

---

## Current State (Baseline)

- **Lint**: `npm run lint` reports a large backlog of errors and warnings — lint is not functioning as an effective quality gate.
- **Build**: `npm run build` succeeds but reports oversized chunk warnings (admin, charts/vendor bundles).
- **TypeScript**: Strict mode is off (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`) — increases defect risk at this codebase size.
- **Conventions**: Documented folder conventions exist (`src/docs/FOLDER_CONVENTIONS.md`) but some legacy paths remain (e.g., `hooks/useAutoSchedule`, camelCase util folders).
- **Tests**: Test infrastructure exists but no dedicated `test` or `typecheck` scripts in `package.json` for daily workflow.

---

## Stage 1: Guardrails & Baseline

**Goal**: Capture current health metrics and add missing scripts so every developer can run checks easily.

### Tasks

1. **Add missing npm scripts to `package.json`**:
   - `"test": "vitest run"` — run tests once
   - `"test:watch": "vitest"` — run tests in watch mode
   - `"typecheck": "tsc --noEmit"` — standalone type check
   - `"lint:fix": "eslint . --fix"` — auto-fix lint issues

2. **Document current baseline** (for tracking progress):
   - Run `npm run lint 2>&1 | tail -5` and record error/warning counts
   - Run `npm run build 2>&1 | grep "chunk"` and record oversized chunks
   - Record current test pass/fail count

3. **Verify CI runs all checks** (`.github/workflows/test.yml`):
   - Confirm lint, build, typecheck, and test all run on PRs
   - Add lint step to CI if missing

### Definition of Done
- All four scripts exist in `package.json` and run without crashing
- Baseline numbers are recorded (can be a comment in this file or a separate doc)

---

## Stage 2: Mechanical Cleanup (Auto-fixable)

**Goal**: Fix all auto-fixable lint issues in one dedicated commit. No behavior changes.

### Tasks

1. **Run `npm run lint:fix`** to auto-fix formatting, import sorting, and trivial issues
2. **Review the diff** — confirm no behavioral changes (only whitespace, import order, trailing commas, quotes, etc.)
3. **Commit as a single "mechanical cleanup" commit** — keeps the git history clean and makes it easy to revert if needed
4. **Re-run `npm run lint`** and record the new error/warning count — this is the "real" backlog of issues that need manual fixes

### Definition of Done
- All auto-fixable issues are resolved
- Remaining lint issues are counted and categorized (unused vars, hook rules, type issues, etc.)

---

## Stage 3: Lint Backlog Triage

**Goal**: Manually fix remaining lint errors in prioritized batches. Work through the highest-impact categories first.

### Tasks (in priority order)

1. **Unused variables and imports** — Delete dead code. Low risk, high signal.
2. **React Hooks rule violations** (`react-hooks/exhaustive-deps`, `react-hooks/rules-of-hooks`) — Fix dependency arrays and hook call order. These are real bug risks.
3. **TypeScript-related warnings** (`@typescript-eslint/*`) — Fix type assertions, `any` usage, and unsafe operations where practical.
4. **Remaining issues** — Address or suppress with inline comments explaining why.

### Approach
- Fix one category per commit
- Run `npm run build` after each batch to confirm nothing breaks
- Target: zero lint errors (warnings can remain if justified)

### Definition of Done
- `npm run lint` exits with zero errors
- Any remaining warnings have inline suppression comments with justification

---

## Stage 4: TypeScript Strictness (Incremental)

**Goal**: Enable stricter TypeScript options one at a time, fixing issues in bounded scopes.

### Tasks (in order)

1. **Enable `strictNullChecks`** in `tsconfig.app.json`
   - This is the highest-value strict flag — catches null/undefined bugs
   - Fix errors starting with `src/services/` (smallest, most critical layer)
   - Then expand to `src/hooks/`, then `src/components/`, then `src/utils/`
   - Commit after each folder group passes

2. **Enable `noImplicitAny`**
   - Fix untyped function parameters and variables
   - Same folder-by-folder approach

3. **Enable `strict: true`** (once the above two are clean)
   - This enables all remaining strict flags at once
   - Should be a small diff if steps 1-2 were thorough

### Approach
- Enable one flag at a time
- Fix one folder group at a time
- Run `npm run typecheck` and `npm run build` after each batch
- If a flag creates too many errors in one folder, fix incrementally across multiple commits

### Definition of Done
- `strict: true` is enabled in `tsconfig.app.json`
- `npm run typecheck` passes with zero errors

---

## Stage 5: Conventions Alignment

**Goal**: Migrate legacy folder names and patterns to match documented conventions in `src/docs/FOLDER_CONVENTIONS.md`.

### Tasks

1. **Rename `src/hooks/useAutoSchedule/`** — Migrate to convention-compliant name (e.g., `src/hooks/scheduling/` or `src/hooks/auto-schedule/`)
   - Update all imports across the codebase
   - Verify with `npm run build`

2. **Normalize camelCase util folders** — Rename to kebab-case or match existing convention
   - Identify non-compliant folder names in `src/utils/`
   - Rename and update imports

3. **Audit `select('*')` usage in services** — Replace with explicit column lists per the codebase rule
   - Search all service files for `select('*')`
   - Replace each with explicit column names

4. **Verify SOC (Separation of Concerns) rules** — Confirm no hooks or components import the Supabase client directly
   - Search for `from '@/integrations/supabase/client'` outside of `src/services/` and allowed exceptions
   - Move any violations into the services layer

### Approach
- One rename per commit (keeps git history traceable)
- Run full build after each rename

### Definition of Done
- All folder names match documented conventions
- No `select('*')` in service files
- SOC rules pass a codebase-wide grep audit

---

## Stage 6: Bundle Performance

**Goal**: Reduce oversized chunks and enforce bundle budgets.

### Tasks

1. **Identify the largest chunks** — Run `npm run build` and list chunks over 250KB
2. **Split oversized route bundles**:
   - Admin pages: Break monolithic admin bundle into sub-route lazy loads (scheduling, scoring, settings, etc.)
   - Charts/stats: Lazy-load chart-heavy components (Recharts is large)
   - Playoffs/brackets: Already chunked but verify it's route-split effectively
3. **Add bundle size budget** — Configure a build warning or CI check for chunks over a target size (e.g., 300KB per chunk)
4. **Audit vendor chunk grouping** in `vite.config.ts` — Verify the manual chunks still make sense and aren't bundling unused libraries

### Approach
- Measure before and after each change
- Use `npx vite-bundle-visualizer` (or similar) to see what's in each chunk
- Focus on the biggest wins first (largest chunks, most common routes)

### Definition of Done
- No chunk exceeds the agreed budget (e.g., 300KB gzipped)
- Bundle budget check runs in CI

---

## Stage 7: Domain-Critical Quality (Autoscheduler)

**Goal**: Execute the existing autoscheduler remediation plan (`PLAN-autoscheduler-repeat-fix.md`), backed by tests.

### Tasks

1. **Review the existing plan** — Read `PLAN-autoscheduler-repeat-fix.md` and confirm it's still accurate
2. **Write deterministic tests** for edge cases:
   - Late-season scheduling with limited opponents
   - Dual-match mode rematch prevention
   - Bye week distribution fairness
3. **Implement the fixes** described in the plan
4. **Verify tests pass** and no regressions in existing scheduling behavior
5. **Delete the plan file** once work is complete (per codebase convention)

### Definition of Done
- Autoscheduler fixes are implemented and tested
- `PLAN-autoscheduler-repeat-fix.md` is deleted
- Tests cover the specific edge cases documented in the plan

---

## Stage 8: Sustainability

**Goal**: Ensure new code doesn't reintroduce the debt we just cleaned up.

### Tasks

1. **CI enforcement**:
   - Lint must pass (zero errors) on all PRs
   - TypeScript strict mode must pass on all PRs
   - Bundle budget must pass on all PRs
   - Tests must pass on all PRs

2. **Update `CLAUDE.md`** with any new conventions discovered during cleanup

3. **Delete this plan file** (`cleanup-plan.md`) once all stages are complete

### Definition of Done
- CI blocks PRs that introduce lint errors, type errors, or bundle budget violations
- This plan file is deleted

---

## Implementation Notes

- **Each stage is a separate PR** (or set of commits) — don't mix stages
- **Stages 1-3 are quick wins** — mostly mechanical, low risk
- **Stages 4-5 are medium effort** — require careful review but are straightforward
- **Stages 6-7 are larger efforts** — may span multiple sessions
- **Stage 8 is ongoing** — enforce after all other stages are done
- **Always run `npm run build` after changes** — the build is the ultimate gate
- **Commit often** — small, focused commits make it easy to bisect if something breaks
