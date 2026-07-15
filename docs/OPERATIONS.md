# Operations Runbook

Audience: Doug at 9pm on a Tuesday. Plain language. If something in here is out of date, fix it before you close the laptop.

Companion docs:
- [`SECRETS.md`](SECRETS.md) — which env vars exist and how to rotate them.
- [`RELEASE_AND_DEPLOYMENT.md`](RELEASE_AND_DEPLOYMENT.md) — version bumps, publish steps, rollback.
- [`E2E_REAL_BACKEND.md`](E2E_REAL_BACKEND.md) — real-backend end-to-end tests.

---

## 1. Production settings inventory

Everything below lives outside the repo (Supabase Dashboard, Lovable, Cloudflare, third-party services). It cannot be checked in CI, so it lives here. When you touch a row, update **Last verified**.

### 1a. Supabase Auth

| Setting | Where | Required value | Why | Last verified |
|---|---|---|---|---|
| Email confirmations on signup | Dashboard → Authentication → Sign In / Up → Email | **OFF** | Internal rec-league app used by trusted team members — email deliverability isn't part of the security model, and the extra click hurts signup completion more than it helps. Matches `supabase/config.toml` (`enable_confirmations = false`). | _fill me in_ |
| Leaked-password protection | Dashboard → Authentication → Attack protection | **ON** | Rejects passwords that appear in known breach corpora (HaveIBeenPwned). Free, zero UX cost beyond the occasional "pick another password". | _fill me in_ |
| MFA (TOTP) | Dashboard → Authentication → Multi-Factor Authentication | **ON (optional for users)** | Not required for players, but leave the provider enabled so admins (Doug + anyone else with `is_admin = true`) can opt in. | _fill me in_ |
| Site URL / redirect URLs | Dashboard → Authentication → URL Configuration | `https://717rec.app`, `https://717rec.lovable.app`, plus any preview domain in active use | Sign-in magic links and password resets fail silently if the redirect isn't on the allowlist. | _fill me in_ |

### 1b. Supabase Database — backups & recovery

| Setting | Where | Required value | Why | Last verified |
|---|---|---|---|---|
| Daily backups | Dashboard → Database → Backups | Enabled, retention noted here → **____ days** | Non-negotiable. Free plan gives 7 days of daily backups; paid plans give more. Write the actual retention in the blank. | _fill me in_ |
| Point-in-time recovery (PITR) | Dashboard → Database → Backups | Noted: **on** / **off** (paid plan only) | If PITR is off, the RPO is "last night". Document it so nobody is surprised mid-incident. | _fill me in_ |

### 1c. Edge function secrets

Every `Deno.env.get(...)` key across every function in `supabase/functions/`. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by the Supabase platform — you don't set them, but they must be present.

| Secret | Used by | Required? | Where to set | Notes | Last verified |
|---|---|---|---|---|---|
| `SUPABASE_URL` | all functions, `_shared/auth.ts` | yes (auto) | platform-provided | — | _fill me in_ |
| `SUPABASE_ANON_KEY` | `_shared/auth.ts` | yes (auto) | platform-provided | — | _fill me in_ |
| `SUPABASE_SERVICE_ROLE_KEY` | all functions | yes (auto) | platform-provided | Never expose in client code. See `SECRETS.md`. | _fill me in_ |
| `CRON_WEBHOOK_SECRET` | `capture-power-snapshots` | **yes** | Dashboard → Edge Functions → Secrets | Function returns 500 (fails closed) if unset. Same value must be pasted into the cron job header — see §1d. | _fill me in_ |
| `RESEND_API_KEY` | `send-support-email` | yes if support email is used | Dashboard → Edge Functions → Secrets | Without it, support emails silently no-op the send step. | _fill me in_ |

**`ALLOWED_ORIGINS` is not an env var.** Each function hardcodes its own set (`ALLOWED_ORIGINS = new Set<string>([...])` in `submit-score-report/index.ts`, `submit-contact-request/index.ts`, `send-support-email/index.ts`). If a new production domain is added, update the code and redeploy — do not go looking for a secret to change.

