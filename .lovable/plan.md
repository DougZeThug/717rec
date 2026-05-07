## Problem

On mobile, the Schedule page's **Upcoming** tab uses `SwipeableDateGroups`, which shows one date at a time. The active index defaults to `0`, and `groupedMatches` is sorted oldest→newest. Result: stale unplayed matches from 4/30 are shown first, instead of the current 5/7 upcoming slate.

Desktop renders all groups stacked, so it doesn't have this issue.

## Fix

In `src/components/schedule/ScheduleContent.tsx`, derive a smart default index for the upcoming carousel instead of hard-coding `useState(0)`:

1. Compute `defaultUpcomingIndex` from `groupedMatches` whenever `activeTab === 'upcoming'`:
   - Find the first group whose `date` is `>= today` (start-of-day comparison).
   - If none exists (all upcoming are in the past — edge case of stale unscored matches with no future schedule), fall back to the **last** group (most recent) rather than `0`.
2. Sync `upcomingIndex` to that default via a `useEffect` that runs when `groupedMatches` identity changes — but only if the user hasn't manually swiped yet for this dataset. Simplest implementation: track a ref `userHasInteractedRef`; reset to `false` whenever `groupedMatches` reference changes; set to `true` inside `setUpcomingIndex` wrapper passed to `SwipeableDateGroups`.
3. Apply the same logic to `completedIndex` is unnecessary — completed is sorted newest-first so index 0 is already correct.

### Code shape

```ts
const upcomingDefaultIndex = useMemo(() => {
  if (activeTab !== 'upcoming' || groupedMatches.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const idx = groupedMatches.findIndex((g) => {
    const d = new Date(g.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  });
  return idx === -1 ? groupedMatches.length - 1 : idx;
}, [activeTab, groupedMatches]);

const upcomingInteractedRef = useRef(false);
useEffect(() => {
  upcomingInteractedRef.current = false;
  setUpcomingIndex(upcomingDefaultIndex);
}, [upcomingDefaultIndex]);

const handleUpcomingIndexChange = (i: number) => {
  upcomingInteractedRef.current = true;
  setUpcomingIndex(i);
};
```

Pass `handleUpcomingIndexChange` to `SwipeableDateGroups` for the upcoming tab.

## Files changed

- `src/components/schedule/ScheduleContent.tsx` — add smart default index logic for upcoming carousel.

## Verification

- On mobile, open Schedule → Upcoming. With today = 5/7: should land on the 5/7 group, not 4/30.
- Swiping left/right still works and is preserved (no snap-back during the same session).
- On desktop, no behavior change (carousel not used).
- Completed tab unchanged (already shows newest first).
