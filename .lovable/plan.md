## Status

All 449 test files pass (3385 tests, 1 expected-fail, **0 failures**). Nothing is broken — this plan is purely about raising coverage in a few of the weakest spots.

## Goal

Add small, targeted unit tests for a handful of `src/utils/*` files currently sitting at 0–20% coverage, without touching production code. Keep each test file small and focused, in line with the repo's "small, safe diffs" preference.

## Scope (files to add tests for)

Chosen because they are pure-ish utility modules with real logic and no coverage — easiest, safest wins:

1. **`src/utils/analytics.ts`** — currently 0%. Tests for its exported tracking helpers using `vi.fn()` for any injected sinks / mocking `window`.
2. **`src/utils/routePrefetch.ts`** — 16%. Tests for the prefetch trigger logic (mock `import()` / router).
3. **`src/utils/reportCardUtils.ts`** — 1.72%. Tests for the grade/GPA calculation helpers with a few representative team-stat inputs.
4. **`src/utils/charts/chartStyleUtils.ts`** — 20%. Tests for style-mapping helpers (input → expected class/color).
5. **`src/utils/autoSchedule/scheduleUtils.ts`** — 41%. Add a couple of unit tests for the pure helpers only (skip the heavier integration paths already covered elsewhere).

Explicitly **out of scope** for this pass:
- `exportUtils.ts` / `exportGroupsToExcel.ts` (require heavy `exceljs` mocking — separate PR)
- `nativeAuth.ts` (platform bridge, needs Capacitor mocks)
- `autoSchedule/blossom/graphBuilder.ts` and `repair.ts` (large; best done as a dedicated scheduler-coverage PR)

## Approach

- One new `__tests__/<file>.test.ts(x)` file per target module, placed next to the source per `FOLDER_CONVENTIONS.md`.
- Use existing patterns from the repo (`vitest`, `@testing-library/*`, mock Supabase via `tests/__mocks__/supabase.ts` if any target ends up importing it — none of the chosen files should).
- No changes to production code, no changes to `vitest.config.ts` thresholds. Thresholds will naturally have a bit more headroom afterwards.

## Verification

- `npm run test:file -- <new-file>` for each new test during authoring.
- `npm run test:coverage` at the end to confirm suite still green and per-file coverage moved up for the five targeted files.

## Deliverable

5 new test files, ~30–80 lines each, plus a one-line summary of before/after coverage for each targeted file.
