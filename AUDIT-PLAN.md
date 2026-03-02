# 717rec Codebase Audit & Improvement Plan

> **Purpose**: Identifies code quality issues, inconsistencies, and improvement opportunities following best practices. Each item is a self-contained change that can be done one at a time.

---

## Audit Summary

| Area | Current State | Key Issues |
|------|--------------|------------|
| **Error Handling** | Mixed | Two competing error systems; some services return errors instead of throwing |
| **Component Sizes** | Good overall | 3 components over 500 lines; hero card family has heavy duplication |
| **Test Coverage** | Fair | 47 test files / 994 source files (~5% coverage ratio) |
| **Type Safety** | Good | 130 `any` type usages across 40 files; 0 TypeScript compiler errors |
| **Data Layer** | Good | 30 files use `select('*')` out of 321 Supabase queries; 32 components have direct DB calls |
| **Performance** | Good | Lazy loading, memoization in place; some missing optimizations |
| **Linting** | Broken | ESLint fails to run - missing `@eslint/js` package |
| **Dependencies** | Broken | `npm install` needed - many packages missing from node_modules |

---

## Priority 1: Broken Tooling (Fix First)

### 1.1 Fix missing npm dependencies
- **What**: Running `npm ls` shows many missing packages (`@eslint/js`, `@capacitor/core`, `@dnd-kit/*`, `@radix-ui/*`, etc.)
- **Why**: Nothing can be linted, tested, or built until dependencies are installed
- **Change**: Run `npm install` to restore node_modules

### 1.2 Fix ESLint configuration
- **What**: `npm run lint` fails with `Cannot find package '@eslint/js'`
- **Why**: Linting is the first line of defense for code quality - it's currently non-functional
- **Change**: After npm install, verify `npm run lint` runs. If ESLint 10 is incompatible with `@eslint/js`, pin ESLint to a compatible version

---

## Priority 2: Error Handling Consolidation (High Impact)

### 2.1 Consolidate duplicate error modules
- **What**: There are **4 separate error-handling files** that overlap:
  1. `src/types/errors.ts` - ServiceError class hierarchy (the "correct" one per CLAUDE.md)
  2. `src/utils/errorHandler.ts` - Utility functions for services (correct)
  3. `src/utils/errors.ts` - Old error classes (ChallongeError, SupabaseError, etc.) that do NOT extend ServiceError
  4. `src/utils/errorHandling.ts` - Re-exports from `errors.ts`
- **Why**: Developers don't know which error types to use. The old classes in `utils/errors.ts` bypass the standardized hierarchy
- **Change**:
  - Keep `types/errors.ts` and `utils/errorHandler.ts` as the canonical error system
  - Migrate useful utilities from `utils/errors.ts` (like `getErrorMessage`, `categorizeError`) into `utils/errorHandler.ts`
  - Update the 3 files importing from `utils/errors.ts` to use `types/errors.ts` instead
  - Update the 1 file importing from `utils/errorHandling.ts`
  - Delete `utils/errors.ts` and `utils/errorHandling.ts`

### 2.2 Fix services that return errors instead of throwing
- **What**: Two services violate the documented throw-errors pattern:
  - `src/services/profile/ProfileService.ts` - Returns `{ error?: string }`
  - `src/services/support/ContactService.ts` - Returns `{ error?: string }`
- **Why**: CLAUDE.md explicitly states all services should throw errors so React Query can catch them automatically
- **Change**: Refactor both to use `handleDatabaseError()` and throw patterns, then update their callers

### 2.3 Fix hooks with inconsistent error handling
- **What**: `src/hooks/auth/useAuthProfile.ts` returns `null` on error instead of throwing
- **Why**: Swallows errors silently; callers can't distinguish "no profile" from "database failure"
- **Change**: Throw `DatabaseError` on Supabase errors, only return null for genuinely missing profiles

---

## Priority 3: Component Size & Duplication (Medium Impact)

### 3.1 Split EventHeroCard.tsx (508 lines)
- **What**: This component contains countdown timers, event details, winners display, and signup form all in one file
- **Why**: Hard to maintain and test; each concern should be its own component
- **Change**: Extract into ~4 focused components:
  - `EventHeroCard.tsx` (container, ~100 lines)
  - `EventCountdown.tsx` (~80 lines)
  - `EventDetails.tsx` (~100 lines)
  - `PastWinnersDisplay.tsx` (~80 lines)

