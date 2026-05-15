## Phase B — `send-support-email` Hardening

Low-risk, single-function change plus expanded service tests. No DB migrations, no client behavior change.

### 1. Tighten CORS — `supabase/functions/send-support-email/index.ts`

Replace wildcard `Access-Control-Allow-Origin: *` with an explicit allowlist:

```
- https://717rec.app
- https://717rec.lovable.app
- https://id-preview--71485458-eece-4db2-a818-0dbc3e38e42e.lovable.app
- http://localhost:3000  (dev)
- http://localhost:5173  (vite dev)
```

Implementation:
- Keep a `const ALLOWED_ORIGINS = new Set([...])`.
- Build `corsHeaders` per-request from `req.headers.get('origin')`. If the origin matches, echo it back; otherwise omit `Access-Control-Allow-Origin` (browser will block, server-to-server still works).
- Add `Vary: Origin` to every response.
- Apply on **all** response paths (preflight, rate-limit, honeypot, validation errors, success, catch).

### 2. Skip DB-backed rate limit (defer)

The plan says "optionally swap in-memory rate limit for DB-backed counter." Recommend **deferring** this:
- The current per-worker map is acceptable for a low-volume contact form on a prototype.
- DB-backed counter requires a new table + migration + write-on-every-request, which is more risk than the audit warrants in Phase B.
- Honeypot + URL-spam filter + Resend's own throttling already cover the realistic abuse vectors.

If you'd rather do it now, say so and I'll add a `support_rate_limits` table to the plan.

### 3. Expand `src/services/support/__tests__/ContactService.test.ts`

Add cases (existing happy-path tests stay):

- **honeypot forwarded** — already covered; keep.
- **rate-limit (429)** — mock `invoke` to resolve with `{ error: { status: 429, message: 'Too many requests' } }`; assert `submitContactRequest` throws a `DatabaseError` whose message includes "Too many requests".
- **invalid email — schema level** — `contactSchema.safeParse({...email:'not-an-email'})` returns `success: false` with field error on `email`.
- **invalid email — server rejection** — mock `invoke` to resolve with `{ error: { message: 'Invalid email' } }`; assert throws `DatabaseError`.
- **server 400 generic** — mock `invoke` with `{ error: { message: 'All fields are required' } }`; assert throws.

These mirror the edge function's actual response shapes so the service contract stays honest.

### 4. Verification (run after applying)

```bash
npm run lint
npm run typecheck
npm run test:file -- src/services/support/__tests__/ContactService.test.ts
```

Edge-function smoke (via `supabase--curl_edge_functions`):
- `POST /send-support-email` with `website: "spam"` → expect 200, no email sent (check function logs for `Honeypot triggered`).
- `POST /send-support-email` valid payload → expect 200, Resend log line.
- Preflight `OPTIONS` from disallowed origin → expect no `Access-Control-Allow-Origin` header.
- Preflight `OPTIONS` from `https://717rec.app` → expect echoed origin.
- Cross-function sanity (already covered by Phase A but worth re-running):
  - `POST /create-bracket` no auth → 401.
  - `POST /update_team_stats` non-admin → 403.

### Files touched

- `supabase/functions/send-support-email/index.ts` (CORS allowlist only)
- `src/services/support/__tests__/ContactService.test.ts` (3 new test cases)

### Risks

- **CORS allowlist**: if the published custom domain ever changes, the contact form breaks until the allowlist is updated. Mitigation: include both `717rec.app` and `*.lovable.app` preview/published URLs explicitly; document the list inline in the function.
- **Test additions**: zero runtime risk — pure unit tests against a mocked `supabase.functions.invoke`.

### Out of scope (deferred)

- DB-backed rate limit table.
- Deleting orphaned `update_team_stats` edge function.
- Shared `_shared/cors.ts` helper (would touch other functions; keep Phase B to one function).
