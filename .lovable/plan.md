

## Fix: Add Missing useCallback Dependencies in usePairingOperations

### Problem
Two `useCallback` hooks have missing dependency array entries, causing stale closure bugs in cross-block validation and pairing generation.

### Changes

**File: `src/hooks/useAutoSchedule/usePairingOperations.ts`**

1. **Line 193** — Add `teamBlockMap` to `handleGenerateClick` deps:
```typescript
[generateMatchPairings, toast, setActiveTab, teamBlockMap]
```

2. **Line 325** — Add `teamBlockMap`, `generatorBlockMap`, `allTeams` to `handleApplySchedule` deps:
```typescript
[toast, qualityMetrics, teamBlockMap, generatorBlockMap, allTeams]
```

### Scope
1 file, 2 lines changed. No logic changes — only dependency arrays updated.

