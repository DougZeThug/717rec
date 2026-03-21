

## Fix Percentile Calculation Bug

### Problem
The `calculatePercentile` function in `percentileUtils.ts` uses `findIndex` with strict equality (`===`) to locate a team's value in a sorted array. This is fragile with floating-point numbers and can produce incorrect ranks. For a team ranked 6th out of 46, the expected percentile is ~89, but the current logic returns 77 — indicating the value is being found at the wrong position in the sorted array.

### Root Cause
`findIndex(v => v === value)` on sorted floating-point arrays is unreliable. Sort order can vary for very close values, and if multiple values are close but not identical, the position found may not match the team's true rank.

### Fix

**File: `src/utils/percentileUtils.ts`** — `calculatePercentile` function

Replace the `findIndex`-based rank calculation with a direct count approach:

```typescript
// Count how many values are strictly better than this one
const above = allValues.filter(v => higherIsBetter ? v > value : v < value).length;
const rank = above + 1;

// Count how many values are strictly worse
const below = allValues.filter(v => higherIsBetter ? v < value : v > value).length;
const percentile = total > 1 ? Math.round((below / (total - 1)) * 100) : 100;
```

This correctly handles ties (tied teams get the same percentile) and eliminates floating-point comparison issues with sorted array indexing.

For rank 6 of 46: `below = 40`, percentile = round(40/45 × 100) = **89** — matching the user's expectation.

