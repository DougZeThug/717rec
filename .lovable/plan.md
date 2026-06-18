## Fix downstream-clear bugs when reopening completed bracket matches

Two small fixes in `src/services/brackets/manager/services/BracketAdmin/`:

### 1. `queries.ts` — `collectDownstreamChain`
Replace the winner detection so it follows the actual winner instead of just the first available opponent:

```ts
const winnerId =
  currentMatch.opponent1?.result === 'win'
    ? currentMatch.opponent1.id
    : currentMatch.opponent2?.result === 'win'
      ? currentMatch.opponent2?.id
      : null;
if (winnerId) trackedIds.add(winnerId);
```

### 2. `lifecycle.ts` — `adminToggleByeReady`
Tighten the reopen guard so the BYE-specific downstream-clear path only runs for actual Losers Bracket BYE matches:

```ts
const isCompletedMatch = check.ok && check.meta?.status === 4;
```

This keeps `check.meta` available for the later `makeReady` and revert branches (they already handle `!check.ok`), but prevents non-BYE completed matches from reaching the buggy downstream logic.

### Verification
Run the failing repro test:

```
npm run test:file -- src/services/brackets/manager/services/__tests__/guard-bypass-repro.test.ts
```

It should now show match 50 cleared (not 51/42).

### Scope
- No UI changes, no schema changes, no behavior change for happy-path BYE reopen flows.
- Only the wrong-winner traversal and the guard bypass are addressed.