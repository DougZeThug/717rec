

## Fix: Reduce Sentry noise from transient network failures

### Problem

When a user's internet briefly drops (even for a few seconds), the stats page fires 60+ parallel Supabase requests that all fail simultaneously. Each failure gets reported to Sentry as a separate error event, creating massive noise from a single transient network blip.

The Sentry logs show no HTTP status codes on the failing requests (unlike the 401 errors we fixed earlier), which confirms these are network-level failures (browser couldn't reach Supabase at all), not server errors.

### Root Cause

The Sentry SDK's default breadcrumb/error handling treats every failed `fetch` as a reportable event. The app has no filtering to distinguish between:
- **Transient network failures** (user's wifi briefly dropped) -- not actionable
- **Real API errors** (401, 500, etc.) -- actionable

### Fix: Filter network errors in Sentry configuration

**File: Sentry initialization (likely `src/utils/sentry.ts` or `src/main.tsx`)**

Add a `beforeBreadcrumb` filter to the Sentry SDK configuration that suppresses `fetch` breadcrumbs with no `status_code` (network failures). Also add a `beforeSend` filter to prevent raw `TypeError: Failed to fetch` errors from being sent as events.

This way:
- Real HTTP errors (401, 500, etc.) still get reported
- Network-level failures (no connectivity) are silently ignored
- The app's existing React Query retry logic handles recovery automatically

### Technical Details

**Sentry config changes:**

```typescript
Sentry.init({
  // ... existing config ...
  
  beforeBreadcrumb(breadcrumb) {
    // Suppress fetch breadcrumbs that are network failures (no status code)
    if (
      breadcrumb.category === 'fetch' &&
      breadcrumb.level === 'error' &&
      breadcrumb.data &&
      !breadcrumb.data.status_code
    ) {
      return null; // Drop this breadcrumb
    }
    return breadcrumb;
  },

  beforeSend(event) {
    // Filter out "Failed to fetch" / "Load failed" network errors
    const message = event.exception?.values?.[0]?.value || '';
    if (
      message.includes('Failed to fetch') ||
      message.includes('Load failed') ||
      message.includes('NetworkError')
    ) {
      return null; // Don't send to Sentry
    }
    return event;
  },
});
```

### Files Modified
- Sentry initialization file (need to locate exact file) -- add breadcrumb and event filters for network failures

### What This Achieves
- Eliminates the flood of Sentry errors from brief connectivity drops
- Keeps all actionable errors (auth failures, server errors, app bugs) reporting normally
- No behavior change for users -- React Query already retries failed requests automatically
- Reduces Sentry event volume and cost

