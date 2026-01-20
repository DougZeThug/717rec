# 717rec Codebase Audit Guide

> **Comprehensive audit completed January 2026**
>
> This document outlines areas for improvement, organized as potential pull requests. Each section can be implemented independently.

---

## Table of Contents

1. [Critical Priority](#critical-priority)
2. [High Priority](#high-priority)
3. [Medium Priority](#medium-priority)
4. [Low Priority](#low-priority)
5. [Summary Statistics](#summary-statistics)

---

## Critical Priority

### PR 1: Split BracketManagerService (1088 lines)

**File:** `src/services/brackets/manager/BracketManagerService.ts`

**Problem:** Single file handles 6+ concerns: bracket creation, match updates, seeding, normalization, grand final population, BYE handling, and admin operations. This violates single responsibility principle and makes testing difficult.

**Specific Issues:**
- `createBracket()` - 156 lines (lines 85-241)
- `updateMatch()` - 135 lines with internal serialization queue (lines 248-383)
- `updateSeeding()` - 85 lines (lines 613-698)
- `normalizeGrandFinalPopulation()` - 70 lines (lines 436-506)
- `normalizeLosersR1()` - 95 lines (lines 512-607)
- `adminToggleByeReady()` - 129 lines (lines 955-1084)

**Recommended Split:**
```
src/services/brackets/manager/
├── BracketCreationService.ts    # createBracket, validation
├── BracketUpdateService.ts      # updateMatch, score handling
├── BracketNormalizationService.ts # normalize*, BYE handling
├── BracketAdminService.ts       # admin operations
└── BracketManagerService.ts     # Facade that composes the above
```

**Estimated Files Changed:** 5-10

---

### PR 2: Add Test Infrastructure & Scripts

**Problem:** No test commands in package.json, missing test utilities, and inconsistent configuration.

**Files to Change:**

1. **`package.json`** - Add missing scripts:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc --noEmit"
}
```

2. **`src/setupTests.ts`** - Add missing mocks and utilities:
- Centralized Supabase client mock
- React Query mock setup (QueryClientProvider wrapper)
- react-router mock provider helpers
- Custom `renderWithProviders()` function
- Test data factories/builders

3. **`vitest.config.ts` & `vite.config.ts`** - Align include patterns:
```typescript
// Both should use same pattern:
include: [
  '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
  '**/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,tsx}',
]
```

**Estimated Files Changed:** 4

---

### PR 3: Fix Type Safety Issues (Remove `any` Types)

**Problem:** Multiple files use `any` type, bypassing TypeScript's type checking.

**Files to Fix:**

| File | Line | Current | Fix |
|------|------|---------|-----|
| `src/contexts/NavigationContext.tsx` | 12 | `state?: any` | Create `RouteState` interface |
| `src/types/auth.ts` | 22 | `error?: any` | Use `Error \| null` |
| `src/components/admin/seasons/SeasonForm.tsx` | 30 | `season?: any` | Use `Season` interface |
| `src/services/RankingSnapshotService.ts` | 54 | `as any` | Define proper division type |
| `src/hooks/career/useCareerData.ts` | 166 | `as any` | Add division weight type |
| `src/hooks/useBracketCompletion.ts` | 30 | `as any` | Type the payload |
| `src/hooks/playoffs/useOptimisticScoreMutation.ts` | 52 | `as any` | Type bracket data |
| `src/hooks/message-board/useMessageApi.ts` | 73 | `catch (err: any)` | Use `catch (err: unknown)` |
| `src/services/brackets/manager/BracketManagerService.ts` | 19, 309, 155, 195 | Multiple `as any` | Create proper interfaces |

**Estimated Files Changed:** 10-12

---

## High Priority

### PR 4: Standardize Error Handling Patterns

**Problem:** Services have inconsistent error handling - some throw, some return null, some return error objects.

**Files with Inconsistent Patterns:**

| File | Current Behavior |
|------|------------------|
| `src/services/HeadToHeadService.ts:21-22` | THROWS errors |
| `src/services/HeadToHeadService.ts:119` | Returns NULL on error |
| `src/services/matches/MatchReadService.ts:44` | THROWS errors |
| `src/services/matches/MatchWriteService.ts:42-43` | Returns NULL on error |

**Recommended Pattern:**
```typescript
// All services should return Result type:
type ServiceResult<T> = { data: T; error: null } | { data: null; error: ServiceError };

// Or consistently throw and let callers handle:
// (Choose one pattern and apply consistently)
```

**Estimated Files Changed:** 8-10

---

### PR 5: Extract Duplicate Color Utility Functions

**Problem:** Color utility functions are duplicated across components instead of being imported from utils.

**Duplicated Functions:**
- `getDivisionBadgeColor()` duplicated in `src/components/teams/TeamAdvancedStatsSection.tsx` (lines 28-35)
- `getWinPctColor()` duplicated in same file (lines 37-45)
- `getPowerScoreColor()` duplicated in same file (lines 46-50)

**Already Exists In:** `src/utils/colors/` directory

**Fix:**
1. Remove duplicate functions from `TeamAdvancedStatsSection.tsx`
2. Import from existing utils:
```typescript
import { getDivisionBadgeColor, getWinPctColor, getPowerScoreColor } from '@/utils/colors';
```

**Estimated Files Changed:** 3-5

---

### PR 6: Fix Hook Memory Leaks (Realtime Subscriptions)

**Problem:** Supabase realtime subscriptions are recreated on every callback change due to callbacks in dependency arrays.

**Files to Fix:**

1. **`src/hooks/usePlayoffRealtime.ts`** (lines 6-57)
   - All callbacks in dependency array (line 55)
   - Every callback change causes unsubscribe/resubscribe

2. **`src/hooks/useMessageRealtime.ts`** (lines 6-56)
   - Same pattern as above

**Fix:** Use `useCallback` with stable references or refs for event handlers:
```typescript
const handlersRef = useRef({ onInsert, onUpdate, onDelete });
useEffect(() => {
  handlersRef.current = { onInsert, onUpdate, onDelete };
});

useEffect(() => {
  const channel = supabase.channel('...')
    .on('INSERT', (payload) => handlersRef.current.onInsert(payload))
    // ...
  return () => channel.unsubscribe();
}, []); // Empty deps - handlers accessed via ref
```

**Estimated Files Changed:** 2-4

---

### PR 7: Remove Duplicate Code in useScoreSubmissions

**Problem:** `handleApproveSubmission` and `handleRejectSubmission` are nearly identical (lines 52-108).

**File:** `src/hooks/useScoreSubmissions.ts`

**Current:**
- Both functions call `(await supabase.auth.getUser()).data.user?.id` separately
- Both make identical update queries (only status differs)
- Both have identical error handling

**Fix:** Extract common logic:
```typescript
const handleSubmissionAction = async (
  submission: ScoreSubmission,
  status: 'approved' | 'rejected',
  description: string
) => {
  // Common logic here
};

const handleApproveSubmission = (s) => handleSubmissionAction(s, 'approved', 'approved');
const handleRejectSubmission = (s) => handleSubmissionAction(s, 'rejected', 'rejected');
```

**Estimated Files Changed:** 1

---

### PR 8: Split Complex Hooks

**Problem:** Several hooks exceed 300 lines and handle multiple concerns.

**Hooks to Split:**

| Hook | Lines | Recommended Split |
|------|-------|-------------------|
| `src/hooks/useAuth.ts` | 410 | `useAuthSession`, `useAuthProfile`, `useAuthMethods` |
| `src/hooks/useSchedulePreview.ts` | 404 | `useScheduleValidation`, `useDualBlockLogic`, `useTeamBalancing` |
| `src/hooks/usePairingGenerator.ts` | 317 | `useStandardPairing`, `useDualBlockPairing` |
| `src/hooks/useTeamSeasonBreakdown.ts` | 428 | `useSeasonQueries`, `useSeasonStatsTransform` |
| `src/hooks/useMatchUpdates.ts` | 250 | `useMatchUpdate`, `useMatchDelete`, `useStatReversal` |

**Estimated Files Changed:** 10-15

---

## Medium Priority

### PR 9: Add Accessibility Improvements

**Problem:** Components missing ARIA attributes and keyboard navigation.

**Files to Fix:**

| File | Issue | Fix |
|------|-------|-----|
| `src/components/schedule/ScheduleContent.tsx` (158-189) | Tabs missing role="tablist" | Add proper ARIA roles |
| `src/components/teams/TeamsPageContainer.tsx` (68-163) | Dropdowns missing aria-label | Add labels |
| `src/components/playoffs/match-card/PlayoffMatchCard.tsx` (66-71) | Clickable card missing role="button" | Add role and keyboard handlers |
| `src/components/schedule/MatchCard.tsx` (262-300) | Buttons missing aria-disabled | Add conditional ARIA states |
| `src/components/playoffs/BracketDetail.tsx` (125-153) | Admin buttons hidden on mobile | Add mobile alternatives |

**Estimated Files Changed:** 5-7

---

### PR 10: Remove Dead Code and Pass-Through Components

**Problem:** Several wrapper components add no value and deprecated code remains.

**Files to Remove/Simplify:**

1. **`src/components/playoffs/match-score-editor/MatchScoreEditorWrapper.tsx`**
   - Just forwards props (34 lines of boilerplate)
   - Merge into actual MatchScoreEditor

2. **`src/components/admin/batch-matches/BatchMatchForm.tsx`**
   - Only renders BatchMatchFormContainer (10 lines)
   - Remove and update imports

3. **`src/utils/powerScore/calculatePowerScore.ts`**
   - Marked deprecated but still exported
   - Either remove completely or document why kept as fallback

4. **`src/services/brackets/manager/BracketManagerService.ts` (700-720)**
   - Large commented-out `canUpdateMatch` code block
   - Remove or restore with explanation

**Estimated Files Changed:** 4-6

---

### PR 11: Consolidate Duplicate Button Styling Patterns

**Problem:** Toggle button styling is repeated across components.

**Files with Duplicate Patterns:**
- `src/components/stats/PowerScoreTrendsCard.tsx` (lines 85-111)
- `src/components/teams/TeamsPageContainer.tsx` (lines 116-163)

**Fix:** Create shared `ToggleButtonGroup` component:
```typescript
// src/components/ui/ToggleButtonGroup.tsx
interface ToggleButtonGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}
```

**Estimated Files Changed:** 3-4

---

### PR 12: Add Magic Number Constants for Match Status

**Problem:** Hardcoded magic numbers throughout BracketManagerService.

**File:** `src/services/brackets/manager/BracketManagerService.ts`

**Current:**
- Line 281: `status: 2` (Ready)
- Line 570: `status: 4` (Completed)
- Lines 401-404: Group number `2` for loser bracket
- Line 443: Group number `3` for grand finals

**Fix:** Create constants file:
```typescript
// src/constants/bracketConstants.ts
export const MATCH_STATUS = {
  LOCKED: 0,
  WAITING: 1,
  READY: 2,
  RUNNING: 3,
  COMPLETED: 4,
  ARCHIVED: 5,
} as const;

export const BRACKET_GROUP = {
  WINNER: 1,
  LOSER: 2,
  GRAND_FINAL: 3,
} as const;
```

**Estimated Files Changed:** 2-3

---

### PR 13: Extract localStorage Logic into Custom Hook

**Problem:** TeamsPageContainer has triple useEffect for localStorage persistence.

**File:** `src/components/teams/TeamsPageContainer.tsx` (lines 29-57)

**Fix:** Create `useTeamsPreferences` hook:
```typescript
// src/hooks/useTeamsPreferences.ts
export const useTeamsPreferences = () => {
  const [displayMode, setDisplayMode] = usePersistedState('teamDisplayMode', 'division');
  const [viewMode, setViewMode] = usePersistedState('teamViewMode', 'grid');
  const [sortMode, setSortMode] = usePersistedState('teamSortMode', 'power_score');
  return { displayMode, setDisplayMode, viewMode, setViewMode, sortMode, setSortMode };
};
```

**Estimated Files Changed:** 2

---

### PR 14: Fix ESLint Rules for Test Files

**Problem:** Test file rules are too lenient.

**File:** `eslint.config.js` (lines 57-63)

**Current:**
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',  // Too lenient
  '@typescript-eslint/no-unused-vars': 'off',    // Hides issues
}
```

**Recommended:**
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': 'warn',
  'vitest/no-focused-tests': 'error',  // Prevent .only()
  'vitest/no-disabled-tests': 'warn',  // Warn on .skip()
}
```

**Estimated Files Changed:** 1

---

### PR 15: Rename Kebab-Case Hook Files

**Problem:** Inconsistent file naming - some hooks use kebab-case instead of camelCase.

**Files to Rename:**
- `src/hooks/use-theme-consistency.ts` → `useThemeConsistency.ts`
- `src/hooks/use-mobile.ts` → `useMobile.ts`
- `src/hooks/use-bracket-responsive.ts` → `useBracketResponsive.ts`
- `src/hooks/use-toast.ts` → `useToast.ts`
- `src/hooks/use-bracket-dimensions.ts` → `useBracketDimensions.ts`

**Note:** Update all imports across codebase.

**Estimated Files Changed:** 10-20 (due to import updates)

---

### PR 16: Add Performance Timing Utility

**Problem:** Performance timing pattern repeated in multiple service files.

**Files with Duplicate Pattern:**
- `src/services/HeadToHeadService.ts` (lines 10, 53, 77, 102, 112-115)

**Current:**
```typescript
const startTime = performance.now();
// ... operation ...
const endTime = performance.now();
matchLog(`... ${(endTime - startTime).toFixed(2)}ms`);
```

**Fix:** Create utility:
```typescript
// src/utils/performance.ts
export const withTiming = async <T>(
  operation: () => Promise<T>,
  logger: (msg: string) => void,
  label: string
): Promise<T> => {
  const start = performance.now();
  const result = await operation();
  logger(`${label} completed in ${(performance.now() - start).toFixed(2)}ms`);
  return result;
};
```

**Estimated Files Changed:** 3-5

---

### PR 17: Fix Data Structure Duplication in Constants

**Problem:** TIME_SLOTS and BACK_TO_BACK_PAIRS contain duplicate information.

**File:** `src/utils/autoSchedule/constants.ts` (lines 6-107)

**Fix:** Derive TIME_SLOTS from BACK_TO_BACK_PAIRS:
```typescript
export const TIME_SLOTS = Object.values(BACK_TO_BACK_PAIRS)
  .flatMap(pair => [pair.primary, pair.secondary])
  .reduce((acc, slot) => ({ ...acc, [slot]: slot }), {});
```

Also refactor switch statements (lines 110-162) to use Map lookups.

**Estimated Files Changed:** 1

---

### PR 18: Update Package Metadata

**Problem:** Package name and version don't match project.

**File:** `package.json`

**Current:**
```json
{
  "name": "vite_react_shadcn_ts",
  "version": "0.0.0"
}
```

**Fix:**
```json
{
  "name": "717rec",
  "version": "1.0.0"
}
```

**Estimated Files Changed:** 1

---

## Low Priority

### PR 19: Add Missing Memoization

**Problem:** Components re-render excessively due to missing memoization.

**Files to Fix:**

| File | Issue |
|------|-------|
| `src/components/admin/mass-score-entry/MassScoreEntryTool.tsx` (34-58) | filterTags array recreated every render |
| `src/components/teams/TeamsContainer.tsx` (51-56) | sortTeams function not memoized |
| `src/components/stats/RankingCard.tsx` (120-131, 201-240) | Color calculations not memoized |

**Estimated Files Changed:** 3-5

---

### PR 20: Enable TypeScript Strict Mode (Gradual)

**Problem:** TypeScript strict mode is disabled, reducing type safety.

**Files:** `tsconfig.json`, `tsconfig.app.json`

**Current:**
```json
"strict": false,
"noImplicitAny": false,
"noUnusedLocals": false,
"noUnusedParameters": false
```

**Phased Approach:**
1. Phase 1: Enable `noUnusedLocals` and `noUnusedParameters` (find dead code)
2. Phase 2: Enable `noImplicitAny` (add missing types)
3. Phase 3: Enable `strict` (full strict mode)

**Note:** This will surface many issues to fix. Do incrementally.

**Estimated Files Changed:** 2 config files + many source files

---

### PR 21: Fix Tailwind Font TODO

**Problem:** Unresolved TODO for Snowtop font loading.

**File:** `tailwind.config.ts` (line 35)

```typescript
snowtop: ['Snowtop Caps', 'Bebas Neue', 'Arial', 'sans-serif'],
// TODO: Load Snowtop Caps font file if keeping this feature
```

**Fix Options:**
1. Load the font file properly in CSS/HTML
2. Remove the font if not being used
3. Replace with a web-safe alternative

**Estimated Files Changed:** 1-2

---

### PR 22: Add Comprehensive Test Coverage

**Problem:** Only 8% test coverage for components and hooks.

**Coverage Gaps:**
- 0/17 page components tested
- ~42/525 component files tested (8%)
- ~11/139 hook files tested (8%)

**Priority Test Files to Add:**

1. **Critical Paths:**
   - `src/pages/Auth.tsx` - Authentication flow
   - `src/pages/AdminDashboard.tsx` - Admin operations
   - `src/components/auth/AuthForm.tsx` - Login/signup
   - `src/hooks/useAuth.ts` - Auth state management

2. **Complex Logic:**
   - `src/utils/autoSchedule/` - Scheduling algorithms
   - `src/utils/rankingUtils/` - Ranking calculations
   - `src/services/brackets/` - Bracket operations

3. **User-Facing Features:**
   - `src/pages/Teams.tsx` - Team browsing
   - `src/pages/Schedule.tsx` - Match schedule
   - `src/pages/Stats.tsx` - Statistics display

**Note:** This is a large effort. Create separate PRs per feature area.

**Estimated Files Changed:** 20+ new test files

---

### PR 23: Fix Minor Code Quality Issues

**Miscellaneous small fixes:**

1. **Fix typo in variable name:**
   - `src/components/playoffs/BracketDetail.tsx` (line 60): `divisonLower` → `divisionLower`

2. **Use nullish coalescing consistently:**
   - `src/services/matches/MatchReadService.ts` (line 47): `data || []` → `data ?? []`

3. **Remove redundant validation:**
   - `src/services/brackets/validation/BracketValidationService.ts` (lines 68-72): Second check is redundant

4. **Fix incomplete test file:**
   - `src/components/playoffs/__tests__/MatchCard.tbd.test.tsx` - Complete or remove

**Estimated Files Changed:** 4-5

---

### PR 24: Improve Complex Function Documentation

**Problem:** Complex algorithms lack documentation.

**Files Needing JSDoc:**

1. **`src/utils/autoSchedule/qualityAnalysis.ts`**
   - `analyzeCrossBlockDiversity()` (lines 99-159) - What is cross-block diversity?
   - `calculateComprehensiveQualityMetrics()` (lines 230-303) - What metrics?

2. **`src/services/brackets/manager/BracketManagerService.ts`**
   - `normalizeLosersR1()` - What does normalization do?
   - `normalizeGrandFinalPopulation()` - Why is this needed?

3. **`src/utils/powerScore/` directory**
   - Document the Elo-based calculation algorithm

**Estimated Files Changed:** 5-10

---

### PR 25: Fix Potential Open Redirect

**Problem:** `returnTo` parameter not validated in auth redirect.

**File:** `src/contexts/AuthContext.tsx` (line 67)

**Current:**
```typescript
navigate('/auth', { state: { returnTo: window.location.pathname } });
```

**Risk:** If `location.pathname` is manipulated, could redirect to malicious URL.

**Fix:**
```typescript
const safeReturnTo = (pathname: string) => {
  // Only allow internal paths
  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    return pathname;
  }
  return '/';
};
navigate('/auth', { state: { returnTo: safeReturnTo(window.location.pathname) } });
```

**Estimated Files Changed:** 1

---

## Summary Statistics

| Priority | PRs | Estimated File Changes |
|----------|-----|------------------------|
| Critical | 3 | 19-26 files |
| High | 5 | 23-36 files |
| Medium | 10 | 30-50 files |
| Low | 7 | 35-55+ files |
| **Total** | **25** | **107-167+ files** |

### Issue Breakdown by Category

| Category | Issues Found |
|----------|--------------|
| Large Files/Functions | 6 |
| Type Safety (`any`) | 9 |
| Duplicate Code | 5 |
| Missing Tests | Critical gap (8% coverage) |
| Memory Leaks | 2 |
| Accessibility | 5 |
| Dead/Deprecated Code | 4 |
| Naming Inconsistencies | 5 |
| Missing Documentation | 4 |
| Configuration Issues | 4 |
| Security | 1 (low risk) |

---

## Recommended Implementation Order

1. **Sprint 1 (Foundation):**
   - PR 2: Add Test Infrastructure & Scripts
   - PR 3: Fix Type Safety Issues
   - PR 14: Fix ESLint Rules

2. **Sprint 2 (Critical Refactoring):**
   - PR 1: Split BracketManagerService
   - PR 4: Standardize Error Handling
   - PR 6: Fix Hook Memory Leaks

3. **Sprint 3 (Code Quality):**
   - PR 5: Extract Duplicate Color Functions
   - PR 7: Remove Duplicate Code in useScoreSubmissions
   - PR 10: Remove Dead Code
   - PR 12: Add Magic Number Constants

4. **Sprint 4 (Polish):**
   - PR 9: Add Accessibility Improvements
   - PR 15: Rename Kebab-Case Files
   - PR 18: Update Package Metadata

5. **Ongoing:**
   - PR 22: Add Comprehensive Test Coverage (continuous effort)
   - PR 20: Enable TypeScript Strict Mode (phased)

---

*Generated by comprehensive codebase audit - January 2026*
