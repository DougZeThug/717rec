

## Fix: Rematches Blocking Auto-Schedule Save

### Problem
The auto-schedule save validation treats rematches as hard **errors**, which blocks saving the entire schedule. In a league with limited teams per timeslot, rematches are often unavoidable -- especially later in a season. The user already has an `avoidRematches` toggle, meaning rematches are expected when that setting is off (or when no alternative exists).

The error from logs: `"Schedule validation failed: These teams have already played each other this season"`

### Root Cause
In `src/utils/autoSchedule/validation.ts`, `checkForRematches()` pushes rematch findings into the `errors` array with `severity: 'error'`. Since `isValid` requires zero errors, any rematch blocks the save entirely.

### Fix
Downgrade rematches from errors to **warnings**. They should inform the admin but not block saving.

**File: `src/utils/autoSchedule/validation.ts`**

1. Move rematch findings from `errors` to `warnings` array
2. Change `checkForRematches` to push into `warnings` instead of `errors`
3. Update the function signature accordingly

The change is small -- in `checkForRematches`, push to `warnings` instead of `errors`:

```typescript
// Before: errors.push({ matchId, type: 'rematch', message: '...', severity: 'error' });
// After:  warnings.push({ matchId, type: 'rematch', message: '...' });
```

**File: `src/hooks/useAutoSchedule/useAutoScheduleSave.ts`**

4. After validation passes, show a toast warning if there are rematch warnings so the admin is still informed before the save completes.

No database changes needed.

