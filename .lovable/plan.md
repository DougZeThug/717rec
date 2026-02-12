

## Always Default Rankings Sort to Power Score

### Problem
The `RankingsTable` component reads a saved sort preference from `localStorage` on mount, so if a user previously sorted by another column (e.g., wins, team name), that sort persists on their next visit instead of always showing power score first.

### Change
In `src/components/stats/RankingsTable.tsx`, simplify the `sortOptions` initial state to always use `{ field: 'powerScore', direction: 'desc' }` -- remove the `localStorage` read in the initializer. Keep the `localStorage` write in `handleSortChange` so within-session sorting still works, but it will never override the default on page load.

### Technical Detail

**File: `src/components/stats/RankingsTable.tsx`** (lines ~33-47)

Replace the current `useState` initializer that reads from `localStorage`:

```ts
const [sortOptions, setSortOptions] = useState<SortOptions>({
  field: 'powerScore',
  direction: 'desc',
});
```

The `handleSortChange` function can optionally stop writing to `localStorage` as well (since it's no longer read), but removing the read is the only required change.

