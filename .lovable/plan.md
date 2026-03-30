

## Fix: Stage Query Missing `settings` and `number` Columns

### Problem
The `transformFromSql` method in `BracketsViewerAdapter.ts` fetches stages with:
```sql
SELECT id, name, type, tournament_id FROM stage
```
But brackets-viewer expects every stage object to have `settings` (with properties like `skipFirstRound`, `size`, `grandFinal`) and `number`. Since `settings` is missing, the library crashes with `r.settings is undefined`.

### Fix

**File: `src/services/brackets/viewer/BracketsViewerAdapter.ts`** (line 38)

Change the stage select from:
```typescript
.select('id, name, type, tournament_id')
```
to:
```typescript
.select('id, name, type, tournament_id, number, settings')
```

This ensures the stage object passed to brackets-viewer includes the `settings` and `number` fields it requires.

**One file, one line changed.**

