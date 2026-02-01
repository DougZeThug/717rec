
# Plan: Fix Remaining Test Suite Issues

## Summary

After auditing 45 test files across the codebase, I identified **2 test files with definite issues** and **2 with potential issues** that need attention. The bracket manager tests (39 total) were fixed in the previous session and are now passing.

## Issue 1: teamStats.test.ts - Incomplete RPC Mock (High Priority)

**File**: `src/hooks/team-stats/utils/__tests__/teamStats.test.ts`

**Problem**: The `applyMatchResult` function makes TWO RPC calls:
1. `supabase.rpc('update_team_stats', {...})` 
2. `supabase.rpc('upsert_team_season_stats')` (line 45-46 in teamRecordUtils.ts)

The test mock only handles a single RPC call, causing the second call to return `undefined` instead of a proper response.

**Current Mock (lines 20-24)**:
```typescript
(supabase.rpc as any).mockReturnValue({
  data: { success: true },
  error: null,
});
```

**Fix**: Change to handle multiple RPC calls:
```typescript
(supabase.rpc as any).mockResolvedValue({
  data: { success: true },
  error: null,
});
```

This ensures all RPC calls return the mocked value.

---

## Issue 2: compatibilityUtils.test.ts - Incorrect Initial Mock Pattern (Medium Priority)

**File**: `src/utils/autoSchedule/__tests__/compatibilityUtils.test.ts`

**Problem**: The initial mock uses `mockReturnThis()` which doesn't work correctly with Vitest's module hoisting:

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),  // Returns the mock itself, not a query builder
    select: vi.fn().mockReturnThis(),
    // ...
  },
}));
```

**Fix**: Simplify the initial mock and rely on per-test implementations:
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
```

The `beforeEach` blocks already override this properly, so this change just removes the misleading initial setup.

---

## Issue 3: teamLoaderUtils.test.ts - Similar Mock Pattern Issue (Low Priority)

**File**: `src/utils/autoSchedule/__tests__/teamLoaderUtils.test.ts`

**Problem**: Same pattern as Issue 2 - initial mock uses `mockReturnThis()`:
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  },
}));
```

**Fix**: Simplify to:
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
```

---

## Implementation Steps

### Step 1: Fix teamStats.test.ts RPC Mock
Update the mock to use `mockResolvedValue` instead of `mockReturnValue` to handle multiple async RPC calls.

### Step 2: Simplify compatibilityUtils.test.ts Mock
Remove the `mockReturnThis()` pattern from the initial mock setup since it's overridden per-test anyway.

### Step 3: Simplify teamLoaderUtils.test.ts Mock
Same fix as Step 2 for consistency.

### Step 4: Verify All Tests Pass
Run full test suite to confirm all 45 test files pass.

---

## Files to be Modified

| File | Change | Priority |
|------|--------|----------|
| `src/hooks/team-stats/utils/__tests__/teamStats.test.ts` | Fix RPC mock to handle multiple calls | High |
| `src/utils/autoSchedule/__tests__/compatibilityUtils.test.ts` | Simplify initial Supabase mock | Medium |
| `src/utils/autoSchedule/__tests__/teamLoaderUtils.test.ts` | Simplify initial Supabase mock | Low |

**Total: 3 files modified**

---

## Expected Results

After fixes:
- All 45 test files should pass
- No flaky tests due to mock configuration issues
- Consistent mock patterns across the codebase

---

## Technical Notes

### Why `mockReturnValue` vs `mockResolvedValue`

- `mockReturnValue(x)` - Returns `x` synchronously
- `mockResolvedValue(x)` - Returns `Promise.resolve(x)`

For `supabase.rpc()` which returns a Promise, we need `mockResolvedValue` to ensure the mock behaves correctly when awaited multiple times.

### Test File Summary

| Category | Count | Status |
|----------|-------|--------|
| Career calculations | 6 | Likely passing |
| Auto-schedule utils | 5 | 3 need fixes |
| Bracket form components | 12 | Likely passing |
| Bracket manager | 2 | Passing (39/39) |
| Match hooks | 5 | Likely passing |
| Auth components | 1 | Likely passing |
| History components | 1 | Likely passing |
| Admin components | 2 | Passing |
| Other hooks | 3 | Likely passing |
| Other utils | 8 | Likely passing |
