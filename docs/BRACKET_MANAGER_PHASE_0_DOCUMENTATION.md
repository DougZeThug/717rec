# BracketManagerService - Phase 0 Documentation

**Created:** 2026-01-21
**Purpose:** Safety net documentation before refactoring
**Source:** `src/services/brackets/manager/BracketManagerService.ts` (1,184 lines)

---

## Public API Reference

This document captures the **exact current behavior** of all public methods to ensure zero breaking changes during refactoring.

### 1. createBracket()

**Signature:**
```typescript
async createBracket(options: CreateBracketOptions): Promise<void>
```

**Interface:**
```typescript
interface CreateBracketOptions {
  bracketId: string;
  format: 'single_elimination' | 'double_elimination';
  teams: Array<{ id: string; name: string; seed: number }>;
  grandFinalType?: 'simple' | 'double';
}
```

**Behavior:**
- Calculates required bracket size (next power of 2)
- Sorts teams by seed (ascending)
- Creates seeding array with BYE slots
- Inserts participants into database
- Creates bracket stage using brackets-manager
- Automatically handles BYE propagation

**Success Case:**
- Returns: `Promise<void>` (resolves on success)
- Side effects: Creates stage, groups, rounds, matches, and participants in database
- Logs: Multiple bracket logs showing progress

**Error Cases:**
- Throws: `Error("Failed to insert participants: ...")` if participant insertion fails
- Throws: `Error("Bracket creation failed: ...")` for any other error
- Logs: Comprehensive error details including timestamp, bracket ID, error type

**Database Tables Modified:**
- `participant` (inserts)
- `stage` (via brackets-manager)
- `group` (via brackets-manager)
- `round` (via brackets-manager)
- `match` (via brackets-manager)

---

### 2. updateMatch()

**Signature:**
```typescript
async updateMatch(options: UpdateMatchOptions): Promise<void>
```

**Interface:**
```typescript
interface UpdateMatchOptions {
  matchId: number;
  scores: {
    opponent1: { score?: number; result?: 'win' | 'loss' | 'draw' };
    opponent2: { score?: number; result?: 'win' | 'loss' | 'draw' };
  };
}
```

**Behavior:**
- Serialized via `matchUpdateQueue` to prevent race conditions
- Fetches current match state before update
- Special handling for BYE matches:
  - If match is BYE (one opponent null) and status is 0 or 1, unlocks to status 2 and returns early
  - Does NOT call brackets-manager for BYE unlock
- For normal matches:
  - Loads participants into cache
  - Calls `manager.update.match()`
  - Runs `normalizeLosersR1()` 3 times with 100ms delays
  - Runs `normalizeGrandFinalPopulation()`
  - Logs all LB matches after update

**Success Case:**
- Returns: `Promise<void>` (resolves on success)
- Side effects: Updates match, propagates winner to next matches, runs normalization
- Logs: Current match state, update payload, updated match state, all LB matches

**Error Cases:**
- Throws: `Error("Match update failed: ...")` with error message
- Logs: Failure log and full error details

**Database Tables Modified:**
- `match` (updates via brackets-manager or direct SQL for BYE unlock)

---

### 3. updateSeeding()

**Signature:**
```typescript
async updateSeeding(options: UpdateSeedingOptions): Promise<void>
```

**Interface:**
```typescript
interface UpdateSeedingOptions {
  bracketId: string;
  newSeeding: Array<{ id: string; name: string; seed: number }>;
  keepSameSize?: boolean;
}
```

**Behavior:**
- Gets stage ID for bracket
- Sorts teams by seed
- Calculates bracket size and BYEs needed
- Creates seeding array in seed order
- Loads participants into cache
- Calls `manager.update.seeding()`
- Updates participant positions in database

**Success Case:**
- Returns: `Promise<void>` (resolves on success)
- Side effects: Updates stage seeding and participant positions
- Logs: New seeding array prepared, success log

**Error Cases:**
- Throws: `Error("No stage found for bracket: ...")` if stage not found
- Throws: `Error("Cannot update seeding: Changes would affect existing match results...")` if existing results would be impacted
- Throws: `Error("Seeding update failed: ...")` for other errors
- Logs: Failure log with error message

**Database Tables Modified:**
- `stage` (via brackets-manager)
- `participant` (direct updates to position column)

---

### 4. calculateFinalStandings()

**Signature:**
```typescript
async calculateFinalStandings(bracketId: string): Promise<void>
```

**Behavior:**
- Gets all stages for bracket
- Calls `manager.get.finalStandings(stageId)`
- Maps participant IDs to team IDs
- Upserts final standings to `playoff_team_records` table

