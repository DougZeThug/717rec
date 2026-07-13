# PR-13 — Production settings runbook + league-night operations guide (includes Doug's manual actions)

| | |
|---|---|
| **Phase** | 6 — Product polish and future improvements |
| **Tier** | 3 — Polish / growth |
| **Priority** | Low (but the embedded Doug-actions list is high value) |
| **Recommended agent** | Claude Code drafts the docs; **Doug performs the dashboard actions** |
| **Difficulty** | Low (docs) + 30 min of Doug clicking |
| **Risk** | Very low |
| **Expected score improvement** | +0.7 overall (Security 90→95, Production readiness +5) |
| **Parallel-safe?** | Yes |
| **Depends on** | Nothing |

## Background and problem statement

- Several production-critical settings live **only in the Supabase dashboard** and cannot be audited from the repo (this review could not verify them): email-confirmation on signup (`supabase/config.toml` has `enable_confirmations = false`, but that governs local dev), leaked-password protection, MFA settings, backup schedule/retention, and the `CRON_WEBHOOK_SECRET` + `ALLOWED_ORIGINS` env vars the edge functions depend on (`capture-power-snapshots` returns 500 if its secret is unset — fails closed, verified by code read — but nobody has written down that it must be set).
- There is no league-night runbook: if scoring breaks mid-evening, the recovery tools exist (`reopen_live_match`, admin corrections, mass entry) but the procedure lives in Doug's head.
- Status: **documentation gap, confirmed**; the dashboard settings themselves are **unverified** (could be fine already).

## Objective

A `docs/OPERATIONS.md` exists that (a) inventories every production setting outside the repo with its required value and why, (b) records the verified-current state after Doug walks the checklist once, and (c) gives a league-night incident playbook.

## Exact scope

1. New `docs/OPERATIONS.md` with three sections:
   - **Production settings inventory** (table: setting → where → required value → why → last verified date): auth email confirmations (decide: ON recommended — document the tradeoff for a rec-league audience), leaked-password protection ON, backup schedule + PITR status, edge function secrets (`CRON_WEBHOOK_SECRET`, `ALLOWED_ORIGINS`, SMTP/email creds for `send-support-email`), the cron schedule that calls `capture-power-snapshots`, custom domain/DNS, Sentry DSN environment.
   - **League-night playbook**: live scoring stuck → check realtime, use admin Live Corrections (`reopen_live_match`), fall back to mass score entry; wrong score approved → `mark_match_as_tie` then re-approve, or PR-02's resubmit; site down → Lovable/Cloudflare status, rollback = redeploy previous build; who to contact.
   - **Recovery basics**: how to restore from a Supabase backup; the standings reconciliation query (counters vs. recompute from `matches`) to run after any manual DB surgery — include the SQL inline.
2. **Doug's manual checklist** (embedded in the doc, performed once as part of this PR's "verification"): visit each dashboard setting, set to the documented value, fill in "last verified".
3. **Out of scope:** changing any code or config programmatically; adding monitoring services (note options only).

## Likely files affected

- New `docs/OPERATIONS.md`; a link from `README.md` (or from PR-12's rewritten README).

## Implementation instructions

1. Derive the inventory from the repo itself: grep edge functions for `Deno.env.get` (each hit is a required secret), read `supabase/config.toml`, `wrangler.toml`, `docs/SECRETS.md`, `docs/RELEASE_AND_DEPLOYMENT.md` — extend, don't duplicate, what SECRETS.md already covers.
2. Write the reconciliation SQL against the real schema (`teams` counters vs. aggregate over `matches` where `iscompleted`), tested on a fresh replay DB.
3. Keep it in plain language — the audience is Doug at 9pm on a Tuesday.

## Database requirements

None (the reconciliation query is read-only; include it as text).

## UI and UX requirements

None.

## Testing requirements

- The reconciliation query runs green on a fresh replay database (zero drift rows on clean data; author demonstrates it catches a manufactured drift row).
- Docs lint: links valid.

## Required validation commands

```bash
npm run build   # docs-only, but keep the gate habit
# reconciliation query smoke-run against fresh replay DB
```

## Manual verification checklist (for Doug — this IS the deliverable)

1. Supabase Dashboard → Authentication → Sign In / Up: set email confirmations per the doc's recommendation; record state.
2. Authentication → Attack protection: enable leaked-password protection; record.
3. Database → Backups: confirm schedule + note retention; record.
4. Edge Functions → Secrets: confirm `CRON_WEBHOOK_SECRET`, `ALLOWED_ORIGINS`, email creds exist; record (values stay secret — record presence only).
5. Confirm the cron job that calls `capture-power-snapshots` exists and its cadence; record.
6. Run the reconciliation query in the SQL editor; **expect zero rows**; record the date.

## Acceptance criteria

- [ ] `docs/OPERATIONS.md` exists with all three sections and no placeholder text.
- [ ] Every `Deno.env.get` key across all four edge functions appears in the inventory.
- [ ] Doug's checklist completed once with dates filled in.
- [ ] Reconciliation query demonstrated on the replay DB (catches manufactured drift, zero rows on clean data).

## Non-goals and guardrails

- No code changes; no new services; no secrets in the doc.

## Rollback

Docs only.

## Deliverables from the implementing agent

The doc; the tested reconciliation SQL with its demo output; the list of dashboard items awaiting Doug with exact click-paths.
