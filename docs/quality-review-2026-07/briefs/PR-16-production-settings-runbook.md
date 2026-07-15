# PR-16 — Production settings runbook + league-night operations guide

**Phase:** 6 (Polish & growth) · **Tier:** 3 · **Agent:** Claude Code (docs) + **Doug manual (all dashboard settings)** · **Parallelizable:** yes, anytime · **Depends on:** nothing · **Expected score impact:** +0.6 overall (Production readiness +6, Security +1)

## 1. Background

Several production-critical switches live **outside the repo**, in the Supabase and hosting dashboards, where no review or CI can see them. The 2026-07-15 review (like the prior one) could not verify: whether email confirmations are enabled for signups, whether leaked-password protection is on, database backup schedule/retention, custom SMTP, auth rate limits, and Site URL / redirect allowlists. The repo's own docs (`docs/SECRETS.md`, `docs/OPERATIONS.md`, `docs/RELEASE_AND_DEPLOYMENT.md`) cover secrets and deploys but not a checked settings baseline. For a one-admin league app, the risk is not sophisticated attackers — it's a quiet misconfiguration (e.g. confirmations off → anyone can register with a fake email; no backups → one bad reconcile loses the season).

## 2. Objective

Every production dashboard setting that matters has a documented expected value, a verified-on date, and a league-night "what to do when X breaks" playbook.

## 3. Exact scope

Documentation + Doug's dashboard actions. Zero code.

## 4. Files to modify / create

- `docs/PRODUCTION_SETTINGS.md` (new — the runbook below)
- `docs/OPERATIONS.md` (link to it; add league-night playbook section)

## 5. Implementation steps

1. Create `docs/PRODUCTION_SETTINGS.md` with a table: *setting · where · expected value · why · last verified (date + initials)*. Rows at minimum:
   - Auth → Email: **Confirm email = ON**; Secure email change = ON.
   - Auth → Passwords: minimum length ≥ 8; **leaked-password protection (HaveIBeenPwned) = ON**.
   - Auth → Rate limits: confirm defaults are active (sign-in, OTP, verifications) — record actual numbers.
   - Auth → URL configuration: Site URL = production domain; Redirect URLs contain only production + local dev.
   - Database → Backups: daily backups ON; note retention; record how to restore (PITR availability by plan).
   - Edge functions secrets set: `CRON_WEBHOOK_SECRET`, `RESEND_API_KEY` (or equivalent), service keys — names only, never values.
   - API → exposed schemas = public only; RLS "enforced for all tables" spot-check.
   - Hosting (Lovable/custom domain): HTTPS enforced, custom domain status.
2. Doug walks the dashboards once, sets each to the expected value, and fills the "last verified" column.
3. Add "League night playbook" to `docs/OPERATIONS.md`: score won't submit → check pending submissions + rate-limit note; standings look wrong → run the drift check (PR-05); site down → hosting status + Supabase status pages; who to contact.
4. Set a quarterly recurring reminder (calendar or a Claude Routine) to re-verify and re-date the table.

## 6. Database requirements

None (backup settings are dashboard-level).

## 7. UI/UX requirements

None.

## 8. Testing requirements

None automated (that's the point of documenting the unautomatable). Optional: a signup probe with a throwaway email to confirm the confirmation-email flow behaves as documented.

## 9. Validation commands

```bash
npm run lint  # docs-only; markdown link check if configured
```

## 10. Manual verification checklist (Doug)

- [ ] Every row in `PRODUCTION_SETTINGS.md` has a real "last verified" date filled by you.
- [ ] Test signup with a fresh email → confirmation email arrives → account unusable until confirmed.
- [ ] Backups page shows a recent successful backup.
- [ ] You know where the restore button is *before* you need it.

## 11. Acceptance criteria

- `docs/PRODUCTION_SETTINGS.md` merged with all rows dated within the last 30 days.
- League-night playbook section exists and fits on one screen.

## 12. Non-goals / rollback

- Non-goals: automating settings via Supabase Management API (worthwhile later; overkill now), changing auth flows in code.
- Rollback: n/a (docs only).
