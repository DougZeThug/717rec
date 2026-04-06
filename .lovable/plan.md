

## Fix: "All Brackets" filter sends invalid value to Supabase

### What's wrong

In `src/components/admin/mass-score-entry/FilterBar.tsx`, the "All Brackets" dropdown option has `value="all"`. When selected, this string `"all"` is passed through as `bracketId` to the query, producing `bracket_id=eq.all` in the Supabase request — which fails with a 400 because `"all"` isn't a valid UUID.

### Fix

**File:** `src/components/admin/mass-score-entry/FilterBar.tsx` (line 63)

Change the `onValueChange` handler to treat `"all"` as "no filter" by passing `undefined`:

```tsx
onValueChange={(value) => onBracketChange(value === 'all' ? undefined : value)}
```

One line, one file. The "All Brackets" option stays in the dropdown for UX, but selecting it clears the bracket filter instead of sending an invalid value.

