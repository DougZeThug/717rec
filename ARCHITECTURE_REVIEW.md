# Architectural Review: 717rec

**Review Date:** January 12, 2026
**Reviewer Role:** Principal Software Architect
**Codebase Version:** 0a48e66

---

## Executive Summary

The 717rec codebase is a well-structured React/TypeScript application with a solid foundation using modern tools (TanStack Query, Supabase, shadcn/ui). The project demonstrates good awareness of separation of concerns, with distinct layers for services, hooks, and components. However, as the application has grown, several architectural patterns have degraded, leading to code duplication, leaky abstractions, and overly complex service classes that will impede future development velocity.

**Overall Assessment:** The architecture is functional but showing signs of organic growth without refactoring. Addressing the critical risks identified below will significantly improve long-term maintainability.

---

## ✅ Architectural Strengths

### 1. Modern Data Fetching Pattern
The codebase effectively leverages TanStack Query for server state management with proper caching strategies.

```typescript
// src/hooks/teams/useTeamsQuery.ts:143-150
export function useTeamsQuery(options?: TeamsQueryOptions): UseQueryResult<Team[], Error> {
  return useQuery({
    queryKey: buildQueryKey(options),
    queryFn: () => fetchTeams(options),
    staleTime: 1000 * 60 * 5, // 5 minutes - team data only changes when scores are entered
    enabled: options?.enabled !== false,
  });
}
```

This pattern provides automatic caching, deduplication, and background refetching - a solid foundation for data management.

### 2. Code-Splitting and Lazy Loading
All page components are properly lazy-loaded, reducing initial bundle size:

```typescript
// src/App.tsx:28-44
const Index = lazy(() => import('./pages/Index'));
const Help = lazy(() => import('./pages/Help'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
// ... all 15 pages lazy loaded
```

### 3. Centralized Type Definitions
Types are well-organized in `src/types/` with proper barrel exports, making it easy to maintain and extend data contracts:

```typescript
// src/types/index.ts - clean re-exports
export * from './career';
export * from './chart';
export * from './match';
export * from './playoff';
// ... 15+ type modules
```

### 4. Error Handling Infrastructure
A well-designed error hierarchy exists with custom error classes and categorization:

```typescript
// src/utils/errors.ts:11-50
export class SupabaseError extends Error { /* ... */ }
export class BracketValidationError extends Error { /* ... */ }
export class TeamValidationError extends Error { /* ... */ }
export class MatchSyncError extends Error { /* ... */ }
```

The `categorizeError()` function provides user-friendly messages mapped to error types.

### 5. Server-Side Admin Authorization
Admin access is properly derived from database state, not client-side:

```typescript
// src/hooks/useAdminAccess.ts:11
const isAdminAccessGranted = authInitialized && !!user && profile?.is_admin === true;
```

### 6. Leveraging Database Views
Business logic like power score calculations has been correctly pushed to the database layer:

```typescript
// src/utils/powerScore/calculatePowerScore.ts:6-9
/**
 * DEPRECATED: Power score calculation is now handled in the database
 * The v_team_details view now uses the 40/45/15 formula...
 */
```

---

## ⚠️ Critical Architectural Risks

### 1. **Data Access Layer Leaking into Presentation**

**Impact:** High | **Effort to Fix:** Medium

Supabase queries appear directly in 7+ component files, violating separation of concerns:

```typescript
// src/components/admin/hero-cards/TargetSelector.tsx:56-63
const { data, error } = await supabase.from('teams').select('id, name').order('name');
```

This pattern:
- Makes components harder to test (requires mocking Supabase)
- Creates implicit coupling between UI and database schema
- Leads to duplicated queries across the codebase

**Evidence:**
- `src/components/admin/hero-cards/TargetSelector.tsx:58,68` (inline queries)
- `src/components/admin/batch-matches/useBatchMatchForm.ts:151` (mutation in component hook)
- `src/components/playoffs/form/bracket-teams/hooks/useTeamSeedMutation.ts` (another example)

**Recommendation:** Create service layer functions for all data access. Components should only interact with custom hooks that abstract the data source.

---

### 2. **Severe DRY Violation: Duplicated Data Fetching Logic**

**Impact:** High | **Effort to Fix:** Low

The `fetchBrackets` function is implemented identically in **4 separate files**:

| File | Line |
|------|------|
| `src/components/admin/mass-score-entry/hooks/state/useFiltersState.ts` | 12-17 |
| `src/components/admin/mass-score-entry/hooks/useMatchFilters.ts` | 12-17 |
| `src/components/admin/mass-score-entry/hooks/useScoreEntryData.ts` | 18-25 |
| `src/components/admin/mass-score-entry/useScoreEntryData.ts` | 18-25 |

```typescript
// Identical code in 4 places:
const fetchBrackets = async () => {
  const { data, error } = await supabase.from('brackets').select('id, title').order('title');
  if (error) throw error;
  setBrackets(data || []);
};
```

**Impact:** Any bug fix or enhancement must be applied 4 times. This pattern is a maintenance nightmare.

**Recommendation:** Create a shared hook `useBracketsQuery()` in `src/hooks/brackets/` and import it everywhere needed.

---

### 3. **God Object: BracketManagerService**

**Impact:** High | **Effort to Fix:** High

The `BracketManagerService` class is **1,088 lines** with responsibilities spanning:
- Bracket creation and deletion
- Match updates and score propagation
- BYE match handling
- Losers bracket normalization
- Grand Final population
- Final standings calculation
- Admin toggle operations

```typescript
// src/services/brackets/manager/BracketManagerService.ts
// Line count: 1,088 lines, 20+ methods
```

