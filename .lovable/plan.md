

## Fix: Exclude `enabled` from Teams Query Cache Key

### Problem
`buildQueryKey()` includes the full `options` object (including `enabled`) in the cache key. When two components request the same team data with different `enabled` values, TanStack Query creates separate cache entries and fires duplicate network requests.

### Fix

**File: `src/hooks/teams/useTeamsQuery.ts`**

Strip `enabled` from the options before building the key:

```typescript
function buildQueryKey(options?: TeamsQueryOptions): (string | object)[] {
  const { enabled: _enabled, ...dataOptions } = options || {};
  if (!dataOptions.divisionId && !dataOptions.includeHidden) {
    return [TEAMS_QUERY_KEY];
  }
  return [TEAMS_QUERY_KEY, dataOptions];
}
```

One file, ~3 lines changed. No other files affected.

