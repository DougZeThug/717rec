# Database Code Smell Fixes - Phased Implementation Plan

This document outlines database-related code smells found in the 717rec codebase and provides a phased approach to fix them.

---

## Summary of Issues Found

| Severity | Count | Category |
|----------|-------|----------|
| **HIGH** | 4 | Data integrity, manual polling, fake data |
| **MEDIUM** | 14 | N+1 queries, missing cache, query key conflicts |
| **LOW** | 5 | Minor inefficiencies |

---

## Phase 1: Critical Data Integrity & Fake Data (HIGH Priority)

### 1.1 Fix Multiple Active Seasons Bug
**File**: `src/hooks/useSeasonMutations.ts` (lines 58-73)

**Problem**: When activating a season, other seasons aren't deactivated first. This can result in multiple active seasons.

**Fix**:
```typescript
// Before activating, deactivate all other seasons
const { error: deactivateError } = await supabase
  .from('seasons')
  .update({ is_active: false })
  .neq('id', seasonId);

if (deactivateError) throw deactivateError;

// Then activate the selected season
const { error } = await supabase
  .from('seasons')
  .update({ is_active: true })
  .eq('id', seasonId);
```

**Why it matters**: Prevents data corruption and unpredictable app behavior.

---

### 1.2 Replace Simulated Historical Data with Real Data
**File**: `src/hooks/useHistoricalPowerScores.ts` (lines 41-58)

**Problem**: Currently generates random fake data instead of fetching real historical power scores.

**Fix Options**:
1. **If `power_score_history` table exists**: Query real data from it
2. **If no history table**: Create one and populate it when power scores change

**Current fake code to replace**:
```typescript
// REMOVE: Generates random data
const weekOldScore = Math.max(0, currentScore - (Math.random() * 10 - 2));
```

**Replace with real query**:
```typescript
const { data: historyData } = await supabase
  .from('power_score_history')
  .select('score, recorded_at')
  .eq('team_id', teamId)
  .gte('recorded_at', oneWeekAgo)
  .order('recorded_at', { ascending: true });
```

**Why it matters**: Sports app showing fake trend data undermines trust and usefulness.

---

## Phase 2: Replace Manual Polling with TanStack Query (HIGH Priority)

### 2.1 Refactor useTimeslotQuery.ts
**File**: `src/hooks/useTimeslotQuery.ts` (lines 9-83)

**Problem**: Uses `useState` + `useEffect` + `setInterval` for manual polling (~75 lines of code).

**Fix**: Replace with TanStack Query's built-in refetch:
```typescript
export const useTimeslotQuery = () => {
  return useQuery({
    queryKey: ['timeslots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_timeslots')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 30000, // Auto-poll every 30 seconds
  });
};
```

**Benefits**: Reduces ~75 lines to ~15 lines, smarter refetching, cache coordination.

---

### 2.2 Refactor useMatchTimeslots.ts
**File**: `src/hooks/useMatchTimeslots.ts` (lines 9-218)

**Problem**: ~210 lines of manual fetch + polling with duplicated transformation logic.

**Fix**: Similar TanStack Query refactor:
```typescript
export const useMatchTimeslots = (seasonId?: string) => {
  return useQuery({
    queryKey: ['match-timeslots', seasonId],
    queryFn: async () => {
      // Fetch and transform data here
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000,
    enabled: !!seasonId,
  });
};
```

**Benefits**: Eliminates duplicate logic, proper caching, 80% code reduction.

---

## Phase 3: Add Missing Cache Configuration (MEDIUM Priority)

Add `staleTime` to all queries that are missing it. This prevents unnecessary database hits.

### Recommended Cache Times

| Data Type | staleTime | Files to Update |
|-----------|-----------|-----------------|
| Static (seasons, divisions) | 10-15 min | `useSeasons.ts`, `useDivisions.ts` |
| Semi-static (hero cards, badges) | 5-10 min | `useHeroCards.ts`, `useTeamBadges.ts` |
| Moderate change (teams, stats) | 2-5 min | `useTeamGameStats.ts`, `useTeamRequests.ts` |
| Frequent change (matches) | 1-2 min | `useScheduleData.ts`, `useTeamMatches.ts` |

### 3.1 Files to Update

| File | Line | Add staleTime |
|------|------|---------------|
| `src/hooks/useSeasons.ts` | 6 | `staleTime: 1000 * 60 * 10` (10 min) |
| `src/hooks/useHeroCards.ts` | 8, 25, 41 | `staleTime: 1000 * 60 * 5` (5 min) |
| `src/hooks/useTeamBadges.ts` | 38+ | `staleTime: 1000 * 60 * 5` (5 min) |
| `src/hooks/useTeamGameStats.ts` | 5 | `staleTime: 1000 * 60 * 2` (2 min) |
| `src/hooks/useTeamRequests.ts` | 30, 51 | `staleTime: 1000 * 60 * 2` (2 min) |
| `src/hooks/useBlindDrawSignups.ts` | 16, 32 | `staleTime: 1000 * 60 * 2` (2 min) |
| `src/hooks/useTeamMatches.ts` | 6 | `staleTime: 1000 * 60 * 2` (2 min) |

**Example fix**:
```typescript
// Before
return useQuery({
  queryKey: ['seasons'],
  queryFn: fetchSeasons,
});

// After
return useQuery({
  queryKey: ['seasons'],
  queryFn: fetchSeasons,
  staleTime: 1000 * 60 * 10, // Cache for 10 minutes
});
```

---

## Phase 4: Fix Query Key Conflicts (MEDIUM Priority)

### 4.1 Problem
Multiple hooks use the same query key `['matches']`:
- `src/hooks/useScheduleData.ts` (line 10)
- `src/hooks/rankings/useRankingsData.ts` (line 15)
- `src/hooks/usePendingMatches.ts` (line 22)