This violates the Single Responsibility Principle and makes the class:
- Difficult to understand and modify
- Hard to test in isolation
- Prone to cascading bugs

**Recommendation:** Split into focused services:
- `BracketCreationService` (creation, seeding)
- `MatchUpdateService` (score updates, propagation)
- `ByeMatchService` (BYE detection, admin toggles)
- `StandingsService` (final standings calculation)

---

### 4. **Hardcoded Credentials in Source Control**

**Impact:** Critical (Security) | **Effort to Fix:** Low

The Supabase URL and anon key are hardcoded in the client file:

```typescript
// src/integrations/supabase/client.ts:6-8
const SUPABASE_URL = 'https://wcitdamvochthvxvtxyb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

While anon keys are designed to be public, this pattern:
- Makes environment switching difficult
- Could lead to accidental exposure of service role keys
- Prevents proper CI/CD configuration

**Recommendation:** Load from environment variables:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

---

### 5. **Duplicated Team Transformation Logic**

**Impact:** Medium | **Effort to Fix:** Medium

Two files contain nearly identical team data transformation logic:

| Location | Purpose |
|----------|---------|
| `src/hooks/teams/useTeamsQuery.ts:44-65` | `transformTeamRow()` |
| `src/services/teams/TeamFetchService.ts:38-61` | Inline mapping |

Both transform database rows to `Team` objects with the same field mappings. Changes to one require changes to the other.

**Recommendation:** Consolidate into a single `TeamTransformer` utility that both locations import.

---

## 💡 Areas for Improvement

### 1. **Business Logic Duplication in Hooks**

The `useRankings` hook (`src/hooks/rankings/useRankings.ts`) duplicates logic that also exists in `RankingsCalculationService.ts`:

```typescript
// Both files contain:
const divisionWeights = await fetchDivisionWeights();
const unsortedRankings = teams.map((team) =>
  createRankingObject(team, teams, latestMatches, previousRankings, divisionWeights)
);
```

**Recommendation:** The hook should delegate to the service, keeping hooks focused on state management and UI lifecycle.

---

### 2. **LocalStorage for Ranking State**

Previous rankings are stored in localStorage:

```typescript
// src/hooks/rankings/useRankings.ts:34-38
const savedRankings = localStorage.getItem('previousRankings');
previousRankings = savedRankings ? JSON.parse(savedRankings) : {};
```

This approach:
- Doesn't work in private browsing mode (iOS Safari)
- Loses state when clearing browser data
- Isn't synchronized across devices

**Recommendation:** Consider storing previous rankings in the database or using a more robust client-side solution.

---

### 3. **Circular Dependency Workaround**

The error handling module uses dynamic imports to avoid circular dependencies:

```typescript
// src/utils/errors.ts:171-182
import('./logger')
  .then(({ errorLog }) => {
    errorLog(`${context}:`, { ... });
  })
  .catch(() => {
    console.error(`${context}:`, { ... });
  });
```

This suggests the module dependency graph needs restructuring.

**Recommendation:** Consider separating logger constants/types from logger implementation to break the cycle.

---

### 4. **Missing Centralized Configuration**

The `src/config/` directory only contains `admin.ts` with minimal settings:

```typescript
// src/config/admin.ts
export const ADMIN_CONFIG = {
  paginationLimit: 20,
  maxBatchSize: 50,
};
```

Other configuration values are scattered throughout:
- Query stale times in individual hooks
- API endpoints in service files
- Feature flags in `src/utils/featureFlags.ts`

**Recommendation:** Consolidate into a hierarchical config structure:
```
src/config/
  ├── index.ts (barrel)
  ├── api.ts (endpoints, timeouts)
  ├── cache.ts (stale times, cache TTLs)
  ├── features.ts (feature flags)
  └── admin.ts (admin-specific)
```

---

### 5. **Large Authentication Hook**

`useAuth.ts` is **379 lines** managing:
- Session state
- Profile fetching
- Email authentication
- Google OAuth (web)
- Google OAuth (native/mobile)
- Error handling

**Recommendation:** Split into smaller, composable hooks:
- `useAuthState()` - session/user/profile state
- `useEmailAuth()` - signIn/signUp/signOut
- `useOAuth()` - social login providers

---

### 6. **Inconsistent Query Key Patterns**

Some queries use string keys, others use array patterns:

```typescript
// String key
queryKey: ['teams-for-selector']  // src/components/admin/hero-cards/TargetSelector.tsx

// Object key
queryKey: [TEAMS_QUERY_KEY, options]  // src/hooks/teams/useTeamsQuery.ts
```

**Recommendation:** Establish a query key factory pattern:
```typescript
export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    list: (filters: TeamsQueryOptions) => [...queryKeys.teams.all, filters] as const,
    detail: (id: string) => [...queryKeys.teams.all, id] as const,
  },
  brackets: { ... },
  matches: { ... },
};
```

---

## Summary of Priority Actions

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 P0 | Move Supabase credentials to environment variables | Low | High |
| 🔴 P0 | Consolidate `fetchBrackets` into shared hook | Low | High |
| 🟠 P1 | Extract components' data access into service layer | Medium | High |
| 🟠 P1 | Split `BracketManagerService` into focused services | High | High |
| 🟡 P2 | Consolidate team transformation logic | Medium | Medium |
| 🟡 P2 | Standardize query key patterns | Low | Medium |
| 🟢 P3 | Split `useAuth` into smaller hooks | Medium | Low |
| 🟢 P3 | Centralize configuration | Low | Low |

---

*This review focuses on structural and design patterns. It does not cover code style, test coverage, or performance optimization, which may warrant separate reviews.*
