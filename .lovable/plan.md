

## Fix Lint Violations in Auto-Schedule Test Files

### Problem
5 lint violations across 3 test files: namespace imports, non-null assertions, and an async function without await.

### Changes

**1. `src/utils/autoSchedule/dualBlock/__tests__/index.test.ts`**
- Replace `import * as DualBlock` with named imports for each exported function
- Update all tests to reference the named imports directly instead of `DualBlock.xxx`

**2. `src/utils/autoSchedule/dualBlock/__tests__/pairingGenerator.test.ts`**
- Replace 3 `result!.` non-null assertions with guard patterns:
  ```typescript
  if (!result) throw new Error('Expected result');
  expect(result.pairings['Early']).toBeDefined();
  ```

**3. `src/utils/autoSchedule/__tests__/blossomPairingAlgorithm.test.ts`**
- Change `haveTeamsPlayedFn: async () => false` to `haveTeamsPlayedFn: () => Promise.resolve(false)` — returns a Promise without the `async` keyword, satisfying the no-unused-await rule.

### Scope
3 test files, no production code changes.