### 1d. Scheduled jobs (pg_cron)

| Job | Cadence | Calls | Notes | Last verified |
|---|---|---|---|---|
| `weekly-power-score-snapshot-v2` → `capture-power-snapshots` | Weekly, Fridays 04:00 UTC (= Thursday ~11pm–midnight ET) | `https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/capture-power-snapshots` | Header must be `Authorization: Bearer <CRON_WEBHOOK_SECRET>` (the function rejects anything else with 401). Secret is stored in Postgres Vault as `CRON_WEBHOOK_SECRET` and read by pg_cron at execution time — do NOT paste the raw value into a migration file. Verify with `SELECT jobname, schedule FROM cron.job;`. Manual test: `curl -X POST -H "Authorization: Bearer $CRON_WEBHOOK_SECRET" https://wcitdamvochthvxvtxyb.supabase.co/functions/v1/capture-power-snapshots` should return `{"success":true,...}`. **Known cleanup item:** an older duplicate `weekly-power-score-snapshot` (jobid 1) is owned by the dashboard `postgres` role and can only be removed from Dashboard → SQL editor as that role: `SELECT cron.unschedule(1);`. It fires alongside v2 and 401s harmlessly, but should be removed. | 2026-07-15 (job present + manual invocation returned 200 / 27 snapshots) |

### 1e. Hosting & DNS

| Setting | Where | Value | Why | Last verified |
|---|---|---|---|---|
| Custom domain | Lovable → Project → Settings → Domains | `717rec.app` (primary), `717rec.lovable.app` (staging) | See root `README.md`. | _fill me in_ |
| DNS records | Registrar | A `@` → `185.158.133.1`, A `www` → `185.158.133.1`, TXT `_lovable` verification | Lovable custom-domain requirement. | _fill me in_ |
| HTTP security headers | `public/_headers` | Served by Cloudflare | Change via PR, not dashboard. | _fill me in_ |

### 1f. Monitoring (optional, note only)

The repo has hooks for Sentry (`src/utils/logger-types.ts`, various lazy-loaded tracking). If a Sentry project is connected, its DSN lives as a build/runtime env var — record its name here when adopted. No monitoring is currently required to operate the league.

---

## 2. League-night playbook

Symptom-first. Skim the bold lines; drop into the sub-steps only when you're the one clicking.

### 2a. Live scoring is stuck (round won't advance, throws don't register)

1. **Refresh the scorer's browser once.** Realtime channels re-subscribe on mount; a stale WebSocket is the most common cause.
2. **Check Supabase Realtime status** — Dashboard → Project status. If red, wait; nothing on our side to do.
3. **Open Admin → Live Corrections for that match.** You can edit or delete any round, or use "Reopen match" (`reopen_live_match` RPC) if the match was accidentally finalized. State rolls back atomically.
4. **Last resort: Mass Score Entry.** Enter the final game scores manually. This bypasses live scoring entirely and reverses/re-applies stats.

### 2b. Wrong score was approved

1. In Admin → Match management, open the match.
2. Either: use **Mark as tie** (`mark_match_as_tie`) to zero it out, then re-approve the correct submission; or edit directly if you know the right numbers.
3. Standings and streaks recompute on the next query invalidation — usually within seconds. If not, hit refresh.

### 2c. A submitter reports a score dispute and it looks like a duplicate got swallowed

Dedupe key is `(match_id, md5(message), submitter_name)` — two different submitters with the same text are kept separately. If a genuine dupe from the same submitter needs to be re-opened, delete it from `score_submissions` in the SQL editor and ask them to re-submit.

### 2d. Site is down

1. **Is it just you?** Open `https://717rec.app` in an incognito window on cellular.
2. **Lovable status:** https://status.lovable.dev
3. **Cloudflare status:** https://www.cloudflarestatus.com
4. **Rollback:** if a recent publish broke things, follow `RELEASE_AND_DEPLOYMENT.md` → Rollback → Option A (redeploy previous tag from Lovable). Two clicks.

### 2e. Who to contact

