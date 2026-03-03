

## Add Sentry Browser Tracing Integration

### Current State
Your Sentry config intentionally sets `integrations: []` to reduce TTI impact. However, this means `tracesSampleRate: 0.1` is configured but has no effect — there's no tracing integration to use it.

### What to Change

**`src/utils/sentry.ts`** — Add `browserTracingIntegration` lazily (same pattern as replay):

1. Keep `integrations: []` on initial load (preserves your TTI optimization)
2. Add `browserTracingIntegration()` lazily alongside replay in the post-TTI idle callback
3. Add `tracePropagationTargets` to scope tracing to your Supabase API domain only (avoids CORS issues)

```text
Current flow:
  init() → empty integrations → idle → add replay

New flow:
  init() → empty integrations → idle → add replay + browserTracing
```

### Specifics
- Add `tracePropagationTargets: ["localhost", /^https:\/\/wcitdamvochthvxvtxyb\.supabase\.co/]` to the `Sentry.init()` config
- In `addReplayIntegration` (rename to `addLazyIntegrations`), also add `Sentry.browserTracingIntegration()`
- Keep `tracesSampleRate: 0.1` (10% sampling is appropriate for production)

One file changed, ~5 lines added.

