
# Plan: Fix Remaining Test Failures

## Current Status: 14/16 Schema Tests Passing, 15/23 Phase0 Tests Passing

### ✅ Completed
1. Fixed API shapes in `bracketManagerSchema.test.ts` (6 createBracket tests now pass)
2. Fixed storage mock initialization using `globalThis` pattern
3. Tests are now running and loading properly

### ⏳ Remaining Issues (8 tests)

The remaining failures are all due to **incomplete Supabase mock chaining**:

**Issue**: Services use `supabase.from('match').update({...}).eq('id', matchId)` but the mock's `.update()` returns `this` which doesn't have `.eq()` method.

**Fix Required**: Update `mockSupabaseFrom` in both test files to properly chain:

```typescript
mockSupabaseFrom = {
  select: vi.fn().mockReturnThis(),
  insert: createInsertMock(),
  update: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  }),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
};
```

### Files to Update

| File | Change Needed |
|------|---------------|
| `tests/bracketManagerPhase0.test.ts` | Fix `mockSupabaseFrom.update` chain |
| `tests/bracketManagerSchema.test.ts` | Fix `mockSupabaseFrom.update` chain |

### Expected Final Results

| Test File | Current | After Fix |
|-----------|---------|-----------|
| `bracketManagerSchema.test.ts` | 14/16 | 16/16 |
| `bracketManagerPhase0.test.ts` | 15/23 | 23/23 |
