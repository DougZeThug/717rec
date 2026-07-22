# PR-07 — Edge-function hardening: stop silently losing support tickets; tighten validation and rate limiting

> **Resolution status:** Open — edge-function security remediation brief; not part of PR-15 docs-only scope.

**Phase:** 2 (Security & integrity) · **Tier:** 1 (item 1) / 2 (rest) · **Agent:** Claude Code or Codex (Deno + SQL) · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.8 overall (Reliability +3, Security +2)

## 1. Background

The four edge functions are broadly well designed (shared rate limiter, Zod validation, service-role scoped to intended tables, `capture-power-snapshots` verified fail-closed behind `CRON_WEBHOOK_SECRET`). Verified defects:

1. **Support tickets can vanish behind a 200.** `send-support-email/index.ts:169-178` inserts the ticket into `support_tickets` — **a table no migration creates** (verified: zero matches in `supabase/migrations/`, absent from generated types). The code's own comment says "Will silently noop if table is missing." If `RESEND_API_KEY` is unset or the email send fails, the function still returns `{ success: true, message: 'Ticket received' }` — the visitor believes the league got their message; it is gone.
2. **Zod/DB mismatch → 500 instead of 400.** `submit-contact-request/index.ts:37` marks `submitter_contact` optional while the DB column is NOT NULL — an omitted field turns into an opaque server error.
3. **Rate limiter keys on the first `X-Forwarded-For` hop and fails open** on RPC error (`_shared/rateLimit.ts`, used at `send-support-email/index.ts:85-89` and siblings). First-hop XFF is client-spoofable on append-style proxies; failing open means a DB hiccup disables all rate limiting.
4. Minor: IP "anonymization" is unsalted SHA-256 (reversible over IPv4 space — overstated privacy comment); the support-email `name` field permits control characters flowing into the email subject.

## 2. Objective

A submitted support/contact message is either durably stored or the sender sees an error — never silently lost; malformed input yields 400s; rate limiting can't be trivially spoofed or fail open.

## 3. Exact scope

Two edge functions + shared rateLimit module + one migration + Deno tests. No frontend changes.

## 4. Files to modify / create

- `supabase/migrations/<ts>_create_support_tickets.sql` (new — table + RLS: admin-only SELECT/UPDATE, no anon access; inserts happen via service role)
- `supabase/functions/send-support-email/index.ts`
- `supabase/functions/submit-contact-request/index.ts`
- `supabase/functions/_shared/rateLimit.ts`
- matching `*_test.ts` files

## 5. Implementation steps

1. Migration: create `support_tickets` (id, name, email, subject, message, status default 'new', created_at) with RLS enabled; admin-gated SELECT/UPDATE policies mirroring `score_submissions`; add it to the admin Contact Inbox query if desired (optional follow-up).
2. In `send-support-email`: make the insert **load-bearing** — check its error; if the store fails AND the email send fails, return 502 with a "please try again" message. Only return success when at least one durable outcome happened; include which one in the response body for the client toast.
3. In `submit-contact-request`: align Zod with the schema (`submitter_contact: z.string().min(1)` or make the column nullable — pick one; the review recommends requiring it since the league needs a way to reply).
4. `rateLimit.ts`: key on a **platform-trusted client IP, determined empirically — not on any client-controllable header position.** Neither end of `X-Forwarded-For` is trustworthy by assumption (clients can prepend fake entries, and the last entry is only meaningful if the platform's own proxy appended it), and `x-real-ip` is only safe if the platform guarantees it overwrites inbound values. First deploy a temporary debug echo (or log `Object.fromEntries(req.headers)`) on the E2E project and hit it from two networks to observe which header Supabase's edge runtime sets authoritatively; then parse using the trusted-proxy-count approach (take the value N-hops from the right, where N = the platform's proxy count) and document the choice in a code comment with the observed evidence. On RPC error **fail closed** for unauthenticated form endpoints (return 429 with retry-after) — a rare false-positive beats an open spam channel. Salt the IP hash with an env secret (`IP_HASH_SALT`).
5. Strip control characters/newlines from `name`/`subject` before building the email (defense-in-depth on header/subject injection).
6. Deno tests for each behavior (store-fails+email-fails → 502; missing contact → 400; XFF spoof uses last hop; RPC error → 429).

## 6. Database requirements

New table + policies must pass migration replay; add a smoke test asserting anon cannot SELECT from `support_tickets`.

## 7. UI/UX requirements

None required (the contact form already displays server errors); optionally surface "stored, email pending" copy.

## 8. Testing requirements

Deno tests as step 6 (they run in the existing `edge-function-tests` CI job); SQL smoke test for RLS on the new table.

## 9. Validation commands

```bash
deno test --allow-net --allow-env --allow-read --no-check supabase/functions/
npm run typecheck && npm run lint   # unaffected but keep the standard gate
```

## 10. Manual verification checklist (Doug)

- [ ] Set `IP_HASH_SALT` in Supabase edge function secrets.
- [ ] Send a test support message with `RESEND_API_KEY` temporarily removed → the message appears in `support_tickets` (SQL editor) and the site shows success ("received").
- [ ] Confirm the real email still arrives when the key is restored.

## 11. Acceptance criteria

- `support_tickets` exists in production; a support submission with email disabled is retrievable.
- Malformed contact submission → 400 with a field message, not 500.
- Deno tests green in CI.

## 12. Non-goals / rollback

- Non-goals: CAPTCHA, admin inbox UI for tickets (candidate follow-up), replacing Resend.
- Rollback: functions are individually revertable; the new table is additive and can stay.
