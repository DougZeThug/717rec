

## Plan: Fix Build Errors + Add Match Delete to Admin Scores Tab

### Build Errors (2 issues)

**1. `fetchMatchForTie` wrong import** (`src/hooks/usePendingMatches.ts:12`)
- `fetchMatchForTie` is exported from `MatchReadService`, not `MatchWriteService`
- Fix: move the import to the `MatchReadService` import block

**2. Test type errors** (`src/hooks/matches/__tests__/matchDatabaseUtils.test.ts`)
- `updateMatch` returns a full database row type, but the mock returns partial objects `{ id, team1_score, team2_score }`
- Fix: cast each mock return value with `as any` to satisfy TypeScript without needing 18+ fields

### Feature: Add Delete Button to Admin Scores Tab

The match delete functionality currently lives on the Schedule page. The user wants it available in the admin Scores tab instead (or in addition), with a trash can icon on each match item.

**Changes:**

1. **`MatchScoreItem.tsx`** — Add a `DestructiveIconButton` (trash can) to the collapsible trigger row, with an `onDelete` callback prop

2. **`MatchScoresList.tsx`** — Pass through `onDeleteMatch` prop to each `MatchScoreItem`

3. **`EditScoresSection.tsx`** — Add match delete state + logic:
   - Import `useMatchDelete` hook (already exists at `src/hooks/matches/updates/useMatchDelete.ts`)
   - Add `DeleteMatchDialog` confirmation dialog
   - Wire up delete handler that calls `deleteMatch` service + reverses stats if completed
   - Alternatively, use a simpler approach: add state for `deleteMatchId`, use the existing `deleteMatch` service directly with a confirmation dialog

4. **`ScoresTab.tsx`** — No changes needed (EditScoresSection handles everything internally)

The delete flow:
- User clicks trash icon on a match row
- Confirmation dialog appears ("Are you sure?")
- On confirm: calls `deleteMatch(matchId)` from MatchWriteService, refreshes queries
- Toast confirms deletion

