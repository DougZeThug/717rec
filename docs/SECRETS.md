# Secrets & Environment Variables

## Publishable vs service-role key (plain English)

Supabase gives you two kinds of API keys. Knowing which is which keeps the app safe:

- **Publishable key** (a.k.a. `anon` key, `VITE_SUPABASE_PUBLISHABLE_KEY`) — safe to ship in the browser. It can only do what Row Level Security (RLS) policies allow. This is the key in `.env.example`.
- **Service-role key** — bypasses RLS entirely. Treat it like a root password. It must **never** appear in any `VITE_*` variable, any frontend `.env`, the git repo, or the browser bundle. It lives only in Supabase Edge Function runtime secrets / Lovable Cloud secrets.

Rule of thumb: if the key name starts with `VITE_`, it ends up in the public JS bundle. Only put publishable values there.

## Env vars used

| Variable                        | Purpose                                                 | Public?                      |
| ------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                                    | Yes (ships in client bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key, gated by RLS                         | Yes (ships in client bundle) |
| `VITE_SUPABASE_PROJECT_ID`      | Supabase project ref                                    | Yes                          |
| `IP_HASH_SALT`                  | Server-only salt for Edge Function rate-limit IP hashes | No                           |

The `VITE_*` variables are **publishable** — safe to expose in the browser. Access control is enforced server-side via Row Level Security. `IP_HASH_SALT` is a required Edge Function runtime secret and must be configured in Supabase/Lovable secrets, not in frontend `.env` files.

## Where they come from

- **Lovable preview & published app**: auto-injected at build time from the connected Supabase / Lovable Cloud project. No `.env` file needed.
- **CI (GitHub Actions)**: pulled from GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). See the `build-size` and `browser` jobs in `.github/workflows/ci.yml`.
- **Local development outside Lovable**: copy `.env.example` → `.env` and fill in real values from the Supabase Dashboard → Project Settings → API.

## What `.env.example` is for

A template showing which env vars the app expects. Contains only placeholders — no real values. Safe to commit.

## Where real secrets live

- **Supabase Dashboard** — anon key, service-role key, DB password, JWT secret.
- **Lovable runtime secrets** (project-level) — used by Edge Functions; managed in the Lovable UI.
- **Workspace Build Secrets** — used by `npm install` for private registries; configured in Workspace Settings.

Service-role keys and DB passwords must **never** appear in client code or `.env` files committed to git.

## Rotation

### Anon / publishable key

Only needed if the project is migrated, the key format changes, or you suspect Supabase compromise (rare — the key is public by design).

1. Supabase Dashboard → Project Settings → API → reset the anon key.
2. Update GitHub Secrets (`VITE_SUPABASE_PUBLISHABLE_KEY`).
3. Update the Lovable Cloud connection if needed (Lovable usually picks up the new key automatically).
4. Redeploy.

### Service-role key

Rotate immediately if ever exposed.

1. Supabase Dashboard → Project Settings → API → reset service role key.
2. Update every Edge Function / server using it (via Lovable runtime secrets).
3. Redeploy Edge Functions.

## Rules

- Never commit `.env` to git. (`.gitignore` should list `.env` and `.env.local`.)
- Never put service-role keys, DB passwords, or webhook secrets in client code or `VITE_*` variables — they would ship to the browser.
- Use Edge Functions + runtime secrets for anything sensitive.

## If you accidentally commit a secret

Assume the secret is compromised the moment it lands in git history — even a force-push doesn't fully erase it (forks, clones, CI logs, mirrors).

1. **Rotate first, scrub second.** Go to the source (Supabase Dashboard, the relevant Lovable runtime secret, etc.) and reset the key immediately. See "Rotation" above for service-role and anon key steps.
2. **Update every consumer** of that key (Edge Functions, GitHub Secrets, Lovable Cloud, local `.env` files).
3. **Remove the secret from the repo** in a follow-up commit, and consider rewriting history (`git filter-repo` or BFG) only after rotation is done.
4. **Tell the team** so no one keeps using the old value locally.
5. **Check CI logs** — secrets that were printed in workflow output also need to be considered leaked.

If the leaked value was the publishable/anon key, rotation is usually optional (it's public by design), but still scrub the file and update `.gitignore` so it doesn't happen again.

## Automated scanning

Two CI guardrails protect the repo from accidental secret commits:

1. **`committed-env-files`** (a job in `.github/workflows/security.yml`) fails the build if any per-environment `.env` file (e.g. `.env.local`, `.env.production`) is tracked by git. `.env.example` and the repo-level `.env` (publishable values only) are allowed.
2. **`gitleaks`** (a job in `.github/workflows/security.yml`) runs [Gitleaks](https://github.com/gitleaks/gitleaks) against every PR, every push to `main`, and a weekly cron. The ruleset (`.gitleaks.toml`) extends Gitleaks' defaults and adds a custom detector for Supabase `service_role` JWTs.

### Triaging a Gitleaks finding

- **Real secret?** Follow "If you accidentally commit a secret" above — rotate first, scrub second.
- **False positive?** Add a narrow entry to `.gitleaks.toml` under `[allowlist]` (prefer `paths` for fixture files, `regexes` for specific known-safe value shapes) and include a comment explaining why it is safe. Do not disable the rule globally.
