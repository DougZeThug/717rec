

## Move ranking snapshot saves to match completion events

### Problem
Currently, `saveRankingsToStorage` is called every time the rankings page renders -- from 3 separate locations. This causes:
- 401 errors for anonymous visitors (the Sentry error you saw)
- Wasteful database writes on every page load by every visitor
- Overwrites of the "previous rankings" snapshot constantly, making the rank-change feature unreliable

### What changes

**1. Remove `saveRankingsToStorage` calls from page-load code (3 files)**

- `src/hooks/useTeamRankings.ts` (line 113) -- remove the `saveRankingsToStorage(finalRankings)` call
- `src/services/RankingsCalculationService.ts` (line 32) -- remove the `saveRankingsToStorage(finalRankings)` call
- `src/utils/rankingUtils/sortAndUpdateRankings.ts` (line 19) -- remove the `saveRankingsToStorage(finalRankings)` call

These hooks/services will continue to calculate and return rankings for display, but will no longer try to persist them on every render.

**2. Add ranking snapshot save to the match completion flow**

After scores are submitted, the app already calls `invalidateMatchRelatedQueries` to refresh cached data. We add a ranking snapshot save at these two key entry points:

- `src/hooks/matches/utils/queryCacheUtils.ts` -- enhance `invalidateMatchRelatedQueries` to also trigger a ranking snapshot save after cache invalidation completes. This covers all score submission paths (mass score entry, individual match updates, playoff match updates).

The logic will:
1. Check if the user is authenticated (skip for anonymous)
2. Wait for cache invalidation to complete
3. Fetch the freshly calculated rankings from the query cache
4. Call `saveRankingsToStorage` with those rankings

**3. Keep localStorage fallback for anonymous visitors**

The `usePreviousRankings` hook will continue to load from the database (for authenticated users) or localStorage (for anonymous visitors). No changes needed there -- it already handles both cases.

### Technical details

**queryCacheUtils.ts changes:**

```typescript
export const invalidateMatchRelatedQueries = async (queryClient: QueryClient) => {
  // ... existing invalidation logic ...

  // After invalidation, save ranking snapshot (authenticated users only)
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Small delay to let React Query refetch rankings
      setTimeout(async () => {
        const rankingsData = queryClient.getQueryData<Ranking[]>(['rankings']);
        if (rankingsData && rankingsData.length > 0) {
          const { saveRankingsToStorage } = await import('@/utils/rankingUtils');
          await saveRankingsToStorage(rankingsData);
        }
      }, 2000);
    }
  } catch {
    // Non-critical, silently ignore
  }
};
```

**Files modified:**
- `src/hooks/useTeamRankings.ts` -- remove saveRankingsToStorage call
- `src/services/RankingsCalculationService.ts` -- remove saveRankingsToStorage call and import
- `src/utils/rankingUtils/sortAndUpdateRankings.ts` -- remove saveRankingsToStorage call and import
- `src/hooks/matches/utils/queryCacheUtils.ts` -- add post-invalidation ranking snapshot save

### What this achieves
- Eliminates the 401 Sentry errors for anonymous users
- Ranking snapshots only update when scores actually change (not on every page view)
- Rank change indicators become meaningful (showing change since last score update, not since last page load)
- Reduces unnecessary database writes significantly

