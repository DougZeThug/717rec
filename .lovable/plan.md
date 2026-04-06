

## Fix: Stale teamBlockMap after manual team reassignment

### Problem

`teamBlockMap` (team ID → block names) is stored as independent state, only rebuilt during `handleLoadTeams()`. When users manually move teams between blocks via `setTimeBlockTeams()`, the map goes stale. The cross-block validator in `handleApplySchedule` then uses outdated assignments and falsely rejects valid schedules.

### Fix

**File: `src/hooks/useAutoSchedule/useTeamOperations.ts`**

Replace the `teamBlockMap` useState + manual setTeamBlockMap calls with a `useMemo` that derives the map from `timeBlockTeams` automatically:

1. Remove `useState` for `teamBlockMap` (line 30-32)
2. Remove `setTeamBlockMap(blockMap)` in `handleLoadTeams` (line 105)
3. Remove `teamBlockMap` from the persistence `useEffect` dependency and save call (lines 37-43)
4. Add a `useMemo` that builds the block map from `timeBlockTeams`:

```ts
const teamBlockMap = useMemo(() => {
  const blockMap: Record<string, string[]> = {};
  Object.entries(timeBlockTeams).forEach(([blockName, teams]) => {
    teams?.forEach((team) => {
      if (!blockMap[team.id]) blockMap[team.id] = [];
      if (!blockMap[team.id].includes(blockName)) blockMap[team.id].push(blockName);
    });
  });
  return blockMap;
}, [timeBlockTeams]);
```

5. Update the persistence `useEffect` to use the derived `teamBlockMap` (it will still be saved to session storage for restore).

**File: `src/hooks/useAutoSchedule/storage.ts`** — Keep `teamBlockMap` in the persisted shape but it will be overwritten by the memo on mount anyway, so no changes needed there.

### Why this is safe

- `teamBlockMap` is read-only outside this hook — no external code calls `setTeamBlockMap`
- The memo rebuilds on every `timeBlockTeams` change (manual or auto-loaded), so it can never go stale
- Session storage still persists it for page refresh, but the memo immediately recomputes from the also-persisted `timeBlockTeams`

### Scope

One file changed: `src/hooks/useAutoSchedule/useTeamOperations.ts`. No behavioral changes for non-manual-edit flows.

