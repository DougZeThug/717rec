# Data Layer Documentation - 717rec

> **Last Audit**: 2026-01-11
> **Status**: ✅ Healthy (7.5/10)
> **Query/Mutation Count**: 73 files using TanStack Query

---

## Table of Contents

1. [Overview](#overview)
2. [Query Key Conventions](#query-key-conventions)
3. [Error Handling Standards](#error-handling-standards)
4. [Cache Invalidation Rules](#cache-invalidation-rules)
5. [Loading States & Empty States](#loading-states--empty-states)
6. [Stale Time Guidelines](#stale-time-guidelines)
7. [Retry Configuration](#retry-configuration)
8. [Optimistic Updates](#optimistic-updates)
9. [Best Practices](#best-practices)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
11. [Feature Area Breakdown](#feature-area-breakdown)

---

## Overview

This application uses **TanStack Query (React Query)** for data fetching, caching, and synchronization. All data operations should follow the patterns documented here to ensure consistency, reliability, and maintainability.

### Tech Stack
- **Query Library**: TanStack Query v5
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack Query handles server state; React Context for UI state

---

## Query Key Conventions

Query keys are the foundation of TanStack Query's caching system. Follow these conventions for consistency and predictability.

### 1. **Naming Pattern**

Use hierarchical, explicit key structures:

```typescript
// ✅ GOOD: Explicit hierarchical keys
['teams']                              // All teams
['teams', 'division', divisionId]      // Teams in specific division
['teams', 'includeHidden']             // All teams including hidden
['team-details', teamId]               // Single team details
['team-matches', teamId]               // Matches for specific team

// ❌ BAD: Object-based keys (harder to invalidate)
['teams', { divisionId: 'x', includeHidden: true }]
```

### 2. **Key Structure Guidelines**

| Pattern | Use Case | Example |
|---------|----------|---------|
| `[resource]` | All resources | `['matches']`, `['seasons']` |
| `[resource, id]` | Single resource | `['team-details', '123']` |
| `[resource, filter, value]` | Filtered list | `['teams', 'division', 'abc']` |
| `[resource, 'active']` | Active/special subset | `['seasons', 'active']` |
| `[parent, parentId, child]` | Related resources | `['bracket', '456', 'matches']` |

### 3. **Implementation Example**

```typescript
// From: src/hooks/teams/useTeamsQuery.ts
function buildQueryKey(options?: TeamsQueryOptions): (string | boolean)[] {
  const parts: (string | boolean)[] = [TEAMS_QUERY_KEY];

  if (options?.divisionId) {
    parts.push('division', options.divisionId);
  }

  if (options?.includeHidden) {
    parts.push('includeHidden');
  }

  return parts;
}
```

### 4. **Common Query Keys Reference**

| Feature Area | Query Keys |
|-------------|------------|
| **Seasons** | `['seasons']`, `['seasons', 'active']` |
| **Teams** | `['teams']`, `['teams', 'division', id]`, `['team-details', id]` |
| **Matches** | `['matches']`, `['team-matches', teamId]`, `['playoff-matches', bracketId]` |
| **Rankings** | `['rankings']`, `['careerRankings', teamIds]` |
| **Playoffs** | `['bracket-data', bracketId]`, `['playoff-matches', bracketId]` |
| **Admin** | `['hero-cards']`, `['divisions']` |

---

## Error Handling Standards

All queries and mutations must handle errors gracefully and provide user feedback.

### 1. **Query Error Handling**

```typescript
// ✅ GOOD: Error logged and thrown for React Query to handle
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*');

      if (error) {
        errorLog('Error fetching teams:', error);
        throw error; // Let React Query handle the error state
      }

      return data;
    },
  });
};
```

### 2. **Mutation Error Handling** (REQUIRED)

All mutations **must** include `onError` callbacks with toast notifications:

```typescript
// ✅ GOOD: Complete error handling with user feedback
const createSeason = useMutation({
  mutationFn: async (data: CreateSeasonData) => {
    const { data: season, error } = await supabase
      .from('seasons')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return season;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['seasons'] });
    toast({
      title: 'Success',
      description: 'Season created successfully',
    });
  },
  onError: (error: Error) => {
    toast({
      title: 'Error',
      description: `Failed to create season: ${error.message}`,
      variant: 'destructive',
    });
  },
});
```

### 3. **Error Handling Checklist**

- [ ] Query errors are logged with `errorLog()`
- [ ] Errors are thrown (not swallowed)
- [ ] Mutations have `onError` callbacks
- [ ] Users see toast notifications for failures
- [ ] Error messages are descriptive and actionable

---

## Cache Invalidation Rules

Consistent cache invalidation ensures data stays fresh across the app.

### 1. **Centralized Invalidation** (REQUIRED)

**Always use the centralized invalidation function** for match-related updates:

```typescript
// ✅ GOOD: Use centralized function
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';

await invalidateMatchRelatedQueries(queryClient);
```

```typescript
// ❌ BAD: Inline invalidation logic (duplication risk)
queryClient.invalidateQueries({ queryKey: ['matches'] });
queryClient.invalidateQueries({ queryKey: ['teams'] });
queryClient.invalidateQueries({ queryKey: ['rankings'] });
// ... etc
```

### 2. **What `invalidateMatchRelatedQueries` Invalidates**

The centralized function covers:
- All team queries (`teams`, `team`, `team-details`, `v_team_details`)
- Match queries (`matches`, `team-matches`, `playoff-matches`)
- Rankings and standings (`rankings`, `standings`, `careerRankings`)
- Related data (`bracket-data`, `schedule`, `upcoming-matches`)

**Location**: `src/hooks/matches/utils/queryCacheUtils.ts`

### 3. **Partial Invalidation**

For specific, non-match updates, use targeted invalidation:

```typescript
// Update single season
queryClient.invalidateQueries({ queryKey: ['seasons'] });

// Update single team
queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });

// Update hero cards
queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
```

### 4. **Invalidation After Mutations**

**Pattern**: Always invalidate in `onSuccess` callback:

```typescript
onSuccess: () => {
  // Invalidate affected queries
  queryClient.invalidateQueries({ queryKey: ['seasons'] });

  // Show success feedback
  toast({ title: 'Success', description: 'Season updated' });
}
```

---

## Loading States & Empty States

Consistent loading and empty state handling improves UX.

### 1. **Standard Loading Pattern**

```typescript
const { data, isLoading, error } = useQuery({ ... });

if (isLoading) {
  return <Skeleton />; // or <Spinner />
}

if (error) {
  return <ErrorDisplay error={error} />;
}

if (!data || data.length === 0) {
  return <EmptyState message="No data found" />;
}

return <DataDisplay data={data} />;
```

### 2. **Hook Return Pattern**

Custom hooks should return consistent interfaces:

```typescript
// ✅ GOOD: Consistent naming
export function useTeamsQuery(): UseQueryResult<Team[], Error> {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 1000 * 60 * 5,
  });
}

// Usage:
const { data: teams, isLoading, error } = useTeamsQuery();
```

### 3. **Loading State Naming**

Use these standard names:
- `isLoading` - Initial fetch in progress
- `isPending` - TanStack Query v5 terminology (same as isLoading)
- `isFetching` - Any fetch in progress (including background refetch)
- `isRefetching` - Background refetch only

---

## Stale Time Guidelines

Stale time controls how long data is considered fresh before refetching.

### 1. **Recommended Stale Times**

| Data Type | Stale Time | Rationale |
|-----------|-----------|-----------|
| **Real-time data** (schedule, upcoming matches) | 1-2 minutes | Changes frequently during game days |
| **Medium-change data** (team records, standings) | 3-5 minutes | Updates after each match completion |
| **Stable data** (career stats, historical) | 10 minutes | Rarely changes, safe to cache longer |
| **Static data** (seasons, divisions) | 5 minutes | Changes infrequently |

### 2. **Implementation Examples**

```typescript
// Frequently changing data
export const useScheduleData = () => {
  return useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Stable data
export const useCareerRankings = () => {
  return useQuery({
    queryKey: ['careerRankings'],
    queryFn: fetchCareerData,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
```

### 3. **Configuration Rule**

**Always set explicit stale times** - don't rely on defaults:

```typescript
// ✅ GOOD: Explicit stale time
staleTime: 1000 * 60 * 5, // 5 minutes

// ❌ BAD: No stale time (uses default)
// Missing staleTime property
```

---

## Retry Configuration

TanStack Query retries failed requests automatically. Customize when needed.

### 1. **Default Behavior**

- **Default retries**: 3 attempts
- **Exponential backoff**: Built-in by default in v5
- **Retry on**: Network errors, 5xx status codes
- **No retry on**: 4xx client errors

### 2. **Custom Retry Configuration**

```typescript
// Reduce retries for stable data
export const usePlayoffMatches = () => {
  return useQuery({
    queryKey: ['playoff-matches', bracketId],
    queryFn: fetchPlayoffMatches,
    retry: 2, // Only retry twice
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
```

### 3. **When to Customize**

- **Reduce retries**: For data that doesn't change often (playoffs, historical data)
- **Increase retries**: For critical operations that must succeed
- **Disable retries**: For mutations where retry could cause duplicate actions

---

## Optimistic Updates

Optimistic updates provide instant UI feedback before server confirmation.

### 1. **When to Use**

✅ **Good candidates**:
- Score updates in playoffs
- Simple toggles (activate/deactivate)
- Non-critical UI changes

❌ **Avoid for**:
- Complex data relationships
- Critical operations (payments, auth)
- Operations requiring server-side validation

### 2. **Implementation Pattern**

```typescript
// From: src/hooks/playoffs/useOptimisticScoreMutation.ts
const updateScore = useMutation({
  mutationFn: async (matchUpdate) => {
    // 1. Save snapshot for rollback
    const previousData = queryClient.getQueryData(['bracket-data', bracketId]);

    // 2. Optimistically update UI
    queryClient.setQueryData(['bracket-data', bracketId], (old) => {
      return updateMatchInCache(old, matchUpdate);
    });

    // 3. Make API call
    const result = await updateMatchInDatabase(matchUpdate);
    return { result, previousData };
  },
  onError: (error, variables, context) => {
    // 4. Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(['bracket-data', bracketId], context.previousData);
    }

    toast({
      title: 'Error',
      description: 'Failed to update score. Changes reverted.',
      variant: 'destructive',
    });
  },
});
```

### 3. **Optimistic Update Checklist**

- [ ] Save snapshot before update
- [ ] Update cache optimistically
- [ ] Perform server operation
- [ ] Handle rollback on error
- [ ] Notify user of success/failure

---

## Best Practices

### 1. **Conditional Query Execution**

Use `enabled` flag to control when queries run:

```typescript
const { data: teamDetails } = useQuery({
  queryKey: ['team-details', teamId],
  queryFn: () => fetchTeamDetails(teamId),
  enabled: !!teamId, // Only fetch if teamId exists
});
```

### 2. **Dependent Queries**

Chain queries that depend on previous data:

```typescript
// First query
const { data: teams, isLoading: teamsLoading } = useTeamsQuery();

// Second query depends on first
const { data: rankings } = useQuery({
  queryKey: ['careerRankings', teams?.map(t => t.id)],
  queryFn: () => fetchRankings(teams),
  enabled: !!teams && !teamsLoading, // Wait for teams to load
});
```

### 3. **Data Transformation**

Transform data at the query level, not in components:

```typescript
// ✅ GOOD: Transform in hook
export function transformTeamRow(row: VTeamDetailsRow): Team {
  return {
    id: row.team_id,
    name: row.name || 'Unnamed Team',
    power_score: typeof row.power_score === 'number' ? row.power_score : 0,
    // ... consistent transformation
  };
}

// Use in query
return data.map(transformTeamRow);
```

### 4. **Query Deduplication**

Multiple components can call the same hook - React Query deduplicates automatically:

```typescript
// Both components fetch teams only once
function ComponentA() {
  const { data: teams } = useTeamsQuery();
  // ...
}

function ComponentB() {
  const { data: teams } = useTeamsQuery();
  // Same data, no duplicate request!
}
```

---

## Anti-Patterns to Avoid

### ❌ 1. **Inline Invalidation Logic**

```typescript
// BAD: Duplicated logic
const handleUpdate = async () => {
  await updateMatch();
  queryClient.invalidateQueries({ queryKey: ['matches'] });
  queryClient.invalidateQueries({ queryKey: ['teams'] });
  queryClient.invalidateQueries({ queryKey: ['rankings'] });
};

// GOOD: Use centralized function
const handleUpdate = async () => {
  await updateMatch();
  await invalidateMatchRelatedQueries(queryClient);
};
```

### ❌ 2. **Missing Error Handling**

```typescript
// BAD: Silent failures
const createSeason = useMutation({
  mutationFn: async (data) => { ... },
  onSuccess: () => { ... },
  // Missing onError!
});

// GOOD: User sees errors
const createSeason = useMutation({
  mutationFn: async (data) => { ... },
  onSuccess: () => { ... },
  onError: (error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

### ❌ 3. **Object-Based Query Keys**

```typescript
// BAD: Hard to invalidate, cache misses
queryKey: ['teams', { divisionId: 'x', includeHidden: true }]

// GOOD: Explicit hierarchy
queryKey: ['teams', 'division', 'x', 'includeHidden']
```

### ❌ 4. **Over-Fetching with Aggressive Refetch**

```typescript
// BAD: Refetches too often
refetchOnWindowFocus: true,
refetchOnMount: true,
staleTime: 0, // Always stale!

// GOOD: Balanced refetching
refetchOnWindowFocus: false,
refetchOnMount: true,
staleTime: 1000 * 60 * 5, // Fresh for 5 minutes
```

### ❌ 5. **Swallowing Errors**

```typescript
// BAD: Error is lost
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.log(error); // Logged but not thrown!
  return null;
}

// GOOD: Error is propagated
try {
  const data = await fetchData();
  return data;
} catch (error) {
  errorLog('Error:', error);
  throw error; // Let React Query handle it
}
```

---

## Feature Area Breakdown

### Standings & Rankings (3 files)

**Files**: `useRankingsData.ts`, `useCareerRankings.ts`, `useCareerRankingsWithHidden.ts`

**Patterns**:
- Stale time: 3-10 minutes
- Depends on `useTeamsQuery` for team data
- Parallel fetching for career data

**Key Queries**:
- `['rankings']` - Current season rankings
- `['careerRankings', teamIds]` - All-time stats

---

### Schedule & Matches (7 files)

**Files**: `useScheduleData.ts`, `usePendingMatches.ts`, `useTeamMatches.ts`, `useMatchUpdates.ts`, etc.

**Patterns**:
- Stale time: 2 minutes (frequently changing)
- Heavy use of centralized invalidation
- Optimistic updates for score entry

**Key Queries**:
- `['matches']` - All matches
- `['team-matches', teamId]` - Team-specific matches
- `['pending-matches']` - Tie-breaking queue

---

### Playoffs & Brackets (14 files)

**Files**: `usePlayoffBracketData.ts`, `usePlayoffMatches.ts`, `useOptimisticScoreMutation.ts`, etc.

**Patterns**:
- Reduced retry counts (stable data)
- Optimistic updates for score entry
- Dual system support (brackets-manager + legacy)

**Key Queries**:
- `['bracket-data', bracketId]` - Bracket structure
- `['playoff-matches', bracketId]` - Playoff match list

---

### Teams & Team Details (8 files)

**Files**: `useTeamsQuery.ts` (hub), `useTeamDetails.ts`, `useTeamMatches.ts`, etc.

**Patterns**:
- Centralized transformation logic
- Multiple interfaces (array, map, single)
- Division filtering support

**Key Queries**:
- `['teams']` - All teams
- `['teams', 'division', id]` - Division teams
- `['team-details', id]` - Single team with stats

**Best Practice Example**: `useTeamsQuery.ts` provides three interfaces:
```typescript
useTeamsQuery()      // Returns UseQueryResult
useTeamsMap()        // Returns Record<id, Team>
useTeamsArray()      // Returns { teams: [], isLoading, ... }
```

---

### Admin Features (4 files)

**Files**: `useBatchMatchForm.ts`, `useScoreEntryData.ts`, `useScoreSubmission.ts`, `useMatchUpdates.ts`

**Patterns**:
- Batch operations with error tracking
- Comprehensive invalidation after updates
- Detailed logging for debugging

**Key Operations**:
- Batch match creation
- Mass score entry
- Match editing/deletion

---

## Recent Improvements (2026-01-11)

### ✅ Fix #1: Added Error Handling to Mutations
- **File**: `useSeasonMutations.ts`
- **Impact**: Users now see toast notifications for all season operations
- **Changes**: Added `onError` and `onSuccess` callbacks to 4 mutations

### ✅ Fix #2: Consolidated Cache Invalidation
- **Files**: `useMatchUpdates.ts`, `useMatchSubmission.ts`, `admin/useMatchUpdates.ts`
- **Impact**: Single source of truth for invalidation logic
- **Changes**: Replaced inline invalidation with `invalidateMatchRelatedQueries()`

### ✅ Fix #3: Added Explicit Stale Times
- **File**: `useSeasons.ts`
- **Impact**: Predictable caching behavior
- **Changes**: Added 5-minute stale time to both queries

### ✅ Fix #4: Improved Query Keys
- **File**: `useTeamsQuery.ts`
- **Impact**: Better cache hits and invalidation control
- **Changes**: Changed from object keys to explicit hierarchical keys

### ✅ Fix #5: Completed Cache Consolidation
- **File**: `admin/mass-score-entry/hooks/useMatchUpdates.ts`
- **Impact**: All match updates use centralized invalidation
- **Changes**: Removed duplicate invalidation logic

---

## Quick Reference

### Import Statements

```typescript
// TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Centralized invalidation
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';

// Toast notifications
import { useToast } from '@/hooks/use-toast';

// Logging
import { errorLog, dbLog, scoreLog } from '@/utils/logger';

// Supabase client
import { supabase } from '@/integrations/supabase/client';
```

### Common Patterns Cheat Sheet

```typescript
// Query with all standard config
const query = useQuery({
  queryKey: ['resource', id],
  queryFn: fetchFunction,
  staleTime: 1000 * 60 * 5,
  enabled: !!id,
});

// Mutation with complete error handling
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
    toast({ title: 'Success', description: 'Operation completed' });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});

// Centralized invalidation
await invalidateMatchRelatedQueries(queryClient);
```

---

## Health Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **Query Key Consistency** | 90% | 95% |
| **Error Handling Coverage** | 94% | 100% |
| **Explicit Stale Times** | 85% | 100% |
| **Centralized Invalidation** | 100% | 100% |
| **Optimistic Updates** | Limited | Expanded |

**Overall Score**: 7.5/10 → Target: 9/10

---

## Future Improvements

### High Priority
1. **Add season context filtering** to queries that need it (rankings, schedule)
2. **Expand optimistic updates** to regular match score submissions
3. **Add explicit stale times** to remaining 15% of queries

### Medium Priority
4. **Create query key constants** for better type safety
5. **Add query devtools** integration for debugging
6. **Document mutation patterns** with more examples

### Nice to Have
7. **Add prefetching** for predictable navigation paths
8. **Implement pagination** for large data sets
9. **Add suspense support** for better loading states

---

## Support & Questions

For questions about the data layer:
1. Refer to this documentation first
2. Check existing implementations in similar features
3. Use centralized utilities when available
4. Follow the patterns, don't reinvent solutions

**Remember**: Consistency > Cleverness. Simple, predictable patterns beat complex optimizations.

---

*Last updated: 2026-01-11*
*Data Layer Audit Report: Available in conversation history*
