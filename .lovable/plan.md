

## Plan: Remove committed `.env`, add `.env.example`, document rotation

### What we'll do

The repo currently commits `.env` containing the Supabase URL and the anon publishable key. The anon key is **safe to expose by design** (it's the public client key, gated by RLS) — but committing `.env` is still poor hygiene because it normalizes the pattern and risks future leaks if a real secret is ever added.

### Changes

1. **Add `.env.example`** at repo root with placeholder values:
   ```
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"
   VITE_SUPABASE_PROJECT_ID="your-project-ref"
   ```
   No real values, no service-role key, no DB password.

2. **Update `.gitignore`** to ensure `.env` and `.env.local` are excluded (verify first; add if missing).

3. **Delete the committed `.env` file.**
   - The Lovable build environment auto-injects `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` from the connected Supabase project, so removing the file does NOT break the dev preview or production publish.
   - The CI workflow (`.github/workflows/test.yml`) already pulls these from GitHub Secrets, so CI is unaffected.

4. **Add `docs/SECRETS.md`** — a short runbook covering:
   - Which env vars the project uses and where they come from (Lovable auto-injection, GitHub Secrets for CI).
   - What `.env.example` is for (local-only development outside Lovable).
   - Where real secrets live (Supabase Dashboard, Lovable runtime secrets, Workspace Build Secrets).
   - Rotation procedure for the anon key (Supabase Dashboard → API Settings → Reset anon key) — only needed if you ever switch projects or suspect compromise.
   - Reminder: never commit `.env`; never put service-role keys in client code.

### What we will NOT do

- **Not rotating the anon key.** It is the public client key, designed to ship in the browser bundle. Rotating it requires re-issuing it everywhere (Lovable env, GitHub Secrets, any deployed clients) for zero security benefit. If you want it rotated anyway, say so and I'll add the step.
- **Not rewriting git history.** Removing the file from the current commit is sufficient given the key is non-sensitive. Full history scrubbing (BFG / `git filter-repo`) is disruptive and unnecessary here.
- **No service-role key, DB password, or webhook secret was ever in `.env`** — confirmed by reading the file. Nothing else to rotate.

### Files touched

- Add: `.env.example`
- Add: `docs/SECRETS.md`
- Edit: `.gitignore` (only if `.env` not already listed)
- Delete: `.env`

### Verification after changes

1. Preview still loads (Lovable injects env vars at build time).
2. `npm run build` succeeds locally if you pull the repo (you'd copy `.env.example` → `.env` and fill it in).
3. `git status` shows `.env` ignored.

### Rollback

Restore `.env` from git history; revert the other files. One step.

### Open question

Do you want me to also rotate the Supabase anon key as a belt-and-suspenders measure, even though it's a public key? Default plan: **no** (skip rotation). Say "rotate anyway" if you want it included.

