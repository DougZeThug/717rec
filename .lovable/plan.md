

## Fix: Memoize `initializeScores` to Stop Infinite Re-render Loop

### Problem

`initializeScores` in `useMatchScoresState` is not wrapped in `useCallback`. The `useEffect` in `useUncompletedMatches` lists it as a dependency, so every render creates a new function reference → triggers the effect → calls `setScores` → re-renders → new reference → loop.

This also wipes any user-entered scores on every cycle.

### Change

**File: `src/hooks/matches/useMatchScoresState.ts`**

Wrap `initializeScores` in `useCallback` with an empty dependency array (it only uses `setScores`, which is stable):

```typescript
import { useState, useCallback } from 'react';

// ...

const initializeScores = useCallback((newMatches: Match[]) => {
  const initialScores: Record<string, { team1Score: string; team2Score: string }> = {};
  newMatches.forEach((match) => {
    initialScores[match.id] = {
      team1Score: match.team1Score?.toString() || '',
      team2Score: match.team2Score?.toString() || '',
    };
  });
  setScores(initialScores);
}, []);
```

### Scope

1 file, wrapping one function in `useCallback`. No logic changes.

