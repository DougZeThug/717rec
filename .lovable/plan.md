

## Fix: Filter transient network-caused Sentry messages in `errorLog`

### Problem

When a network request fails (status_code: 0), Supabase returns a PostgREST error object that is **not** an `Error` instance. In `errorLog`, this means:
1. No `Error` is found in args
2. The string arg `"Bracket query error:"` is sent via `captureMessage`
3. The `beforeSend` filter only checks for `"Failed to fetch"` / `"Load failed"` / `"NetworkError"` in the message — but the message is just the context string

This causes generic context messages like `"Bracket query error:"` and `"CRITICAL ERROR in useBracketData:"` to be reported to Sentry whenever there's a transient network drop.

### Root Cause

The `errorLog` function doesn't inspect the PostgREST error object's `.message` property for network error patterns before deciding to send to Sentry. PostgREST errors from network failures contain `"TypeError: Failed to fetch"` in their message, but since they're plain objects (not `Error` instances), `errorLog` ignores them and sends only the context string.

### Fix

**File: `src/utils/logger.ts`** — In the `else if (messageArg)` branch (line 50-52), before calling `captureMessage`, check if any of the additional args contain network error indicators. If they do, skip the Sentry report.

```typescript
} else if (messageArg) {
  const additionalArgs = args.filter((a) => a !== messageArg);
  
  // Check if any argument contains a network error message (e.g., PostgREST error from fetch failure)
  const isNetworkError = additionalArgs.some((arg) => {
    if (arg && typeof arg === 'object') {
      const msg = (arg as any).message || '';
      return (
        msg.includes('Failed to fetch') ||
        msg.includes('Load failed') ||
        msg.includes('NetworkError')
      );
    }
    return false;
  });
  
  if (!isNetworkError) {
    captureMessage(String(messageArg), 'error', additionalArgs.length > 0 ? { additionalArgs } : undefined);
  }
}
```

### What This Achieves
- Prevents context-only messages like "Bracket query error:" from being sent to Sentry when caused by transient network failures
- Real errors with non-network PostgREST messages still get reported
- Console logging is unaffected — all errors still appear in the browser console

### Files Modified
- `src/utils/logger.ts` — add network error check before `captureMessage` in `errorLog`

