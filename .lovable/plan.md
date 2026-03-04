

## Fix: React Error #310 on Team Details Page

### Root Cause
In `src/pages/TeamDetails.tsx`, the `useMemo` for breadcrumbs (line ~101) is placed **after** the early returns for loading/not-found states. When the page first renders in a loading state, React sees 7 hooks. Once data loads, it sees 8 hooks (the extra `useMemo`). React requires the same number of hooks on every render — this mismatch causes error #310.

### Fix
Move the `useMemo` for breadcrumbs **above** the early return statements, alongside the other hooks. It can safely reference `team?.name` with a fallback since it will re-compute when `team` becomes available.

**`src/pages/TeamDetails.tsx`**:
- Move `const breadcrumbs = useMemo(...)` to right after the other hooks (after the `teamLog` call, before the `handleBack` function)
- Change the dependency from `team.name` to `team?.name` with a fallback like `'Loading...'`
- Remove the original `useMemo` from its current location below the early returns

One file, ~3 lines moved.

