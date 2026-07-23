# Production Settings Baseline

Audience: Doug, once a quarter (and once during any incident where you suspect a
switch got flipped). Plain language.

**Why this file exists.** A handful of production-critical switches live *outside
the repo* — in the Supabase Dashboard, Lovable, Cloudflare, and the domain
registrar. No pull request, test, or CI job can see them, so nothing else can
tell you whether they're set correctly. This file is the checked baseline: for
each setting, the value it **should** be, **why**, and the **date you last laid
eyes on it**. If the dashboard ever disagrees with a row here, one of the two is
wrong — fix it and re-date the row.

**How to use it.** When you touch a setting, update its **Last verified** cell
with the date and your initials. The verification checklist at the bottom walks
you through all of them in one sitting.

**Companion docs:**
- [`OPERATIONS.md`](OPERATIONS.md) — the league-night "what do I do when X breaks"
  playbook, recovery steps, and the merge gate. This file is the *settings*; that
  file is the *actions*.
- [`SECRETS.md`](SECRETS.md) — which env vars exist and how to rotate them.
- [`RELEASE_AND_DEPLOYMENT.md`](RELEASE_AND_DEPLOYMENT.md) — version bumps, publish, rollback.

**Initials used below:** `DW` = Doug Weidensaul. A cell reading **_needs DW_**
has never been verified against the live dashboard — that's a to-do, not a pass.

> **Note on dates.** The expected values below are drawn from the repo (e.g.
> `supabase/config.toml`, the edge-function code) and are trustworthy as
> *intentions*. The **Last verified** column is different: it can only be filled
> by a human who actually opened the dashboard and looked. A coding agent cannot
> verify a dashboard toggle, so those cells stay **_needs DW_** until Doug walks
> the checklist.

---

## 1. Supabase Auth

Dashboard → **Authentication**. Project: `wcitdamvochthvxvtxyb`.

### 1a. Sign-in / sign-up

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Email confirmations on signup | Authentication → Sign In / Up → Email | **OFF** | **Deliberate policy, not an oversight.** Internal rec-league app used by trusted team members — email deliverability isn't part of the security model, and the extra click hurts signup completion more than it helps. Must match `supabase/config.toml` (`enable_confirmations = false`, line 17). **If this policy ever changes to ON, flip `config.toml` and this row in the same PR** so repo and dashboard never disagree. | _needs DW_ |
| Secure email change | Authentication → Sign In / Up → Email | **ON** | Requires confirmation on *both* the old and new address before an account's email is changed. Cheap protection against an account being quietly re-pointed. On regardless of the confirmations policy above. | _needs DW_ |
| Allow new users to sign up | Authentication → Sign In / Up | **ON** | Players self-register. Matches `config.toml` (`enable_signup = true`). | _needs DW_ |

### 1b. Passwords

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Minimum password length | Authentication → Sign In / Up → Passwords | **≥ 8** | Floor against trivially guessable passwords. 8 is the Supabase default; do not lower it. | _needs DW_ |
| Leaked-password protection | Authentication → Attack Protection | **ON** | Rejects passwords found in known breach corpora (HaveIBeenPwned). Free, and the only UX cost is the occasional "pick another password." | _needs DW_ |

### 1c. Rate limits

Record the **actual numbers** shown in the dashboard the day you verify — Supabase
tunes defaults over time, so "defaults" is not a value, the number is.

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Sign-in / sign-up attempts | Authentication → Rate Limits | Defaults active — record the number → **____** | Throttles credential-stuffing. Defaults are fine for our traffic; just confirm they're not disabled. | _needs DW_ |
| Token / OTP verifications | Authentication → Rate Limits | Defaults active — record → **____** | Same idea for the verify endpoints. | _needs DW_ |
| Email sends (per hour) | Authentication → Rate Limits | Defaults active — record → **____** | Caps outbound auth email so a loop can't burn the quota. Relevant to §1f (SMTP). | _needs DW_ |