- Lovable support: in-app chat, or support@lovable.dev
- Supabase support: dashboard → Help
- Doug: you're reading this

---

## 3. Recovery basics

### 3a. Restoring from a Supabase backup

1. Dashboard → Database → Backups.
2. Pick the most recent backup **before** the incident (or the PITR timestamp).
3. Click **Restore**. Supabase restores to a new database; you then swap it in. **This takes minutes to an hour.** Don't do it casually.
4. After restore, run the reconciliation query in §3b and record the result.

### 3b. Standings reconciliation query

Run any time you've done manual DB surgery, a restore, or a bulk import. Expected result on a clean database: **zero rows**. Any rows mean the `teams.wins / losses / game_wins / game_losses` counters have drifted from the underlying `matches` data (regular season only — playoff matches carry a `bracket_id` and are excluded).

```sql
WITH agg AS (
  SELECT t.id,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.winner_id = t.id THEN 1 ELSE 0 END), 0) AS wins,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.loser_id  = t.id THEN 1 ELSE 0 END), 0) AS losses,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.team1_id = t.id THEN m.team1_game_wins
                      WHEN m.iscompleted AND m.team2_id = t.id THEN m.team2_game_wins
                      ELSE 0 END), 0) AS game_wins,
    COALESCE(SUM(CASE WHEN m.iscompleted AND m.team1_id = t.id THEN m.team2_game_wins
                      WHEN m.iscompleted AND m.team2_id = t.id THEN m.team1_game_wins
                      ELSE 0 END), 0) AS game_losses
  FROM teams t
  LEFT JOIN matches m
    ON (m.team1_id = t.id OR m.team2_id = t.id)
   AND m.bracket_id IS NULL
  GROUP BY t.id
)
SELECT t.id, t.name,
  t.wins        AS stored_w,  agg.wins        AS calc_w,
  t.losses      AS stored_l,  agg.losses      AS calc_l,
  t.game_wins   AS stored_gw, agg.game_wins   AS calc_gw,
  t.game_losses AS stored_gl, agg.game_losses AS calc_gl
FROM teams t
JOIN agg ON agg.id = t.id
WHERE t.wins        <> agg.wins
   OR t.losses      <> agg.losses
   OR t.game_wins   <> agg.game_wins
   OR t.game_losses <> agg.game_losses;
```

**Demonstrated output:** run against the production DB on 2026-07-15 returned `[]` (zero drift rows — re-verified during PR-13 walk-through). Manufactured-drift check: `UPDATE teams SET wins = wins + 1 WHERE id = '<any-id>'` in a scratch DB produces exactly one row with `stored_w = calc_w + 1`; roll it back with the reverse update.

If drift is found, the fix is a targeted `UPDATE teams SET wins = <calc>, losses = <calc>, game_wins = <calc>, game_losses = <calc> WHERE id = '<id>';` per drifted row. Verify by re-running the query — expect zero rows.

---

## 4. Doug's one-time verification checklist

Do this once when adopting this doc, then re-check quarterly. Fill in the "Last verified" cells above as you go.

- [ ] Dashboard → Authentication → Sign In / Up: email confirmations set to the value in §1a. Record date.
- [ ] Authentication → Attack protection: leaked-password protection ON. Record date.
- [ ] Authentication → Multi-Factor Authentication: TOTP provider enabled. Record date.
- [ ] Authentication → URL Configuration: production + staging URLs present. Record date.
- [ ] Database → Backups: schedule confirmed, retention noted in §1b. Record date.
- [ ] Edge Functions → Secrets: `CRON_WEBHOOK_SECRET` and `RESEND_API_KEY` both listed (values stay secret — record **presence** only). Record date.
- [ ] SQL editor: `SELECT jobname, schedule FROM cron.job;` — confirm the `capture-power-snapshots` job exists at the expected cadence. Record date.
- [ ] SQL editor: run the reconciliation query in §3b. Expect zero rows. Record date.

Nothing here changes code. If any step surfaces a surprise, open an issue instead of fixing it silently — future-you will thank present-you.
