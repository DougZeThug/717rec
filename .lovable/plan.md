# PR-13 verification follow-up

## What I already verified (read-only)

- **Reconciliation query (§3b):** 0 drift rows on production data. Clean.
- **Cron job present:** `weekly-power-score-snapshot`, schedule `0 4 * * 5` (Thursday ~11pm–midnight ET). Matches the "Thursday night" cadence.
- **Secrets present:** `CRON_WEBHOOK_SECRET`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `LOVABLE_API_KEY`.

## Problems found

1. The scheduled cron sends `Authorization: Bearer <anon JWT>`, but `capture-power-snapshots/index.ts` requires `Authorization: Bearer ${CRON_WEBHOOK_SECRET}`. The function is almost certainly returning `401 Unauthorized` every Thursday — no recent invocation logs exist. Power-score snapshots have not been captured on schedule.
2. `docs/OPERATIONS.md` §1d incorrectly documents the header as `x-cron-secret`. The actual contract is `Authorization: Bearer <secret>`.
3. §1a asked us to choose a recommended value for email confirmations. You picked **OFF**.

## What I'll do

### 1. Fix the cron job (one migration)

Rewrite the scheduled command so it sends the correct auth header. The migration:

- Calls `cron.unschedule('weekly-power-score-snapshot')`.
- Re-registers it with the same name, same schedule (`0 4 * * 5`), same URL, but header set to `Authorization: Bearer <CRON_WEBHOOK_SECRET>` read from Supabase Vault at execution time (so the secret does not appear in the migration file).
- After it runs, I'll verify by:
  - Reading `cron.job` back to confirm the new command.
  - Manually invoking the edge function once via `curl_edge_functions` with the correct header to confirm 200 + a fresh row in the snapshots table.

If Vault lookup for `CRON_WEBHOOK_SECRET` isn't set up, fallback plan: I'll ask you to paste the secret value once so I can insert it into a `cron.job` command that only lives in `pg_cron` metadata (never checked into the repo). We won't put the raw secret in a migration file.

### 2. Fix `docs/OPERATIONS.md`

- §1d: change header reference from `x-cron-secret` to `Authorization: Bearer <CRON_WEBHOOK_SECRET>`. Update the sample `curl` accordingly.
- §1a: set the recommended value for "Email confirmations on signup" to **OFF** with a one-line rationale ("internal-league app, deliverability isn't a security assumption").
- Add a short "Verified 2026-07-15" note under §3b Reconciliation ("0 drift rows on prod") and §1c Cron ("job present; auth header corrected in migration <timestamp>").
- Leave the Auth (email confirmations state, leaked-password protection, MFA/TOTP, redirect URL allowlist) and Backups (schedule, retention, PITR) rows blank with a `Last verified: __` placeholder — those are yours to fill after the dashboard walk-through.

### 3. Prep for your dashboard walk-through

Give you a compact "click here → look for this → paste back to me" list for the five items I can't check from the sandbox:

```
Auth → Sign In / Up → Email confirmations         (expect: OFF)
Auth → Attack Protection → Leaked password        (expect: ON)
Auth → Multi-Factor Authentication → TOTP         (expect: Enabled)
Auth → URL Configuration                          (expect: prod + staging URLs listed)
Database → Backups                                (record: schedule, retention days, PITR on/off)
```

When you paste back what you see, I'll fill the dates into OPERATIONS.md in one edit.

## Order of operations

1. Migration to reschedule the cron with the correct header.
2. Manual curl test of the edge function; confirm a snapshot row was written.
3. Edit `docs/OPERATIONS.md` (header fix, §1a value, verified notes, blank Auth/Backups rows).
4. Hand you the dashboard checklist.

## Non-goals

- No changes to `capture-power-snapshots/index.ts` itself — its auth check is already correct.
- No changes to any other cron job, edge function, RLS, or app code.
- No secret values written into migration files or the repo.

## Rollback

- Cron: `cron.unschedule('weekly-power-score-snapshot')` then re-run the original scheduled command from this conversation's logs.
- Docs: revert `docs/OPERATIONS.md`.