> **Not the same as the score-report rate limit.** The public score-submission
> form has its *own* app-level limit — **5 submissions per 10 minutes per IP**,
> returning HTTP 429 — enforced in code (`supabase/functions/submit-score-report/index.ts`),
> not in this dashboard. See the "score won't submit" entry in
> [`OPERATIONS.md` §2](OPERATIONS.md#2-league-night-playbook).

### 1d. Multi-factor authentication

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| MFA (TOTP) provider | Authentication → Multi-Factor Authentication | **ON (optional for users)** | Not required for players, but leaving the provider enabled lets admins (Doug + anyone with `is_admin = true`) opt into an authenticator app. | _needs DW_ |

### 1e. URL configuration

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Site URL | Authentication → URL Configuration | `https://717rec.app` | The default redirect target for auth emails. Must be the production domain. | _needs DW_ |
| Redirect allowlist | Authentication → URL Configuration | `https://717rec.app`, `https://717rec.lovable.app`, any preview domain in active use, **and** local dev (`http://localhost:8080`, the Vite dev port) | Sign-in magic links and password resets **fail silently** if the return URL isn't on this list. | _needs DW_ |

> ⚠️ **Do not prune the `lovable.app` / staging entries without migrating first.**
> Login, magic-link, and password-reset redirects break on *any deployed surface*
> you remove from this list, and they break quietly — no error, the link just
> doesn't work. Remove an entry only after you're sure nothing uses it.

### 1f. Email sending (SMTP)

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Custom SMTP | Authentication → Emails → SMTP Settings | Record which: **custom SMTP** (note provider + sender address) **or** Supabase's built-in sender | Supabase's built-in sender is rate-limited and best-effort — fine for our volume, but you must *know* which one is live so an undelivered reset email isn't a surprise. | _needs DW_ |
| Live test-send result | (manual) | Delivered / spam / failed + date | The only real proof email works. Trigger a password reset to a throwaway address and record where it landed. Closes the long-standing "custom SMTP unverified" gap from the quality review. | _needs DW_ |

---

## 2. Supabase Database — backups & recovery

Dashboard → **Database → Backups**. The step-by-step *restore* procedure lives in
[`OPERATIONS.md` §3a](OPERATIONS.md#3-recovery-basics) — read it before you need it.

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Daily backups | Database → Backups | Enabled; retention noted here → **____ days** | Non-negotiable. One bad reconcile or import can lose a season. Free plan gives 7 days of daily backups; paid plans give more. Write the real retention in the blank. | _needs DW_ |
| Point-in-time recovery (PITR) | Database → Backups | Noted: **on** / **off** (paid plan only) | If PITR is off, the recovery point is "last night's backup." Document it so nobody is surprised about how much data a restore would drop. | _needs DW_ |
| Restore button located | Database → Backups | You've *seen* where **Restore** is | Finding the button for the first time mid-incident is how mistakes happen. | _needs DW_ |

---

## 3. Supabase API

Dashboard → **Project Settings → API** (and the SQL editor for the RLS check).

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Exposed schemas | Project Settings → API → Exposed schemas | **`public`** (plus `graphql_public`) only — no `auth`, `storage`, or internal schemas | Anything on this list is reachable through the public REST/GraphQL API. Must match `supabase/config.toml` (`schemas = ["public", "graphql_public"]`, line 6). | _needs DW_ |
| RLS enforced for all tables | SQL editor (spot-check) | Every table in `public` has `rowsecurity = true` | RLS is the entire access-control model for the browser (anon) key — a table without it is world-readable. See [`RLS_NOTES.md`](RLS_NOTES.md). | _needs DW_ |

**RLS spot-check query** (run in the SQL editor; expected result: **zero rows**):

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

Any row is a table with RLS switched off — investigate before doing anything else.

---

## 4. Edge function secrets

Dashboard → **Edge Functions → Secrets**. **Names only below — never paste a
secret value into this file or any file in the repo.** This mirrors every
`Deno.env.get(...)` key across `supabase/functions/`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
auto-provided by the platform — you don't set them, but they must be present.

| Secret | Used by | Required? | Where to set | Notes | Last verified |
|---|---|---|---|---|---|
| `SUPABASE_URL` | all functions, `_shared/auth.ts` | yes (auto) | platform-provided | — | _needs DW_ |
| `SUPABASE_ANON_KEY` | `_shared/auth.ts` | yes (auto) | platform-provided | — | _needs DW_ |
| `SUPABASE_SERVICE_ROLE_KEY` | all functions | yes (auto) | platform-provided | Bypasses RLS. Never expose in client code. See [`SECRETS.md`](SECRETS.md). | _needs DW_ |
| `CRON_WEBHOOK_SECRET` | `capture-power-snapshots` | **yes** | Edge Functions → Secrets | Function returns 500 (fails closed) if unset. The same value must be in the cron job header — see §5. | _needs DW_ |
| `RESEND_API_KEY` | `send-support-email` | yes if support email is used | Edge Functions → Secrets | Without it, support emails silently skip the send step. | _needs DW_ |
| `IP_HASH_SALT` | `_shared/rateLimit.ts` (score/contact submit) | recommended | Edge Functions → Secrets | Salts the hashed IP used for rate-limiting so it isn't trivially reversible. Unset = empty salt (rate limiting still works, hashes just weaker). PR-07 runbook item. | _needs DW_ |
| `TRUSTED_PROXY_COUNT` | `_shared/rateLimit.ts` | optional | Edge Functions → Secrets | How many proxy hops to trust when reading the client IP. Defaults to `1`. Only change if the real client IP is being mis-read. PR-07 runbook item. | _needs DW_ |

> **`ALLOWED_ORIGINS` is not a secret.** Each function hardcodes its own set in
> code (`submit-score-report`, `submit-contact-request`, `send-support-email`).
> To add a production domain, change the code and redeploy — don't go looking for
> a dashboard secret to edit.

---

## 5. Scheduled jobs (pg_cron)

Dashboard → **SQL editor** (`SELECT jobname, schedule FROM cron.job;`).

| Job | Cadence | Calls | Notes | Last verified |
|---|---|---|---|---|
| `weekly-power-score-snapshot-v2` → `capture-power-snapshots` | Weekly, Fridays 04:00 UTC (≈ Thursday late-evening ET) | `https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/capture-power-snapshots` | Header must be `Authorization: Bearer <CRON_WEBHOOK_SECRET>` (the function 401s anything else). The secret lives in Postgres Vault as `CRON_WEBHOOK_SECRET` and is read at execution time — **do NOT paste the raw value into a migration**. Manual test: `curl -X POST -H "Authorization: Bearer $CRON_WEBHOOK_SECRET" https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/capture-power-snapshots` should return `{"success":true,...}`. **Cleanup item:** an older duplicate `weekly-power-score-snapshot` (jobid 1) is owned by the dashboard `postgres` role and can only be removed from the SQL editor as that role: `SELECT cron.unschedule(1);`. It 401s harmlessly alongside v2 but should be removed. | 2026-07-15 (job present + manual invocation returned 200 / 27 snapshots) |

The in-app **Admin → League Night Status** tab shows the last snapshot's age and
flags it if it's older than 8 days — a fast way to notice this job silently
stopped without opening the SQL editor.

---

## 6. Hosting & DNS

| Setting | Where | Expected value | Why | Last verified |
|---|---|---|---|---|
| Custom domain | Lovable → Project → Settings → Domains | `717rec.app` (primary), `717rec.lovable.app` (staging) | See root `README.md`. | _needs DW_ |
| HTTPS enforced | Lovable / Cloudflare | **ON** (HTTP redirects to HTTPS) | Also backstopped in the app by an HSTS header (`Strict-Transport-Security` in `public/_headers`), which tells browsers to never use plain HTTP. | _needs DW_ |
| DNS records | Domain registrar | A `@` → `185.158.133.1`, A `www` → `185.158.133.1`, TXT `_lovable` verification | Lovable custom-domain requirement. | _needs DW_ |
| HTTP security headers | `public/_headers` (in the repo) | Served by the host on every response | Change via PR, not a dashboard. Guarded by `tests/securityHeaders.test.ts`. | _needs DW_ |

---

## 7. Monitoring (optional — note only)

The repo has hooks for Sentry (`src/utils/logger-types.ts` and lazy-loaded
tracking). If a Sentry project is ever connected, its DSN lives as a build/runtime
env var — record the var name here when adopted. No monitoring is currently
required to operate the league.

---

## 8. Verification checklist (Doug)

Do this once when adopting this doc, then re-check quarterly (see §9). Fill in each
**Last verified** cell above with the date + `DW` as you go.

- [ ] **§1a** Authentication → Sign In / Up: email confirmations = OFF; secure email change = ON.
- [ ] **§1b** Passwords: minimum length ≥ 8; leaked-password protection = ON.
- [ ] **§1c** Rate limits: sign-in, OTP, and email-send limits active — write the actual numbers in the blanks.
- [ ] **§1d** MFA: TOTP provider enabled.
- [ ] **§1e** URL Configuration: Site URL = `https://717rec.app`; redirect allowlist includes prod, staging, any live preview, and local dev.
- [ ] **§1f** SMTP: recorded custom-vs-built-in; sent a real password-reset to a throwaway address and noted delivered/spam/failed + date.
- [ ] **§2** Backups: daily backups on, retention written in; PITR on/off noted; you've located the Restore button.
- [ ] **§3** API: exposed schemas = `public` (+ `graphql_public`) only; RLS spot-check query returns zero rows.
- [ ] **§4** Edge Functions → Secrets: `CRON_WEBHOOK_SECRET` and `RESEND_API_KEY` present (record **presence** only, never values).
- [ ] **§5** SQL editor: `SELECT jobname, schedule FROM cron.job;` shows the `capture-power-snapshots` job at the expected cadence.
- [ ] **§6** Hosting: custom domain live, HTTPS enforced (visit `http://717rec.app` → it should redirect to `https://`).

Nothing here changes code. If a step surfaces a surprise, open an issue rather than
fixing it silently — future-you will thank present-you.

---

## 9. Re-verification cadence

Settings drift: a dashboard update flips a default, a plan change alters backup
retention, someone prunes a redirect URL. Re-walk §8 **once a quarter** and re-date
every row, plus any time you suspect a switch got changed.

Pick whichever reminder you'll actually see:
- a recurring quarterly calendar event ("Re-verify 717rec production settings"), or
- a quarterly **Claude Routine** that pings this session to re-run the §8 checklist
  with you.

*Baseline written 2026-07-23. First full dashboard verification: **_needs DW_**.*