### 3.2 Reduce hero card duplication
- **What**: Four hero card components share similar patterns:
  - `EventHeroCard.tsx` (508 lines)
  - `RequestHeroCard.tsx` (370 lines)
  - `ChampionsHeroCard.tsx` (356 lines)
  - `ParticipationHeroCard.tsx` (264 lines)
- **Why**: Similar card layouts, similar animation patterns, similar styling - lots of copy-paste
- **Change**: Create a shared `HeroCardBase` component that handles the common card shell/layout, then each card type only needs to provide its unique content

### 3.3 Extract Schedule page tab logic
- **What**: `src/pages/Schedule.tsx` (239 lines) mixes date normalization, tab management, and filtering logic inline
- **Why**: Makes the page hard to follow; tab logic is reusable
- **Change**: Extract tab state management into a `useScheduleTabs()` custom hook

### 3.4 Split BracketsManagerMatchEditor (475 lines) and BracketsViewerComponent (480 lines)
- **What**: These two playoff components each have too many responsibilities
- **Why**: Complex forms and viewers should be broken into sub-components for maintainability
- **Change**: Extract sub-components for distinct sections (score inputs, team display, action buttons, etc.)

---

## Priority 4: Data Layer Improvements (Medium Impact)

### 4.1 Replace `select('*')` with explicit column lists
- **What**: 30 files use `select('*')` across Supabase queries
- **Why**: Fetches unnecessary data over the network; makes it unclear what data the component actually needs; can break if columns are added/removed
- **Key files to fix** (highest impact):
  - `src/hooks/usePendingMatches.ts` - Fetches all match + team columns
  - `src/hooks/brackets/useBracketData.ts` - Fetches all bracket table columns
  - `src/hooks/auth/useAuthProfile.ts` - Fetches all profile columns
  - `src/services/brackets/viewer/BracketsViewerAdapter.ts` - Multiple `select('*')` calls
- **Change**: Replace with explicit column lists matching what the component actually uses

### 4.2 Move direct Supabase calls out of components
- **What**: 32 component files contain direct `.from()` Supabase queries instead of going through hooks/services
- **Why**: Violates separation of concerns; makes components harder to test; duplicates query logic
- **Key files**:
  - `src/components/admin/teams/TeamMembershipApprovalTab.tsx` - Inline queries in useEffect
  - `src/components/admin/auto-schedule/EditableMatchList.tsx`
  - `src/components/admin/hero-cards/form-sections/ChampionsEditor.tsx`
  - `src/components/hero/ChampionsHeroCard.tsx`
  - `src/components/teams/TeamEditSection.tsx`
- **Change**: Extract queries to dedicated hooks or service functions, then call those from components

---

## Priority 5: Type Safety Improvements (Lower Impact)

### 5.1 Reduce `any` type usage
- **What**: 130 occurrences of `any` across 40 files
- **Why**: Defeats TypeScript's purpose; hides bugs that would otherwise be caught at compile time
- **Key areas**:
  - `src/services/brackets/viewer/BracketsViewerAdapter.ts` - 27 `any` usages (worst offender)
  - `src/hooks/playoffs/usePlayoffEditMatch.ts` - 3 usages
  - `src/components/stats/career/AllTeamsCareerPowerScoreChart.tsx` - 5 usages
  - `src/utils/matchTransformers.ts` - 11 usages
- **Change**: Replace `any` with proper types or `unknown` where the type genuinely isn't known. For third-party library types (like brackets-viewer), create proper type declarations

### 5.2 Clean up type inconsistencies
- **What**: The `Team` type has both `division_id` and `division`, both `logoUrl` and `imageUrl` for what appears to be the same thing. Also naming conflicts: `BracketMatch` vs `PlayoffMatchSimple`
- **Why**: Confusing for developers; leads to bugs where the wrong property is used
- **Change**: Audit type definitions in `src/types/`, deprecate duplicate properties, add JSDoc comments explaining which to use

---

## Priority 6: Test Coverage (Lower Impact, High Value Long-term)

### 6.1 Add tests for critical service functions
- **What**: Service layer has minimal tests despite being the core business logic
- **Why**: Services contain error handling, data transformation, and business rules that should be verified
- **Priority services to test**:
  - `TeamFetchService` / `TeamCreateService` / `TeamUpdateService`
  - `MatchReadService` / `MatchWriteService`
  - `ProfileService`
  - `HeadToHeadService`

