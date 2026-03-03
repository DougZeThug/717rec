

## Add Sentry Metrics to the App

Sentry metrics are automatically enabled with `Sentry.init()` — no config changes needed. The work is deciding **where** to emit metrics that provide actionable insight.

### What to Add

**`src/utils/sentry.ts`** — Export a thin metrics helper:

```typescript
export const metrics = {
  count: (name: string, value?: number, tags?: Record<string, string>) => 
    Sentry.metrics.count(name, value ?? 1, { tags }),
  gauge: (name: string, value: number, tags?: Record<string, string>) => 
    Sentry.metrics.gauge(name, value, { tags }),
  distribution: (name: string, value: number, tags?: Record<string, string>) => 
    Sentry.metrics.distribution(name, value, { tags }),
};
```

**Instrument key user flows** (lightweight, ~1 line each):

| Metric | Type | Location | Purpose |
|---|---|---|---|
| `page_view` | count | `AppContent` (existing `useEffect`) | Track page views with route tag |
| `query_error` | count | `QueryClient.onError` callback | Count failed API queries |
| `page_load_time` | distribution | `AppContent` via `performance.now()` | Measure route transition speed |

### Files Changed
- `src/utils/sentry.ts` — add metrics export (~10 lines)
- `src/App.tsx` — add 3 metric calls in existing hooks/config

No new dependencies. Metrics only fire in production (guarded by existing `import.meta.env.PROD` checks in the Sentry client).

