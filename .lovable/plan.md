

## Fix: Brackets Not Showing After Creation

### Problem
When you create a bracket, it's saved to the `brackets` table **without a `season_id`**. But the Playoffs page filters brackets by the active season (`WHERE season_id = <active_season_id>`). Since the new bracket has `season_id = null`, it's excluded from the query results — making it invisible both immediately and after page refresh.

The bracket **is** being saved to the database; it's just invisible because of the missing season filter.

### Fix

**File: `src/services/bracket-creator.ts`** (~2 lines changed)

1. Accept `seasonId` in the creation options (it's already available from the calling component's page data)
2. Include `season_id` in the `brackets` table insert

**File: `src/components/playoffs/BracketCreationDialog.tsx`** (~1 line changed)

Pass the active season ID through to `createBracket()`. The dialog receives `data` which includes `selectedSeasonId` — but currently it's not wired through. We need to:
- Add `seasonId` prop to the dialog (passed from `PlayoffPageLayout` → `PlayoffDialogs` → `BracketCreationDialog`)
- Pass it into the `createBracketMutation.mutateAsync()` call

**File: `src/components/playoffs/dialogs/PlayoffDialogs.tsx`** (~1 line changed)

Thread `seasonId` prop through to `BracketCreationDialog`.

**File: `src/components/playoffs/layout/PlayoffPageLayout.tsx`** (~1 line changed)

Pass `data.selectedSeasonId` to `PlayoffDialogs`.

### Summary

4 files, ~6 lines total. The bracket insert adds `season_id: seasonId` so it matches the active season filter and appears in the bracket list immediately after creation.

