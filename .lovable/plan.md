

## Auto-select Upcoming Thursday in Batch Match Form

### Change
Initialize `selectedDate` in `useBatchMatchForm.ts` to the next (or current) Thursday instead of `null`.

### Implementation

**`src/components/admin/batch-matches/useBatchMatchForm.ts`**:
- Add a helper function `getNextThursday()` that returns today if it's Thursday, otherwise the next Thursday (with time set to noon to avoid timezone issues)
- Change `useState<Date | null>(null)` to `useState<Date | null>(getNextThursday())`

```typescript
function getNextThursday(): Date {
  const today = new Date();
  const day = today.getDay();
  const daysUntilThursday = (4 - day + 7) % 7; // 4 = Thursday
  const thursday = new Date(today);
  thursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 0 : daysUntilThursday));
  thursday.setHours(12, 0, 0, 0);
  return thursday;
}
```

One file, ~10 lines added.

