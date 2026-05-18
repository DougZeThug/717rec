# Secrets and environment config guardrails

A small, single-risk-class PR. No app logic, no migrations, no auth, no renames.

## Current state (verified)

- `.gitignore` ignores `*.local` (covers `.env.local`, `.env.*.local`) but **does not** explicitly ignore `.env`, `.env.development`, `.env.production`, `.env.test`. A developer could accidentally commit `.env`.
- `.env.example` exists with placeholders for `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — names match `src/integrations/supabase/client.ts`. No rename needed.
- `docs/SECRETS.md` already exists and is solid; needs a short non-coder-friendly intro on publishable vs service-role keys and an "accidentally committed a secret" section.
- `README.md` has no "Environment setup" section pointing at `docs/SECRETS.md` or `.env.example`.
- `.github/workflows/security-audit.yml` exists — best place to add a tiny guardrail step rather than a new workflow.
- No existing tests around `client.ts` env initialization. Adding one would require module-level `import.meta.env` mocking (awkward in Vitest, risk of flakiness). **Skipping** per the task's own guidance.

## Files I will change

1. **`.gitignore`** — add explicit env patterns and a `!.env.example` allow-rule:
   ```
   # Local environment files (never commit secrets)
   .env
   .env.local
   .env.*.local
   .env.development
   .env.production
   .env.test
   !.env.example
   ```

2. **`.env.example`** — add short header comments clarifying that all three vars are publishable/browser-safe (RLS enforces access), and that `service_role` keys must never go in a `VITE_*` var or any frontend `.env`. Keep values as placeholders.

3. **`docs/SECRETS.md`** — add two short sections:
   - "Publishable vs service-role key (plain English)" — 3–4 lines.
   - "If you accidentally commit a secret" — rotate first, then scrub history; link Supabase rotation steps already in the doc.

4. **`README.md`** — add a 3-line "Environment setup" subsection pointing to `.env.example` and `docs/SECRETS.md`.

5. **`.github/workflows/security-audit.yml`** — append a small `committed-env-files` job (or step) that fails if any tracked file matches `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`. Pure shell using `git ls-files` — no new dependencies.

## Files I will NOT touch

- `src/integrations/supabase/client.ts` and any runtime code
- Supabase migrations, RLS, edge functions, `config.toml`
- `package.json` / lockfile (no new deps)
- Auth, UI, components, hooks, services
- Env variable names

## Test/verification commands

- `git ls-files | grep -E '^\.env(\..+)?$'` — confirm only `.env.example` is tracked
- `npm ci`
- `npm run lint`
- `npm run build`
- `npm test`

## Skipped (with reason)

- New Vitest spec for `client.ts` env validation — requires brittle `import.meta.env` module mocking and a refactor of the throw-at-import-time pattern. Out of scope for a docs/guardrail PR; no behavior changes to cover.

## Suggested PR title

Hardens environment secret guardrails

## Suggested PR description

This PR tightens local environment file protections, clarifies Supabase key handling, and improves developer setup guidance without changing runtime app behavior.

- `.gitignore`: explicitly ignores `.env`, `.env.development`, `.env.production`, `.env.test`, and `.env.*.local`, while keeping `.env.example` tracked.
- `.env.example`: adds short comments clarifying that the listed `VITE_*` vars are publishable/browser-safe (gated by RLS) and that `service_role` keys must never appear in any frontend `.env`.
- `docs/SECRETS.md`: adds a plain-English "publishable vs service-role" explainer and an "if you accidentally commit a secret" recovery checklist.
- `README.md`: adds a short Environment setup pointer to `.env.example` and `docs/SECRETS.md`.
- `.github/workflows/security-audit.yml`: adds a lightweight shell check that fails CI if a local env file is ever committed. No new dependencies.

No production code, schema, RLS, auth, or UI changes. No env variable renames. No new secrets.
