
# Plan: Fix Remaining 17 Test Failures

## Problem Analysis

After investigating both test files, I identified **4 distinct categories of failures**:

### Category 1: API Mismatch in `bracketManagerSchema.test.ts` (6 tests)

The `createBracket` tests in this file use an **incorrect API shape**:
```typescript
// WRONG - Test uses this API:
service.createBracket({
  bracketId,
  format: 'single_elimination',
  teams: teams.map((t, idx) => ({ teamId: t.id, teamName: t.name, seed: idx + 1 })),
})

// CORRECT - Actual API expects:
service.createBracket({
  bracketId,
  format: 'single_elimination', 
  teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 })),
})
```

The production `CreateBracketOptions` interface uses `id` and `name`, not `teamId` and `teamName`.

**Affected tests (6):**
- "should create a 4-team single elimination bracket"
- "should create an 8-team single elimination bracket"
- "should create a 4-team double elimination bracket"
- "should create an 8-team double elimination bracket"
- "should handle odd number of teams (3 teams)"
- "should handle 5 teams with proper BYE assignment"

---

### Category 2: API Mismatch in `bracketManagerSchema.test.ts` updateMatch (2 tests)

The `updateMatch` tests use an incorrect API shape:
```typescript
// WRONG - Test uses this API:
service.updateMatch({
  matchId,
  team1Score: 2,
  team2Score: 1,
})

// CORRECT - Actual API expects:
service.updateMatch({
  matchId,
  scores: {
    opponent1: { score: 2, result: 'win' },
    opponent2: { score: 1, result: 'loss' },
  },
})
```

**Affected tests (2):**
- "should update match scores correctly"
- "should propagate winner to next match"

---

### Category 3: Mock Data Structure Issues in `bracketManagerPhase0.test.ts` (7 tests)

Several tests fail because the mocks don't provide the correct data structure that the service expects from `SupabaseSqlStorage.select()`. The storage adapter returns objects differently than direct Supabase queries.

The services use `this.storage.select()` (mocked), but many tests mock `supabase.from().select()` instead. Since `SupabaseSqlStorage` is mocked as a class, we need to configure its `select` mock, not the Supabase mock.

**Affected tests (7):**
- "should update match with correct interface" (updateMatch)
- "should handle BYE match unlock" (updateMatch)
- "should update seeding with correct interface" (updateSeeding)
- "should calculate final standings and upsert..." (calculateFinalStandings)
- "should throw error when upsert fails" (calculateFinalStandings)
- "should fix duplicate participants in LB R1" (normalizeLosersR1)
- "should shift opponent2 to opponent1 if opponent1 is empty" (normalizeLosersR1)

---

### Category 4: Storage Mock Instance Access (2 tests)

The `checkByeEligibility` and `adminToggleByeReady` tests need to configure the storage mock's `select` method, but the current mock structure doesn't expose this properly.

**Affected tests (2):**
- "should return ok: true for eligible BYE match" (checkByeEligibility)
- "should set match to Ready when makeReady is true" (adminToggleByeReady)

---

## Solution Strategy

### Approach: Create Shared Mock Factory + Fix API Shapes

1. **Create a configurable storage mock factory** that allows tests to control what `storage.select()` returns per table/query
2. **Fix API shapes** in tests to match production interfaces
3. **Use dependency injection pattern** for mocks instead of vi.mock() to enable per-test configuration

---

## Implementation Steps

### Step 1: Fix bracketManagerSchema.test.ts API Shapes

Update all `createBracket` calls to use correct property names:
```typescript
// Before
teams: teams.map((t, idx) => ({ teamId: t.id, teamName: t.name, seed: idx + 1 }))

// After  
teams: teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 }))
```

Update all `updateMatch` calls to use correct structure:
```typescript
// Before
service.updateMatch({ matchId, team1Score: 2, team2Score: 1 })

// After
service.updateMatch({
  matchId,
  scores: {
    opponent1: { score: 2, result: 'win' },
    opponent2: { score: 1, result: 'loss' },
  },
})
```

### Step 2: Create Configurable Storage Mock Factory

