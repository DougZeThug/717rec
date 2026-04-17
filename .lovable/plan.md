

## Plan: Disable PII telemetry defaults in Sentry

### Why
`sendDefaultPii: true` in `src/utils/sentry.ts` enables automatic capture of IP addresses, cookies, and request headers. Per the medium-severity advisory, this should be off by default unless there's a documented need.

### What changes
**1 file edited**: `src/utils/sentry.ts`
- Change `sendDefaultPii: true` → `sendDefaultPii: false` (line 35)
- Add `beforeSend` scrubbing for query-string PII (auth tokens, emails, common token params) on `event.request.url` and `event.request.query_string`

### Scrubbing approach
Inside the existing `beforeSend` hook (already filters network noise), add a small step that:
- Strips known sensitive query params (`token`, `access_token`, `refresh_token`, `apikey`, `email`, `code`) from `event.request.url` and `event.request.query_string`
- Replaces values with `[Filtered]`

User IDs set explicitly via `setUser()` are intentional and remain — only *automatic* PII collection is disabled.

### Safety
- No runtime behavior change for users.
- Error reports still arrive in Sentry, just without IP/cookies/sensitive query params.
- Replay integration's own PII masking (default-on for inputs/text) is unaffected.
- Zero risk of breaking the build — type-safe single-property change + pure function addition.

### Steps
1. Flip `sendDefaultPii` to `false`.
2. Add query-string scrubber inside `beforeSend`.
3. Verify `npx tsc --noEmit` passes.

### Rollback
Revert the single file. One-step.

### Note on unrelated build errors
The 4 TypeScript build errors in the prompt (`BracketNormalizationService`, `BracketUpdateService`, `TeamMembershipService`, `errorHandler.test.ts`) are **pre-existing** and unrelated to this Sentry change. They appear to stem from the recent TypeScript 6.0.3 + supabase-js 2.103.3 bumps tightening type inference (`RejectExcessProperties`). I'm flagging them but **not fixing them in this plan** — that's a separate task. If you want, approve this plan first, then I'll plan a follow-up to fix those four type errors.

