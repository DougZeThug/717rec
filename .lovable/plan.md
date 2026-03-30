

## Fix: Bracket Not Updating After Score Submission

### Problem
After submitting a score, `onSaved` increments `refreshCounter`, which re-triggers the render effect. But the fingerprint function (line 9-16) only checks match count, source count, and match IDs — it ignores scores and results. So the re-render is skipped as "identical," and you see "Loading bracket..." until you refresh the page.

### Fix

**File: `src/components/playoffs/viewer/useBracketsViewerRenderer.ts`**

Two changes:

1. **Include scores/results in the fingerprint** so score changes are detected:

```typescript
const fingerprint = (matches: any[]): string => {
  const ids = matches.map((x) => x.id).join(',');
  const scores = matches
    .map((x) => `${x.opponent1?.score ?? '-'}:${x.opponent1?.result ?? ''}|${x.opponent2?.score ?? '-'}:${x.opponent2?.result ?? ''}`)
    .join(',');
  return `${matches.length}:${ids}:${scores}`;
};
```

2. **Reset the fingerprint when `refreshCounter` changes** so a forced refresh always works. Add a separate `useEffect` that clears the ref:

```typescript
useEffect(() => {
  lastFingerprintRef.current = null;
}, [refreshCounter]);
```

**One file, ~6 lines changed.**

