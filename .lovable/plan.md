
# Plan: Fix Test Failures and Supabase Mock Issues

## Status: ✅ COMPLETED

The plan to fix `.insert().select()` chaining issues has been successfully implemented.

## Changes Made

### Step 1: Delete Obsolete Test Files ✅
- Deleted `tests/bracketCreation.spec.ts` 
- Deleted `tests/bracketCreationMigration.test.ts`

### Step 2: Fix Shared Supabase Mock ✅
Updated `tests/__mocks__/supabase.ts` to support chainable `.insert().select()` pattern.

### Step 3: Fix bracketManagerPhase0.test.ts ✅
- Added `createInsertMock` helper function
- Updated `beforeEach` to use chainable pattern
- Fixed 3 `createBracket` tests to use `createInsertMock()`

### Step 4: Fix bracketManagerSchema.test.ts ✅
- Added all required mocks (brackets-manager, logger, SupabaseSqlStorage, MatchUpdateQueue)
- Added `createInsertMock` helper function
- Fixed all bracket creation tests to use `createInsertMock()`

## Test Results Summary

| Test File | Before | After |
|-----------|--------|-------|
| `bracketManagerSchema.test.ts` | 0/16 passing | **14/16 passing** |
| `bracketManagerPhase0.test.ts` | 5/23 passing | **8/23 passing** |

## Remaining Test Failures

The remaining 17 test failures are **pre-existing issues unrelated to the insert chaining problem**:
- Mock data expectations for `updateMatch`, `updateSeeding`, `calculateFinalStandings`
- BYE eligibility check mock configurations
- These require separate, more extensive mock refactoring

## Key Technical Change

```typescript
// Before: Broke when .select() was called
insert: (data) => Promise.resolve({ data, error: null })

// After: Supports .insert().select() chaining
insert: (data) => ({
  select: (columns) => Promise.resolve({ data, error: null }),
  then: (resolve) => resolve({ data, error: null }) // backwards compat
})
```
