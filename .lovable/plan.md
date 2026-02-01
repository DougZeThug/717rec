
# Plan: Fix Test Failures and Supabase Mock Issues

## Problem Summary

The test suite has **multiple categories of failures** related to Supabase mocking and outdated test imports:

### Issue 1: Outdated Test Imports (Critical)
Two test files import services that no longer exist at the expected paths:
- `tests/bracketCreation.spec.ts` imports `BracketCreationService` from `../src/services/brackets/services/BracketCreationService` - **file doesn't exist**
- `tests/bracketCreationMigration.test.ts` imports `BracketMigrationService` from `../src/services/brackets/migration/BracketMigrationService` - **file doesn't exist**

The actual `BracketCreationService` now exists at `src/services/brackets/manager/services/BracketCreationService.ts` with a different API (class-based with constructor requiring storage/manager dependencies).

### Issue 2: Incomplete Supabase Mock in Shared Mock File
The `tests/__mocks__/supabase.ts` file has an incomplete mock that doesn't support chained `.insert().select()` calls:

```text
Current mock structure:
supabase.from('table').insert(data)  --> Returns Promise directly

Required structure:
supabase.from('table').insert(data).select('id')  --> Returns chainable object
```

The `BracketCreationService` uses `.insert().select('*')` pattern (line 94-95) which fails because the mock's `insert()` returns a Promise instead of a chainable object.

### Issue 3: Mock Method Chaining Issues
Several test files have mocks that don't match actual Supabase usage patterns:
- `bracketManagerPhase0.test.ts` - Uses `mockSupabaseFrom.insert.mockResolvedValue()` but the actual code uses `.insert().select()` chaining
- `bracketManagerSchema.test.ts` - Same issue

---

## Solution Strategy

**Option A: Delete Obsolete Tests (Recommended)**
Remove `bracketCreation.spec.ts` and `bracketCreationMigration.test.ts` since they test services that no longer exist. Their functionality is now covered by `bracketManagerPhase0.test.ts`.

**Option B: Comprehensive Mock Fix**
Create a properly chainable Supabase mock factory that supports all chaining patterns.

I recommend **Option A + fixing the remaining tests** because:
1. The obsolete tests add no value since the services don't exist
2. `bracketManagerPhase0.test.ts` already tests the new `BracketCreationService` correctly
3. Fixing remaining mocks is simpler than maintaining two separate mock systems

---

## Implementation Steps

### Step 1: Delete Obsolete Test Files
Remove tests that import non-existent services:
- `tests/bracketCreation.spec.ts`
- `tests/bracketCreationMigration.test.ts`

### Step 2: Fix Shared Supabase Mock
Update `tests/__mocks__/supabase.ts` to support chainable `.insert().select()`:

```typescript
// Updated insert method
insert: (data: unknown | unknown[]) => {
  const rows = Array.isArray(data) ? data : [data];
  if (!insertedRows[tableName]) {
    insertedRows[tableName] = [];
  }
  insertedRows[tableName].push(...rows);
  
  // Return chainable object instead of Promise
  return {
    select: (columns?: string) => Promise.resolve({ 
      data: rows.map((row, idx) => ({ ...row, id: idx + 1 })), 
      error: null 
    }),
    // Allow direct await for backwards compatibility
    then: (resolve: Function) => resolve({ data: rows, error: null }),
  };
}
```

### Step 3: Fix bracketManagerPhase0.test.ts Mocks
Update the mock setup to support `.insert().select()` chaining:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  
  mockSupabaseFrom = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      }),
    }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
  };
  (supabase.from as any).mockReturnValue(mockSupabaseFrom);
});
```

### Step 4: Fix bracketManagerSchema.test.ts Mocks
Apply the same chainable mock pattern.

---

## Files Changed

| File | Action |
|------|--------|
| `tests/bracketCreation.spec.ts` | Delete |
| `tests/bracketCreationMigration.test.ts` | Delete |
| `tests/__mocks__/supabase.ts` | Update insert() to return chainable object |
| `tests/bracketManagerPhase0.test.ts` | Update mockSupabaseFrom.insert to be chainable |
| `tests/bracketManagerSchema.test.ts` | Update mockSupabaseFrom.insert to be chainable |

**Total: 2 files deleted, 3 files modified**

---

## Technical Details

### Chainable Mock Pattern
The key insight is that Supabase methods like `insert()` don't return Promises directly - they return query builder objects that can be further chained. The final method (like `select()`) returns the Promise.

```text
Correct chain:
supabase.from('table')     --> QueryBuilder
  .insert(data)            --> QueryBuilder (still chainable)
  .select('id')            --> Promise<{ data, error }>
```

### Backwards Compatibility
The updated mock maintains compatibility with tests that directly await `insert()` by implementing a `then()` method on the returned object.

### Verification
After fixes, run the test suite to verify:
- All bracket manager tests pass
- No import errors for missing services
- Mock chains work for all Supabase patterns used