**Success Case:**
- Returns: `Promise<void>` (resolves on success)
- Side effects: Upserts standings to playoff_team_records
- Logs: Final standings calculated, success log

**Error Cases:**
- Returns early with warning if no stages found
- Returns early with error log if no participants found
- Throws: Database error if upsert fails
- Throws: `Error("Final standings calculation failed: ...")` for other errors

**Database Tables Modified:**
- `playoff_team_records` (upsert with conflict resolution on team_id, bracket_id)

---

### 5. checkByeEligibility()

**Signature:**
```typescript
async checkByeEligibility(matchId: number): Promise<{
  ok: boolean;
  reason?: string;
  meta?: {
    isLosers: boolean;
    exactlyOneReal: boolean;
    isByeSide: boolean;
    status: number;
    currentStatusName: string;
    opponent1Name: string | null;
    opponent2Name: string | null;
  };
}>
```

**Behavior:**
- Public wrapper for private `isLosersByeMatch()` method
- Checks if match is in Losers Bracket (group number === 2)
- Checks if exactly one real team exists (other slot is null or BYE)
- Allows Locked (0), Waiting (1), or Completed (4) status matches

**Success Case:**
- Returns: Object with `ok: true` and `meta` object containing match details

**Error Cases:**
- Returns: Object with `ok: false` and `reason` string explaining why not eligible
- Returns: Object with `ok: false` and `reason: "Error: ..."` if exception occurs

**Database Tables Read:**
- `match`, `round`, `group`, `participant`

---

### 6. adminToggleByeReady()

**Signature:**
```typescript
async adminToggleByeReady(
  matchId: number,
  makeReady: boolean,
  clearDownstream: boolean = false
): Promise<{
  matchId: number;
  status: number;
  statusName: string;
  message: string;
}>
```

**Behavior:**
- Checks eligibility via `isLosersByeMatch()`
- **For reopening completed matches** (status 4, makeReady = false):
  - If `clearDownstream = false`, checks if downstream matches populated and throws error if they are
  - If `clearDownstream = true`, nullifies all downstream matches
  - Clears current match results and sets status to 2 (Ready)
- **For normal toggle to Ready** (makeReady = true):
  - Validates eligibility
  - Sets status to 2 (Ready)
- **For normal revert to Waiting** (makeReady = false):
  - Validates status is not >= 4
  - Sets status to 1 (Waiting)

**Success Case:**
- Returns: Object with matchId, status, statusName, and success message

**Error Cases:**
- Throws: `Error("Cannot set to Ready: ...")` if eligibility check fails
- Throws: `Error("Cannot reopen completed match: downstream matches have been populated...")` if trying to reopen with downstream populated
- Throws: `Error("Cannot revert: Match data unavailable")` if meta unavailable
- Throws: `Error("Cannot revert: Match is ...")` if status >= 4
- Throws: `Error("Failed to toggle BYE match status: ...")` for other errors

**Database Tables Modified:**
- `match` (direct SQL updates to status and result fields)

---

### 7. getStorage()

**Signature:**
```typescript
getStorage(): SupabaseSqlStorage
```

**Behavior:**
- Returns the storage instance for direct access

**Returns:**
- `SupabaseSqlStorage` instance

---

### 8. normalizeLosersR1() ⚠️ PUBLIC (used externally)

**Signature:**
```typescript
async normalizeLosersR1(stageId: number): Promise<void>
```

**Behavior:**
- Clears participant cache
- Finds LB group (group number 2)
- Finds LB Round 1 (minimum round number in LB group)
- Checks all LB R1 matches for duplicates
- **Critical Fix:** Detects if same participant is in both opponent slots
  - Uses direct SQL to bypass defensive merge
  - Clears opponent2 and sets status to 4 (Waiting/BYE)
- Shifts opponent2 to opponent1 if opponent1 is empty

**Success Case:**
- Returns: `Promise<void>` (resolves on success)
- Side effects: Fixes duplicate participants and normalizes match structure
- Logs: Normalization progress and results

**Error Cases:**
- Returns early with log if no LB group found
- Returns early with log if no LB R1 found
- Logs errors but does NOT throw (defensive, non-critical)

**Database Tables Modified:**
- `match` (direct SQL updates to opponent fields and status)

---

## Private Methods (Internal Only)

These methods are NOT exposed in the public API but are used internally:

