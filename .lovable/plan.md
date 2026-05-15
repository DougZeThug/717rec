## Phase A — Edge Function Config Hygiene

Single, low-risk edit to `supabase/config.toml`. No code changes, no migrations, no behavior changes for end users.

### Goal

Make every edge function's auth posture **explicit** in `config.toml` and remove the stale orphan entry. This eliminates the highest-signal ambiguity from the audit (the `send-support-email` 401 risk) before touching any function code.

### Changes to `supabase/config.toml`

1. **Add explicit block** for `send-support-email` → `verify_jwt = false`
   - Public contact form; anonymous users must be able to submit.
   - Function already has honeypot + rate-limit + Zod validation in code.

2. **Add explicit block** for `update_team_stats` → `verify_jwt = true`
   - Admin-only; function already calls `auth.getUser()` + checks `profiles.is_admin`.
   - Note: the frontend currently calls the **Postgres RPC** of the same name, not this edge function. The edge function appears orphaned but we are NOT deleting it in Phase A — only locking down its auth posture.

3. **Remove stale block** for `analyze-team`
   - No source code exists at `supabase/functions/analyze-team/`. Config entry is dead.

4. **Leave unchanged**:
   - `[functions.create-bracket] verify_jwt = true` — already correct.
   - `[functions.capture-power-snapshots] verify_jwt = false` — already correct (secret-gated cron).

### Resulting `config.toml` functions section

```toml
[functions.create-bracket]
verify_jwt = true

[functions.capture-power-snapshots]
verify_jwt = false

[functions.send-support-email]
verify_jwt = false

[functions.update_team_stats]
verify_jwt = true
```

### Files changed

- `supabase/config.toml` (only file)

### Verification after apply

1. `npm run typecheck` — sanity (no TS impact expected).
2. `npm run test:file -- src/services/support/__tests__/ContactService.test.ts` — confirms support-email service contract still holds.
3. **Manual smoke test** in preview: submit the contact form as a logged-out user → expect success, not 401.
4. Confirm the Supabase Functions dashboard shows the new `verify_jwt` values for `send-support-email` and `update_team_stats` after redeploy.

### Out of scope (deferred to later phases)

- Deleting the orphaned `create-bracket` and `update_team_stats` edge functions (Phase A+ decision).
- Adding a shared `requireAdmin` helper under `supabase/functions/_shared/` (Phase B).
- Hardening `send-support-email` rate-limit beyond per-worker memory (Phase B).
- DB indexes, RLS audit, test coverage (Phases 2–4).

### Risks

- **send-support-email**: None — making the implicit Lovable default explicit. If anything, this *fixes* a latent 401 risk.
- **update_team_stats**: None for users — the frontend doesn't call this edge function today. Lock-down is defensive.
- **analyze-team removal**: None — config points at non-existent code.
