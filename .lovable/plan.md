

## Plan: Fix Double-Submit Race Condition in Match Updates

### The problem

`useMatchUpdate` uses `useState` for its `isUpdating` guard. React state updates are batched and applied on the next render, so two rapid submits in the same event loop tick both see `isUpdating === false` and both proceed — doubling team stat increments.

`useMatchSubmission.handleSubmitScore` has no guard at all, making it equally vulnerable.

### The fix

**1. `useMatchUpdate.ts`** — Add a `useRef` as a synchronous guard alongside the existing `useState`:

```typescript
import { useRef, useState } from 'react';

const [isUpdating, setIsUpdating] = useState(false);
const isUpdatingRef = useRef(false);

const handleUpdateMatch = async (...) => {
  if (!editingMatch || isUpdatingRef.current) return false;
  isUpdatingRef.current = true;
  setIsUpdating(true);
  try {
    // ... existing logic ...
  } finally {
    isUpdatingRef.current = false;
    setIsUpdating(false);
  }
};
```

**2. `useMatchSubmission.ts`** — Add the same ref-based guard:

```typescript
import { useRef } from 'react';

const isSubmittingRef = useRef(false);

const handleSubmitScore = async (params) => {
  if (isSubmittingRef.current) return false;
  isSubmittingRef.current = true;
  try {
    // ... existing logic ...
  } finally {
    isSubmittingRef.current = false;
  }
};
```

### What changes

- **2 files** — `useMatchUpdate.ts` and `useMatchSubmission.ts`: add `useRef` synchronous guards
- **0 migrations, 0 other files**

