

## Plan: Keep Finalize Playoffs dialog open during async work

### The bug

In `SeasonFinalizePlayoffsDialog.tsx`, the `AlertDialogAction` button's `onClick` directly calls `onFinalize` without `e.preventDefault()`. Radix's `AlertDialogAction` auto-closes the dialog on click, so:
- The "Finalizing..." loading state never appears.
- On failure, the dialog is gone and the user must reopen to retry.

The repo already has the right pattern in `DeleteBracketDialog.tsx` — call `e.preventDefault()`, then close manually only on success.

### The fix

In `src/components/admin/seasons/SeasonFinalizePlayoffsDialog.tsx`:

1. Change `DialogActions` so `onFinalize` receives the click event:
   ```tsx
   onClick={(e) => {
     e.preventDefault();
     onFinalize();
   }}
   ```
2. `handleFinalize` already calls `onClose()` on success and skips it on failure (the `try`/`catch` returns before `onClose` in the error path) — no change needed there. Verify by reading the function.

Net effect: dialog stays open while the RPC runs (showing "Finalizing..."), closes on success, stays open on failure so the user can retry.

### Test coverage

Update `src/components/admin/seasons/__tests__/SeasonFinalizePlayoffsDialog.test.tsx`:

- **Restore the regression assertion** that was removed in commit f1e09a2b: on failure, `onClose` must NOT be called. Remove the outdated comment that justified dropping it.
- **Add a loading-state test**: while the mutation is pending, the action button shows "Finalizing..." and is disabled. Use a deferred promise so we can assert mid-flight before resolving.
- Existing success and cancel tests stay as-is.

### Files touched

- Edit: `src/components/admin/seasons/SeasonFinalizePlayoffsDialog.tsx` — wrap `onFinalize` in an event handler that calls `e.preventDefault()`.
- Edit: `src/components/admin/seasons/__tests__/SeasonFinalizePlayoffsDialog.test.tsx` — restore failure assertion, add loading-state test.

### Verification

1. `npm test` — all four tests pass, including the restored failure-case assertion.
2. Manual: open Season Management → Finalize Playoffs → click button → "Finalizing..." appears → dialog closes on success. If the RPC errors, dialog stays open with the error toast.
3. No behavior change to the success path or other dialogs.

### Rollback

Revert the two files. One step.

