

## Diagnosis: "Load Teams" button does nothing

### Root Cause

In `src/hooks/useAutoSchedule/index.ts`, the real `handleLoadTeams` function from `useTeamOperations` is assigned to `_handleLoadTeams` (prefixed with underscore, marking it as unused). The `loadTeams` wrapper on lines 107-113 is a **no-op** — it sets `isProcessing` to true, does nothing, then sets it to false. This no-op is what gets exposed as `handleLoadTeams` to the UI.

```text
useTeamOperations()
  └─ handleLoadTeams  ──→  aliased as _handleLoadTeams (UNUSED)

loadTeams() wrapper (no-op)  ──→  exposed as handleLoadTeams (BROKEN)
```

### Fix

**`src/hooks/useAutoSchedule/index.ts`**

1. Rename `_handleLoadTeams` back to `handleLoadTeams` (line 87)
2. Replace the no-op `loadTeams` wrapper (lines 107-113) with one that actually calls `handleLoadTeams(selectedDate, dualMatchMode)`
3. Keep `_teamBlockMap` and `_setTeamBlockMap` as-is (they are intentionally unused since `useTeamOperations` manages the block map)

The fixed wrapper:
```typescript
const loadTeams = async () => {
  setIsProcessing(true);
  try {
    await handleLoadTeams(selectedDate, dualMatchMode);
  } finally {
    setIsProcessing(false);
  }
};
```

This is a one-line fix in a single file. The build errors about `_property` names across many other files are pre-existing and unrelated to this issue.

