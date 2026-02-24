

## Fix: Sentry filter not catching network errors sent as message events

### Problem

The `errorLog` function in `src/utils/logger.ts` sends errors to Sentry two ways:
1. As **exception events** via `captureError` (when an `Error` object is found)
2. As **message events** via `captureMessage` (when only a string is found)

The "Failed to fetch current season:" error hits path #2 because `handleDatabaseError` constructs a `DatabaseError` that wraps the original network error. When `errorLog` receives `("Failed to fetch current season:", postgrestErrorObject)`, the PostgREST error object is not an `Error` instance, so `errorLog` falls through to `captureMessage` with the string.

The `beforeSend` Sentry filter only checks `event.exception?.values?.[0]?.value`, which is undefined for message events. So these "Failed to fetch" messages slip through.

### Root Cause

The `beforeSend` filter in `src/utils/sentry.ts` doesn't inspect `event.message` for network error patterns -- only `event.exception.values`.

### Fix

**File: `src/utils/sentry.ts`**

Add a check for `event.message` at the top of the `beforeSend` callback, alongside the existing exception check:

```typescript
beforeSend(event, hint) {
  // Filter network errors from message events (sent via captureMessage)
  const eventMessage = event.message || '';
  if (
    eventMessage.includes('Failed to fetch') ||
    eventMessage.includes('Load failed') ||
    eventMessage.includes('NetworkError')
  ) {
    return null;
  }

  // Filter network errors from exception values (existing code)
  const exceptionValue = event.exception?.values?.[0]?.value || '';
  // ... rest of existing beforeSend logic
}
```

### Files Modified
- `src/utils/sentry.ts` -- add `event.message` check in `beforeSend`

### What This Achieves
- Catches network errors sent as Sentry message events (not just exception events)
- Prevents "Failed to fetch current season" from being reported during transient connectivity drops
- No change to real error reporting -- only filters messages containing network error patterns

