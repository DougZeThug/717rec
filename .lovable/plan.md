

## Fix `any` Types in Ranking Test File Mock Chains

### Problem
9 lint violations (JS-0323) across 3 ranking test files — all from `any` in `then`/`catch` callback parameters of mock thenable chains.

### Changes

**All 3 files** have identical `makeChain`/`makeQueryChain` helpers. Replace `any` with proper callback types:

```typescript
then: ((
  onFulfilled?: ((value: unknown) => unknown) | null,
  onRejected?: ((reason: unknown) => unknown) | null
) =>
  Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'],
catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
  Promise.resolve(result).catch(onRejected),
```

**Files:**
1. `src/services/rankings/__tests__/RankingCurrentService.test.ts`
2. `src/services/rankings/__tests__/RankingCareerService.test.ts`
3. `src/services/rankings/__tests__/RankingTrendsService.test.ts`

### Scope
3 files, type annotation changes only. No logic changes.

