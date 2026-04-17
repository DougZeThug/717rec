

## Plan: Address JWT-disabled edge functions advisory

### Audit
Two functions in `supabase/config.toml` have `verify_jwt = false`:

1. **`capture-power-snapshots`** — cron-triggered weekly snapshot job.
   - Already has machine-to-machine protection: validates `CRON_WEBHOOK_SECRET` via `Authorization: Bearer <secret>` header (see `mem://security/edge-function-webhook-secret-authentication`).
   - Returns 401 on missing/invalid secret. Returns 500 if secret unconfigured.
   - **Verdict: SAFE as-is.** Compelling machine-to-machine reason (cron). Cannot use JWT — cron jobs don't carry user JWTs.

2. **`send-support-email`** — public contact form submission.
   - Currently **no auth, no rate limiting, no signature verification.**
   - Has input length validation + HTML escaping (good), but anyone can spam the endpoint → spams `admin@717rec.com` inbox + burns Resend quota + writes unbounded rows to `support_tickets`.
   - **Verdict: NEEDS HARDENING.**

### Changes

**1. `send-support-email/index.ts`** — add two protections:

- **IP-based rate limit** (in-handler, no infra needed): track recent submissions per IP in a small in-memory `Map` with timestamp eviction. Limit: **3 submissions per IP per 10 minutes**. Returns 429 on excess. In-memory is fine for a single edge worker; brief restart resets are acceptable for a contact form.
- **Honeypot field**: accept an optional `website` field in the request body — if present and non-empty, silently return success (bots fill hidden fields, humans don't). Zero UX impact since the real form won't include it.
- **Basic content sanity**: reject messages containing >5 URLs (common spam signature). Returns 400.

**2. `ContactService.ts`** — no change needed; honeypot is optional and form already omits it.

**3. `capture-power-snapshots`** — document, don't change.
   - Add a code comment at the top explaining why `verify_jwt = false` is intentional (cron + webhook secret), so the next audit doesn't re-flag it.

**4. `supabase/config.toml`** — leave both `verify_jwt = false` entries as-is (both have justified reasons now).

**5. Mark the security finding as fixed** with explanation citing the rate limit + honeypot + URL-spam guard for the public function and webhook-secret auth for the cron function.

### Files touched
- `supabase/functions/send-support-email/index.ts` — add rate limit + honeypot + URL guard
- `supabase/functions/capture-power-snapshots/index.ts` — add justification comment
- Security finding: mark as fixed via `security--manage_security_finding`

### What does NOT change
- No new tables, no migrations.
- No client-side changes.
- No JWT enforcement added (would break cron + public contact form).
- Existing input length validation, HTML escaping, and CORS untouched.

### Verification
- `npx tsc --noEmit` passes (Deno files are excluded from tsc anyway).
- Manual: submit contact form 4× rapidly → 4th returns 429.
- Manual: submit with `website: "spam"` field → returns success but no email sent.
- Cron job continues to work (untouched auth flow).

### Rollback
Revert the two edge function files. One-step.

