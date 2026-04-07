

## Fix: Deduplicate ByeStrategy type

### What's wrong

The `'last' | 'fewestPartners'` union appears in three places:
- `scheduleOdd.ts` line 5: `type ByeStrategy = ...` (wedged between imports)
- `types.ts` line 19: inline in `GreedySchedulerInput.config`
- `byeSelection.ts` line 10: inline in `pickBye` parameter

### Fix

**1. `src/utils/scheduling/greedy/types.ts`** — Export named type and use it in config

Add after the `RelaxationLevel` type:
```ts
export type ByeStrategy = 'last' | 'fewestPartners';
```

Update `GreedySchedulerInput.config.byeStrategy` to use `ByeStrategy` instead of the inline union. Update `DEFAULT_BYE_STRATEGY` annotation to use `ByeStrategy`.

**2. `src/utils/scheduling/greedy/scheduleOdd.ts`** — Remove local type, import from types

- Delete line 5 (`type ByeStrategy = 'last' | 'fewestPartners';`)
- Add `ByeStrategy` to the existing import from `./types`

**3. `src/utils/scheduling/greedy/byeSelection.ts`** — Import and use

- Add `ByeStrategy` to the import from `./types`
- Change `pickBye` parameter from `strategy: 'last' | 'fewestPartners'` to `strategy: ByeStrategy`

### Scope

3 files, type-only changes. No logic changes.

