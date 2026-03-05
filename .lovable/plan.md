

## Plan: Fix Thursday Default + Add Delete to Mass Score Entry

### Issue 1: Thursday date resets to null after batch creation

The `getNextThursday()` helper exists and initializes correctly, but after successful match creation the form resets the date to `null` (line 171 of `useBatchMatchForm.ts`). Fix: change `setSelectedDate(null)` to `setSelectedDate(getNextThursday())`.

**File**: `src/components/admin/batch-matches/useBatchMatchForm.ts` (line 171)

### Issue 2: No delete button on Mass Score Entry matches

The mass score entry `MatchRow` component has no delete functionality. Need to thread a delete handler through the component tree and add a trash icon + confirmation dialog.

**Changes (5 files)**:

1. **`MatchRow.tsx`** — Add optional `onDelete` prop, render a `DestructiveIconButton` with trash icon in the match card header area

2. **`TimeSlotMatchGroup.tsx`** — Accept and pass through `onDeleteMatch` prop to each `MatchRow`

3. **`DateMatchGroup.tsx`** — Accept and pass through `onDeleteMatch` prop to each `TimeSlotMatchGroup`

4. **`MatchesTable.tsx`** — Accept and pass through `onDeleteMatch` prop to each `DateMatchGroup`

5. **`MassScoreEntryTool.tsx`** — Add delete state management:
   - Add `deleteMatchId` state and `DeleteMatchDialog`
   - On confirm: reverse stats if completed, call `deleteMatch()`, call `upsertTeamSeasonStats()`, refetch matches
   - Pass `onDeleteMatch` to `MatchesTable`

The delete flow mirrors what was already built for `EditScoresSection`: trash icon, confirmation dialog, stat reversal for completed matches, then delete + refresh.