### 6.2 Add tests for error handling paths
- **What**: Error handling utilities (`errorHandler.ts`) and error types (`errors.ts`) have no tests
- **Why**: These are foundational - if error handling breaks, the whole app's error UX breaks
- **Change**: Write unit tests for `handleDatabaseError`, `ensureFound`, `withErrorHandling`

### 6.3 Add page-level integration tests
- **What**: No page components have tests. Critical user flows (auth, team details, schedule) are untested
- **Why**: Catches routing issues, missing props, broken integrations
- **Priority pages**: Auth, TeamDetails, Schedule, AdminDashboard

---

## Priority 7: Performance & Polish (Nice to Have)

### 7.1 Add missing memoization
- **What**: Some components create new functions/arrays on every render
- **Why**: Causes unnecessary re-renders in child components
- **Key spots**:
  - `src/pages/Index.tsx` - `getDelay()` function used in `.map()` should use `useCallback`
  - `src/pages/TeamDetails.tsx` - breadcrumbs array recreated each render
  - `src/components/timeslots/TimeslotAssignment.tsx` - handler arrays

### 7.2 Fix NavigationContext unnecessary dependencies
- **What**: `navigateWithTransition` callback includes `isAdminAccessGranted` and `user` in its dependency array but doesn't use them
- **Why**: Causes unnecessary re-renders when auth state changes
- **Change**: Remove unused dependencies from the callback's dependency array

### 7.3 Replace innerHTML usage
- **What**: `src/components/playoffs/viewer/BracketsViewerComponent.tsx` uses `containerRef.current.innerHTML = ''`
- **Why**: Anti-pattern in React; bypasses React's DOM management
- **Change**: Use conditional rendering or a key prop to force remount instead

### 7.4 Use structured logging consistently
- **What**: `BracketErrorBoundary.tsx` and `BracketCreationErrorBoundary.tsx` use `console.error()` directly instead of the project's logger
- **Why**: Inconsistent with the rest of the codebase which uses `errorLog()` from `utils/logger.ts`
- **Change**: Replace `console.error()` calls with `errorLog()` from the logger utility

---

## Priority 8: Accessibility (Nice to Have)

### 8.1 Add keyboard support to interactive divs
- **What**: Some `<div>` elements with `onClick` handlers lack `role="button"`, `tabIndex`, and `onKeyDown` handlers
- **Why**: Users who navigate with keyboards or screen readers can't interact with these elements
- **Change**: Audit interactive `<div>` elements and either convert to `<button>` or add proper ARIA attributes

### 8.2 Add aria-live regions for loading states
- **What**: Loading states change content without notifying screen readers
- **Why**: Screen reader users don't know when content has loaded
- **Change**: Add `aria-live="polite"` to loading state containers

---

## What NOT to Change

These items were reviewed and are **fine as-is**:

- **App.tsx routing structure** - Well organized with lazy loading, error boundaries, admin protection
- **main.tsx** - Clean, deferred Sentry initialization is smart
- **Console.log usage** - Only 27 occurrences across 9 files, mostly in logger/analytics utilities (appropriate)
- **No eslint-disable or ts-ignore comments** - Zero instances, which is excellent discipline
- **No TODO/FIXME comments** - Clean codebase
- **TypeScript compiler** - 0 type errors, clean build
- **QueryClient configuration** - 5-minute stale time with 1 retry is reasonable
- **Supabase real-time subscriptions** - Properly filtered, with cleanup
- **N+1 query prevention** - Good use of `.in()` and `Promise.all()` for batch queries

---

## Suggested Execution Order

If implementing these changes, do them in this order to minimize risk:

1. **Fix dependencies** (1.1) - Unblocks everything else
2. **Fix ESLint** (1.2) - Gives you a safety net for all future changes
3. **Error consolidation** (2.1, 2.2, 2.3) - Foundational; makes all other changes safer
4. **Component splits** (3.1, 3.2) - Reduces complexity for future work
5. **Data layer cleanup** (4.1, 4.2) - Improves performance and maintainability
6. **Type safety** (5.1, 5.2) - Catches bugs earlier
7. **Tests** (6.1, 6.2, 6.3) - Prevents regressions from all the above changes
8. **Performance/polish/a11y** (7.x, 8.x) - Final polish

---

*Generated: 2026-03-02 | Files audited: 1,132 source files across src/*
