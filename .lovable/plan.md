# Fix `react-hooks/refs` errors (15 errors, 4 files)

The lint rule "Cannot access refs during render" fires whenever a component reads or mutates `ref.current` while rendering. React Compiler treats this as unsafe because refs are meant for values that don't affect rendering — touching them during render can produce stale UI or skipped updates. We'll resolve each violation with the smallest safe change.

## Files and fixes

### 1. `src/components/playoffs/BracketView.tsx`
- **Issue:** `hookCallCount.current++` and `renderCount.current++` are executed in the render body (lines 36–37), and both are then read in a `log(...)` call (line 39). These are debug-only counters.
- **Fix:** Move the increment + log into a `useEffect(() => { ... })` (no deps) so it runs after each commit. This preserves the debug signal without touching refs during render.

### 2. `src/components/playoffs/FinalStandings.tsx`
- **Issue:** Same pattern — `renderCount.current++` followed by `log(...)` in the render body (lines 51–52).
- **Fix:** Same pattern — wrap the increment and log in a `useEffect(() => { ... })`.

### 3. `src/hooks/teams/useTeamsQuery.ts` (`useTeamsArray`)
- **Issue:** `teams: query.data ?? emptyRef.current` reads `ref.current` during render to return a stable empty array.
- **Fix:** Replace the `useRef` with a module-level frozen constant:
  ```ts
  const EMPTY_TEAMS: readonly Team[] = Object.freeze([]);
  // ...
  teams: query.data ?? (EMPTY_TEAMS as Team[]),
  ```
  This is a single shared reference across renders/components, which is exactly what the original ref was emulating, and it avoids the rule entirely. Drop the now-unused `useRef` import if no other usage remains.

### 4. `src/components/teams/TeamAnalysisEditForm.tsx`
- **Issue:** `strengthIdsRef.current` / `weaknessIdsRef.current` are mutated in event handlers (fine) **and read during render** as React `key` props (lines 99 and the equivalent weakness block around line 154). They're also mutated outside `useEffect`. This is the classic "stable per-row IDs" pattern that should live in state, not in a ref.
- **Fix:** Convert the two refs into `useState<string[]>` initialized with the same lazy initializer:
  ```ts
  const [strengthIds, setStrengthIds] = useState<string[]>(() =>
    strengths.map(() => crypto.randomUUID())
  );
  const [weaknessIds, setWeaknessIds] = useState<string[]>(() =>
    weaknesses.map(() => crypto.randomUUID())
  );
  ```
  Update the four handlers (`handleAddStrength`, `handleAddWeakness`, `handleRemoveStrength`, `handleRemoveWeakness`) to call `setStrengthIds` / `setWeaknessIds` alongside the existing `setStrengths` / `setWeaknesses` updates, using functional updaters so add/remove stay in sync. Then read from `strengthIds[index]` / `weaknessIds[index]` in JSX. Drop the `useLazyRef` import if unused.

## Verification

1. Run `npx eslint src/components/playoffs/BracketView.tsx src/components/playoffs/FinalStandings.tsx src/hooks/teams/useTeamsQuery.ts src/components/teams/TeamAnalysisEditForm.tsx` — expect zero `react-hooks/refs` errors.
2. Run `npx eslint .` — expect overall problem count to drop by 15 errors (52 → 37).
3. Run `npm test -- --run` (or at minimum the affected test files) to confirm no regressions in TeamAnalysisEditForm / useTeamsQuery tests.
4. Open the Playoffs route in the preview to confirm the bracket and final standings still render normally, then add/remove a strength row in the team-analysis editor to confirm keys stay stable.

## Out of scope

- All remaining lint problems (`set-state-in-effect`, `exhaustive-deps`, `only-export-components`, `incompatible-library`). We'll tackle those in follow-up batches once the refs bucket is green.
