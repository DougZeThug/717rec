

## Plan: Reset "Keep playoffs active" checkbox on dialog open

### The bug

In `SeasonArchivalDialog.tsx`, the `keepPlayoffsActive` state is initialized once when the component mounts and never resets. Because the dialog stays mounted between open/close cycles, if an admin checks the box and cancels, reopening the dialog shows it still checked — risking an accidental partial archive.

### The fix

Add a `useEffect` that resets `keepPlayoffsActive` to `false` whenever `isOpen` becomes true. Mirrors the existing pattern in `EditMatchParticipantsDialog.tsx`.

```tsx
useEffect(() => {
  if (isOpen) {
    setKeepPlayoffsActive(false);
  }
}, [isOpen]);
```

Also reset `isArchiving` defensively in the same effect so a stuck "Archiving..." state from a prior error can't carry over either.

### Files touched

- Edit: `src/components/admin/seasons/SeasonArchivalDialog.tsx` — add `useEffect` import (already imported as part of React's `useState`), add the reset effect.

### Test coverage

Add one test to a new or existing test file `src/components/admin/seasons/__tests__/SeasonArchivalDialog.test.tsx`:
- Open dialog, check the box, close, reopen → assert checkbox is unchecked.

### Verification

1. `npm test` — new test passes.
2. Manual: open Archive dialog → check box → cancel → reopen → box is unchecked. ✅
3. No behavior change to the actual archive flows.

### Rollback

Revert the one component file and delete the new test. One step.

