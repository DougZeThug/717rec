

## Fix: Update RankingPersistenceService test mock for `.maybeSingle()`

### Problem

The previous fix changed `getCurrentSeasonId` from `.single()` to `.maybeSingle()`, but the test's `seasonsSelectChain` helper only mocks `.single()` — not `.maybeSingle()`. The 4 failing tests all hit this missing method.

### Change

**File: `src/services/rankings/__tests__/RankingPersistenceService.test.ts`**

Update `seasonsSelectChain` (lines 60–70) to mock `maybeSingle` instead of `single`:

```typescript
const seasonsSelectChain = (result: { data: unknown; error: unknown | null }) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve(result),
    }),
  }),
});
```

Update the JSDoc comment on line 62 to say `.maybeSingle()` instead of `.single()`.

### Scope

1 file, 2-line change. No logic changes.

