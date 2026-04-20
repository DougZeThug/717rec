# Secrets & Environment Variables

## Env vars used

| Variable | Purpose | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (ships in client bundle) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key, gated by RLS | Yes (ships in client bundle) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref | Yes |

All three are **publishable** — safe to expose in the browser. Access control is enforced server-side via Row Level Security.

## Where they come from

- **Lovable preview & published app**: auto-injected at build time from the connected Supabase / Lovable Cloud project. No `.env` file needed.
- **CI (GitHub Actions)**: pulled from GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). See `.github/workflows/test.yml`.
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