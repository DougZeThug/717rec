

## Standardize Error Handling & Add Return Types in Service Layer

### What's Wrong

Two quality issues across service files:

1. **Inconsistent error handling**: Some functions use `handleDatabaseError(error, context)` (which wraps errors in a typed `DatabaseError`), while others do bare `throw error` (which throws raw Supabase `PostgrestError` objects). This makes error categorization unpredictable for callers.

2. **Missing return types**: Exported functions in `MatchQueryService.ts` rely on type inference instead of explicit return types, reducing IDE intellisense quality.

### Changes

**File 1: `src/services/matches/MatchQueryService.ts`**
- Replace all `throw error` with `handleDatabaseError(error, '...')` (6 locations: `fetchPendingMatches`, `fetchUncompletedMatches`, `fetchPendingScoresMatches`, `fetchScoreSubmissions`, `fetchMatchForTie`, `fetchMatchTeamIds`)
- Replace `throw new Error(...)` in `fetchMatchTimeslots` with `handleDatabaseError`
- Replace manual not-found check in `fetchMatchForTie` / `fetchMatchTeamIds` with `ensureFound()`
- Add explicit return type annotations to all 8 exported functions

**File 2: `src/services/matches/MatchWriteService.ts`**
- Replace all `throw error` with `handleDatabaseError(error, '...')` (~12 locations)
- Already imports `handleDatabaseError` — just needs consistent usage

**File 3: `src/services/matches/MatchHistoryService.ts`**
- Replace 4 `throw error` calls with `handleDatabaseError`

**File 4: `src/services/matches/MatchTeamLookupService.ts`**
- Replace 3 `throw error` calls with `handleDatabaseError`

**File 5: `src/services/matches/MatchScheduleAdminService.ts`**
- Replace 1 `throw error` call with `handleDatabaseError`

**File 6: `src/services/timeslots/TimeslotQueryService.ts`**
- Replace 4 `throw error` calls with `handleDatabaseError` (in `fetchTimeslotsByDate`, `fetchTimeslotsForDate`, `fetchWeekTimeslotsByTeam`, `fetchTimeslotsForPair`)

**File 7: `src/services/timeslots/TimeslotBatchService.ts`**
- Replace 3 `throw error` calls with `handleDatabaseError`

**File 8: `src/services/teams/TeamQueryService.ts`**
- Replace 2 `throw error` calls with `handleDatabaseError`, 1 manual not-found with `ensureFound()`

**File 9: `src/services/teams/TeamUpdateService.ts`**
- Replace 1 `throw error` with `handleDatabaseError`

No behavioral changes. All functions already throw on error — this just wraps them in typed `DatabaseError` for consistent logging and caller handling.

### Files Changed

| File | Change |
|------|--------|
| `MatchQueryService.ts` | Standardize errors + add return types |
| `MatchWriteService.ts` | Standardize 12 error throws |
| `MatchHistoryService.ts` | Standardize 4 error throws |
| `MatchTeamLookupService.ts` | Standardize 3 error throws |
| `MatchScheduleAdminService.ts` | Standardize 1 error throw |
| `TimeslotQueryService.ts` | Standardize 4 error throws |
| `TimeslotBatchService.ts` | Standardize 3 error throws |
| `TeamQueryService.ts` | Standardize 3 error throws |
| `TeamUpdateService.ts` | Standardize 1 error throw |

Auth service (`AuthService.ts`) excluded — auth errors are `AuthError`, not `PostgrestError`, so `handleDatabaseError` doesn't apply there.

