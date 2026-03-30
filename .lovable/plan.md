

## Fix: H2H Service Swallows Errors Instead of Throwing

### Problem
`fetchBatchHeadToHead()` returns an empty Map on error instead of throwing. TanStack Query never retries, and the UI shows misleading "First meeting" text on transient failures.

### Fix
Replace the error-swallowing `return new Map()` with `handleDatabaseError()`, matching the project's service pattern.

### File: `src/services/TeamCareerStatsService.ts`

Remove the entire error classification block (network vs DB distinction, both `errorLog` calls, and the `return new Map()`) and replace with:

```typescript
if (error) {
  handleDatabaseError(error, 'Failed to fetch batch head-to-head data');
}
```

Add import for `handleDatabaseError` from `@/utils/errorHandler`. Remove the now-unused `errorLog` import if no other usage remains in the file.

### Why this is safe
- `useBatchHeadToHead` already uses `useQuery`, which will catch the thrown error, enter error state, and retry transient failures automatically
- The hook's `getHeadToHead` helper returns `null` when `data` is undefined (query still loading/errored), so components already handle the no-data case gracefully via `MatchHeadToHead`'s `if (!data) return null` check

One file, ~10 lines changed.