This causes incorrect cache sharing and invalidation.

### 4.2 Fix: Use Unique, Scoped Query Keys

| File | Current Key | New Key |
|------|-------------|---------|
| `useScheduleData.ts` | `['matches']` | `['matches', 'schedule', seasonId]` |
| `useRankingsData.ts` | `['matches']` | `['matches', 'rankings', seasonId]` |
| `usePendingMatches.ts` | `['matches']` | `['matches', 'pending', seasonId]` |

**Example**:
```typescript
// useScheduleData.ts
queryKey: ['matches', 'schedule', seasonId],

// useRankingsData.ts
queryKey: ['matches', 'rankings', seasonId],
```

---

## Phase 5: Fix N+1 Query Patterns (MEDIUM Priority)

### 5.1 useMatchComments.ts - Sequential Queries
**File**: `src/hooks/matches/useMatchComments.ts` (lines 93-114)

**Problem**: Three sequential queries: profile → team membership → insert comment

**Fix**: Use `Promise.all` for parallel fetching:
```typescript
const [profileResult, teamResult] = await Promise.all([
  supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  supabase.from('team_players').select('team_id').eq('user_id', user.id).maybeSingle()
]);
```

---

### 5.2 useTeamAnalysis.ts - Check-Then-Act Pattern
**File**: `src/hooks/useTeamAnalysis.ts` (lines 59-94)

**Problem**: SELECT to check existence, then conditional INSERT or UPDATE.

**Fix**: Use Supabase's built-in upsert:
```typescript
const { error } = await supabase
  .from('team_analysis')
  .upsert({
    team_id: teamId,
    analysis_text: text,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'team_id'
  });
```

---

### 5.3 useAutoScheduleSave.ts - Redundant Season Fetch
**File**: `src/hooks/useAutoSchedule/useAutoScheduleSave.ts` (lines 32-37)

**Problem**: Fetches active season inside mutation instead of using cached data.

**Fix**: Accept `seasonId` as parameter from the already-fetched `useActiveSeason()` hook:
```typescript
const saveSchedule = useMutation({
  mutationFn: async ({ schedule, seasonId }: { schedule: Schedule; seasonId: string }) => {
    // Use passed seasonId instead of fetching again
  }
});
```

---

## Phase 6: Optimize Algorithm Performance (MEDIUM Priority)

### 6.1 useTeamRankings.ts - O(n²) Lookup in Sort
**File**: `src/hooks/useTeamRankings.ts` (lines 75-102)

**Problem**: Calls `find()` inside sort comparator, creating O(n²) complexity.

**Fix**: Pre-build a Map for O(1) lookups:
```typescript
// Create lookup map BEFORE sorting
const powerScoreMap = new Map(
  teamsToUse.map(t => [t.id, t.power_score])
);

// Use map in sort (O(1) lookup)
const sortedRankings = calculatedRankings.sort((a, b) => {
  const aScore = powerScoreMap.get(a.teamId) ?? 0;
  const bScore = powerScoreMap.get(b.teamId) ?? 0;
  // ... rest of comparison
});
```

---

## Phase 7: Minor Optimizations (LOW Priority)

### 7.1 useUpdateRequestStatus - Redundant Auth Call
**File**: `src/hooks/useTeamRequests.ts` (line 144)

**Problem**: Calls `supabase.auth.getUser()` in mutation when auth context is already available.

**Fix**: Use the auth context from `useAuth()` hook instead.

---

### 7.2 usePendingMatches - Edge Case Error Handling
**File**: `src/hooks/usePendingMatches.ts` (lines 135-142)

**Problem**: Missing null check for match data.

**Fix**: Add explicit null handling:
```typescript
if (!currentMatch?.data) {
  throw new Error('Match not found');
}
```

---

## Implementation Checklist

### Phase 1 (Critical - Do First)
- [ ] Fix `useSeasonMutations.ts` - multiple active seasons bug
- [ ] Fix `useHistoricalPowerScores.ts` - replace fake data

### Phase 2 (High Priority)
- [ ] Refactor `useTimeslotQuery.ts` to TanStack Query
- [ ] Refactor `useMatchTimeslots.ts` to TanStack Query

### Phase 3 (Medium Priority - Quick Wins)
- [ ] Add staleTime to `useSeasons.ts`
- [ ] Add staleTime to `useHeroCards.ts` (3 hooks)
- [ ] Add staleTime to `useTeamBadges.ts` (3 hooks)
- [ ] Add staleTime to `useTeamGameStats.ts`
- [ ] Add staleTime to `useTeamRequests.ts` (2 hooks)
- [ ] Add staleTime to `useBlindDrawSignups.ts` (2 hooks)
- [ ] Add staleTime to `useTeamMatches.ts`

### Phase 4 (Medium Priority)
- [ ] Fix query key in `useScheduleData.ts`
- [ ] Fix query key in `useRankingsData.ts`
- [ ] Fix query key in `usePendingMatches.ts`

### Phase 5 (Medium Priority)
- [ ] Fix N+1 in `useMatchComments.ts`
- [ ] Fix check-then-act in `useTeamAnalysis.ts`
- [ ] Fix redundant fetch in `useAutoScheduleSave.ts`

### Phase 6 (Medium Priority)
- [ ] Optimize sort in `useTeamRankings.ts`

### Phase 7 (Low Priority)
- [ ] Fix auth call in `useTeamRequests.ts`
- [ ] Add null check in `usePendingMatches.ts`

---

## Testing After Each Phase

After completing each phase:
1. Run `npm run lint` to check for errors
2. Run `npm run dev` and test affected features
3. Check browser Network tab to verify reduced queries
4. Commit changes with descriptive message

---

*Generated: 2026-01-16*
