

## Quality Improvements to CareerBulkFetchService

Three targeted improvements, all in one file.

### Change 1: Early return for empty teamIds

**File:** `src/services/career/CareerBulkFetchService.ts`

Add an early return at the top of `fetchAllTeamsCareerData` before any queries fire:

```ts
if (teamIds.length === 0) {
  return new Map();
}
```

This avoids 7+ unnecessary Supabase calls with empty `.in()` filters (which Supabase handles but wastefully).

### Change 2: Cache bracketDivisionWeights across calls

The bracket division weights and season mappings are fetched per-call but rarely change. Use a simple module-level cache with a TTL matching the existing `QUERY_STALE_TIMES.STANDARD` (5 minutes).

Add a small cache object at the module level that stores `{ bracketDivisionWeights, bracketSeasonMap, timestamp }`. On subsequent calls within the TTL, skip the brackets query and reuse cached values. This saves one query per call after the first.

### Change 3: No change for groupMatchesByTeam

The current `groupMatchesByTeam` function is 15 lines, handles the dual-key grouping cleanly, and is only used in this one file. Adding a generic utility abstraction would add complexity without benefit at this scale. Skipping this recommendation.

### Summary

| # | What | File |
|---|------|------|
| 1 | Early return on empty input | `CareerBulkFetchService.ts` |
| 2 | Module-level cache for bracket weights | `CareerBulkFetchService.ts` |

One file changed. No behavioral differences for existing callers.