- `calculateLBRounds(bracketSize: number): number` - Calculate LB rounds based on bracket size
- `findLBFinalMatch(stageId: number): Promise<StorageMatch | null>` - Find LB Final match
- `normalizeGrandFinalPopulation(stageId: number): Promise<void>` - Populate GF opponent2 from LB Final winner
- `isLosersByeMatch(matchId: number): Promise<...>` - Check BYE eligibility (wrapped by public method)
- `checkDownstreamPopulation(matchId: number): Promise<...>` - Check if downstream matches populated

---

## Exported Types

```typescript
export interface CreateBracketOptions {
  bracketId: string;
  format: 'single_elimination' | 'double_elimination';
  teams: Array<{ id: string; name: string; seed: number }>;
  grandFinalType?: 'simple' | 'double';
}

export interface UpdateMatchOptions {
  matchId: number;
  scores: {
    opponent1: { score?: number; result?: 'win' | 'loss' | 'draw' };
    opponent2: { score?: number; result?: 'win' | 'loss' | 'draw' };
  };
}

export interface UpdateSeedingOptions {
  bracketId: string;
  newSeeding: Array<{ id: string; name: string; seed: number }>;
  keepSameSize?: boolean;
}
```

---

## Error Message Patterns

### Consistent Error Format:
- All public methods wrap errors with descriptive context
- Error serialization via `serializeError()` function
- Logs include timestamp, operation details, and full error object

### Example Error Messages:
- `"Failed to insert participants: [details]"`
- `"Bracket creation failed: [details]"`
- `"Match update failed: [details]"`
- `"Cannot update seeding: Changes would affect existing match results..."`
- `"Seeding update failed: [details]"`
- `"Final standings calculation failed: [details]"`
- `"Cannot set to Ready: [reason]"`
- `"Cannot reopen completed match: downstream matches have been populated..."`
- `"Failed to toggle BYE match status: [details]"`

---

## Logging Patterns

The service uses consistent logging via `@/utils/logger`:

- `bracketLog()` - Operation progress and debugging
- `successLog()` - Operation success with summary
- `failureLog()` - Operation failure with error
- `errorLog()` - Detailed error information
- `warnLog()` - Non-critical warnings

---

## Consumer Files

**Current consumers that MUST continue working:**

1. `src/hooks/useBracketCompletion.ts` - Uses `calculateFinalStandings()`
2. `src/hooks/playoffs/usePlayoffMatchUpdate.ts` - Uses `updateMatch()`
3. `src/services/bracket-creator.ts` - Uses `createBracket()`
4. `src/components/playoffs/match-score-editor/BracketsManagerMatchEditor.tsx` - Uses `checkByeEligibility()`, `adminToggleByeReady()`, `updateMatch()`
5. `src/components/playoffs/SeedingUpdateDialog.tsx` - Uses `updateSeeding()`

---

## Critical Behaviors to Preserve

1. **Race Condition Prevention:** `updateMatch()` uses `matchUpdateQueue` for serialization
2. **BYE Match Handling:** Special logic in `updateMatch()` for BYE unlock without calling brackets-manager
3. **Triple Normalization:** `normalizeLosersR1()` is called 3 times with delays in `updateMatch()`
4. **Defensive Normalization:** Normalization methods log errors but don't throw
5. **Cache Management:** Participant cache is loaded before operations and cleared during normalization
6. **Direct SQL for Fixes:** Duplicate fix in `normalizeLosersR1()` uses direct SQL to bypass defensive merge
7. **Downstream Cascade:** `adminToggleByeReady()` can cascade clear downstream matches when reopening

---

## Test Coverage Requirements

All public methods must have integration tests covering:

- ✅ `createBracket()` - Has basic tests (need to fix interfaces)
- ✅ `updateMatch()` - Has basic tests (need to fix interfaces)
- ❌ `updateSeeding()` - **MISSING TESTS**
- ❌ `calculateFinalStandings()` - **MISSING TESTS**
- ❌ `checkByeEligibility()` - **MISSING TESTS**
- ❌ `adminToggleByeReady()` - **MISSING TESTS**
- ❌ `normalizeLosersR1()` - **MISSING TESTS**
- ⚠️ `getStorage()` - Simple getter, low priority

---

## Next Steps (Phase 1+)

After Phase 0 is complete and tests are passing:

1. Extract shared types to `types/BracketServiceTypes.ts`
2. Extract error utilities to `utils/BracketErrorUtils.ts`
3. Update BracketManagerService imports
4. Verify tests still pass

This documentation will be the reference for maintaining backward compatibility throughout the refactoring.

---

**End of Phase 0 Documentation**
