

## Standardize Error Handling in SeasonService.ts

### Problem
`SeasonService.ts` has **13 instances** of `throw error` (raw Supabase errors) and 1 `throw new Error(...)` that bypass the project's standardized error handling convention. Per project rules, all service methods should use `handleDatabaseError()` for Supabase errors and typed error classes (`BusinessLogicError`, etc.) for other failures.

### Fix
**File: `src/services/SeasonService.ts`**

1. **Update imports** — add `handleDatabaseError` from `@/utils/errorHandler` and `BusinessLogicError` from `@/types/errors`. Remove `errorLog` import (no longer needed directly since `handleDatabaseError` logs internally).

2. **Replace all raw error throws** — convert every `if (error) { errorLog(...); throw error; }` and bare `if (error) throw error;` to use `handleDatabaseError(error, 'context message')`.

3. **Replace the data integrity `throw new Error(...)`** on line 68 with `throw new BusinessLogicError(errorMsg)`.

Specific replacements (13 database + 1 business logic = 14 total):

| Line(s) | Current | Replacement |
|---|---|---|
| 41-43 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch seasons')` |
| 59-61 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch active season')` |
| 68 | `throw new Error(errorMsg)` | `throw new BusinessLogicError(errorMsg)` |
| 88-89 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch confirmation season')` |
| 104-106 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch team participation')` |
| 119-121 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch season participations')` |
| 161 | `throw error` | `handleDatabaseError(error, 'Failed to submit participation')` |
| 172 | `throw error` | `handleDatabaseError(error, 'Failed to fetch season stat IDs')` |
| 201 | `throw error` | `handleDatabaseError(error, 'Failed to fetch stats by season')` |
| 216-218 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch historical seasons')` |
| 253-255 | `errorLog(...); throw error` | `handleDatabaseError(error, 'Failed to fetch season stats')` |
| 288 | `throw error` | `handleDatabaseError(error, 'Failed to create season')` |
| 300 | `throw error` | `handleDatabaseError(error, 'Failed to update season')` |
| 310 | `throw error` | `handleDatabaseError(error, 'Failed to activate season')` |
| 322 | `throw error` | `handleDatabaseError(error, 'Failed to archive season')` |

No behavioral change — `handleDatabaseError` logs and throws a `DatabaseError`, which TanStack Query catches exactly the same way. The only improvement is consistent error types throughout the app.

