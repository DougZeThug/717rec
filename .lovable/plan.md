

## Fix: Recalculate Source Division Ranks After Cross-Division Move

### Problem
`moveTeam` recalculates `playoff_rank` for the **target** division but leaves the **source** division untouched, creating rank gaps (e.g., 1, 3, 4) that persist to the database and display in view mode.

### Fix

**File: `src/components/history/hooks/useHistoryEditing.ts`** — lines 148–192

In the `moveTeam` callback, after recalculating target division ranks, also recalculate consecutive ranks for the source division:

1. Capture the source division name before updating `division_name`
2. After building the target division rank map, build a second rank map for the source division (same sort logic, assign consecutive 1-based ranks)
3. In the final `.map()`, apply rank updates to both target **and** source division teams

```typescript
// After target division rank map is built, add:
const sourceDivisionTeams = updated
  .filter((t) => t.division_name === fromDivision && t.team_id !== teamId)
  .sort(/* same rank sort */);

const sourceRankMap = new Map<string, number>();
sourceDivisionTeams.forEach((t, idx) => {
  sourceRankMap.set(t.team_id, idx + 1);
});

// In the return map, also update source division teams
return updated.map((t) => {
  if (t.division_name === toDivision) {
    return { ...t, playoff_rank: teamIdToRank.get(t.team_id) ?? t.playoff_rank };
  }
  if (t.division_name === fromDivision) {
    return { ...t, playoff_rank: sourceRankMap.get(t.team_id) ?? t.playoff_rank };
  }
  return t;
});
```

One file, ~15 lines changed. No database or other file changes needed.

