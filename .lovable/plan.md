## Phase 1C — Public edge function hardening

### Inventory of public functions

Only **two** edge functions remain public:

1. `send-support-email` — anonymous contact form. Already has CORS allowlist, honeypot, in-memory rate limit (3/IP/10min), required-field check, length caps, URL-spam check, HTML escaping.
2. `capture-power-snapshots` — cron webhook, gated by `CRON_WEBHOOK_SECRET` bearer token. Not user-facing; out of scope for input-validation hardening (no user payload).

So all real work targets `send-support-email`.

### Gaps vs. the Phase 1C checklist

| Requirement | Current state | Action |
|---|---|---|
| Required fields | ✅ present | keep |
| Trimmed strings | ❌ no `.trim()` — whitespace-only passes | add via Zod |
| Length limits | ✅ present, but post-validation | move into Zod |
| Email format | ❌ not validated | add Zod `.email()` |
| Reject unknown shapes | ❌ extra fields silently accepted | Zod `.strict()` |
| Centralised validation | ❌ ad-hoc | Zod schema |
| Subject allowlist | ❌ any string accepted | Zod `z.enum([...SUBJECT_KEYS])` |
| Rate limit | ⚠️ in-memory per worker — resets on cold start, not shared across isolates | replace with Postgres-backed throttle |
| 400 / 429 responses | ✅ present | keep, add 401/403 N/A (public) |
| Tests | ❌ none for the function | add Deno tests |

### Note on rate limiting

Project guidance says the backend has no established rate-limit primitives. The user explicitly asked for one in Phase 1C, so per the override clause we will add a minimal Postgres-backed throttle table specifically for this endpoint. It is intentionally simple and ad-hoc. We keep the existing in-memory limiter as a fast first gate, and add the DB throttle as the durable cross-isolate limit.

### Plan

**1. Add Zod validation to `send-support-email`**

Replace the manual checks (lines 118–151) with:

```ts
const SUBJECT_KEYS = ['bug_report','feature_request','account_issue',
                      'score_dispute','general_question','other'] as const;

const SupportSchema = z.object({
  name:    z.string().trim().min(1).max(100),
  email:   z.string().trim().email().max(255),
  subject: z.enum(SUBJECT_KEYS),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(500).optional(), // honeypot
}).strict();
```

- On `safeParse` failure → `400` with `{ error: 'Invalid request', issues: parsed.error.flatten().fieldErrors }`.
- Honeypot check stays (silent 200).
- URL-spam check stays.
- Use the parsed/trimmed values downstream (so DB row stores trimmed text).

**2. Add a durable rate-limit table**

New migration creates:

```sql
CREATE TABLE public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_events_lookup_idx
  ON public.rate_limit_events (endpoint, ip_hash, created_at DESC);
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies → only service role can read/write. RLS denies everyone else.
```

And an RPC for cheap atomic check-and-record:

```sql
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _endpoint text, _ip_hash text, _window_seconds int, _max_hits int
) RETURNS boolean -- true = allowed, false = limited
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE hits int;
BEGIN
  DELETE FROM public.rate_limit_events
   WHERE created_at < now() - interval '1 day';        -- opportunistic GC
  SELECT count(*) INTO hits
    FROM public.rate_limit_events
   WHERE endpoint = _endpoint AND ip_hash = _ip_hash
     AND created_at > now() - make_interval(secs => _window_seconds);
  IF hits >= _max_hits THEN RETURN false; END IF;
  INSERT INTO public.rate_limit_events(endpoint, ip_hash) VALUES (_endpoint, _ip_hash);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text,text,int,int) FROM public, anon, authenticated;
```

Edge function calls it via the existing service-role Supabase client. IP is hashed (SHA-256, hex) before sending — we never store raw IPs. Limits: 5 requests / 10 min / IP+endpoint. Falls back to allow-and-log on RPC error so DB hiccups don't break the contact form.

**3. New shared helper `supabase/functions/_shared/rateLimit.ts`**

Tiny module exporting `hashIp(ip)` and `checkRateLimit(client, endpoint, ipHash, windowSec, max)`. Reusable for any future public function.

**4. Drop the in-memory limiter** in favour of the DB one (single source of truth, no surprises across isolates). Keep `getClientIp`.

**5. Tests** — `supabase/functions/send-support-email/index.test.ts` (Deno):

- malformed JSON → 400
- missing required field → 400
- invalid email → 400
- subject not in allowlist → 400
- field too long → 400
- unknown extra field → 400 (`.strict()`)
- honeypot filled → 200 silent
- valid payload → 200
- 6th valid call within window → 429

Tests stub the Supabase client and Resend `fetch` so they run offline. Loaded via `dotenv` per project convention.

**6. No frontend changes.** The Zod schema in `src/services/support/ContactService.ts` already mirrors the new server schema; existing tests stay green.

### Out of scope

- Touching `capture-power-snapshots` (no user payload, secret-gated).
- Auth/JWT changes (Phase 1B was a no-op).
- CAPTCHA — not configured in the project.
- Logging redaction beyond what already exists (we still don't log raw message bodies; only IPs in warnings, which we'll switch to the hash).

### Files to change

- new `supabase/migrations/<ts>_rate_limit_events.sql`
- new `supabase/functions/_shared/rateLimit.ts`
- edit `supabase/functions/send-support-email/index.ts`
- new `supabase/functions/send-support-email/index.test.ts`

### Verification

- `supabase--test_edge_functions` for the new Deno tests
- `supabase--curl_edge_functions` smoke: invalid email → 400, valid → 200, 6× rapid → 429
- `npm run typecheck` (no frontend changes expected to fail)