Create a shared mock utility that allows per-test configuration:

```typescript
// tests/__mocks__/createStorageMock.ts
export function createStorageMock() {
  const selectResponses = new Map<string, any>();
  
  return {
    setSelectResponse: (table: string, filter: any, response: any) => {
      const key = `${table}:${JSON.stringify(filter)}`;
      selectResponses.set(key, response);
    },
    
    mockInstance: {
      select: vi.fn().mockImplementation((table, filter) => {
        const key = `${table}:${JSON.stringify(filter)}`;
        return Promise.resolve(selectResponses.get(key) || null);
      }),
      insert: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      loadParticipantsForTournament: vi.fn().mockResolvedValue(undefined),
      clearParticipantCache: vi.fn(),
    },
  };
}
```

### Step 3: Update bracketManagerPhase0.test.ts Storage Mocks

For each failing test, configure the storage mock to return the expected data:

**Example for updateMatch test:**
```typescript
it('should update match with correct interface', async () => {
  const storageMock = createStorageMock();
  
  // Configure storage.select('match', 1) to return match data
  storageMock.setSelectResponse('match', 1, {
    id: 1,
    opponent1: { id: 1 },
    opponent2: { id: 2 },
    status: 2,
    stage_id: 1,
    group_id: 1,
    round_id: 1,
  });
  
  // Configure storage.select('stage', 1) for tournament lookup
  storageMock.setSelectResponse('stage', 1, {
    id: 1,
    tournament_id: 'test-bracket',
  });
  
  // Configure storage.select('group', { stage_id: 1 }) for normalization
  storageMock.setSelectResponse('group', { stage_id: 1 }, []);
  
  // Inject the mock...
});
```

### Step 4: Fix Individual Test Expectations

**normalizeLosersR1 tests**: These tests expect `mockSupabaseFrom.update` to be called with specific parameters. However, the normalization service uses `supabase.from('match').update()` directly (not via storage). The tests need to verify the Supabase mock was called correctly.

**checkByeEligibility tests**: These use `storage.select()` in a chain (match → round → group → participant). Need to configure the mock to return sequential responses.

### Step 5: Add Missing Mock Return Values for BracketsManager

The mock `BracketsManager` in `bracketManagerSchema.test.ts` returns empty array for `finalStandings`. The test expects valid standings data. Update the mock:

```typescript
get: {
  finalStandings: vi.fn().mockResolvedValue([
    { id: 1, name: 'Team 1', rank: 1 },
    { id: 2, name: 'Team 2', rank: 2 },
  ]),
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `tests/__mocks__/createStorageMock.ts` | Create new shared utility |
| `tests/bracketManagerSchema.test.ts` | Fix API shapes, update mock structure |
| `tests/bracketManagerPhase0.test.ts` | Configure storage mocks properly, fix test expectations |

**Total: 1 file created, 2 files modified**

---

## Technical Details

### Why Storage Mock is Tricky

The current mock approach uses `vi.mock()` at module level, which creates a single mock instance. However, each test needs different return values for `storage.select()` based on the method being tested.

The solution uses a factory pattern that creates a fresh mock per test with configurable responses. This is cleaner than chained `.mockResolvedValueOnce()` calls which are fragile and order-dependent.

### Service Dependencies

The `BracketManagerService` creates services internally:
```
BracketManagerService
├─ storage: SupabaseSqlStorage
├─ manager: BracketsManager
├─ normalizationService(storage)
├─ adminService(storage)
├─ standingsService(storage, manager)
├─ seedingService(storage, manager)
├─ creationService(storage, manager)
└─ updateService(storage, manager, normalizationService)
```

All services share the same storage instance, so configuring one mock affects all services consistently.

### Expected Results After Fix

| Test File | Current | Expected |
|-----------|---------|----------|
| `bracketManagerSchema.test.ts` | 14/16 | 16/16 |
| `bracketManagerPhase0.test.ts` | 8/23 | 23/23 |

---

## Verification

After implementing changes:
1. Run `npm test` to verify all 39 tests pass
2. Confirm no TypeScript errors in test files
3. Ensure mock configuration is maintainable and readable
