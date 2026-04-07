

## Fix Lint Violations in Bracket Test Files

### Changes

**1. `src/utils/brackets/mappers/__tests__/teamMapper.test.ts`**

- Replace `result!.id` / `result!.name` non-null assertions with guard assertions (`if (!result) throw new Error(...)`) before accessing properties
- Replace `as any` casts with `as unknown as PlayoffTeam[]` for the intentionally-invalid test data, which satisfies the linter while still testing runtime validation

**2. `src/utils/brackets/validators/__tests__/bracketDataValidator.test.ts`**

- Replace `null as any` with `null as unknown as PlayoffMatch[]` and `null as unknown as PlayoffTeam[]` for the two null-input tests

### Scope

2 test files, no production code changes. Fixes 3 non-null assertions and 5 `as any` casts.

