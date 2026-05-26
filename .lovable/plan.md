
# P0 — Secret hygiene guardrails

## What's already in place (no action needed)

- `.gitignore` already ignores `.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test` (allowlist `.env.example`).
- `.github/workflows/security-audit.yml` already has a `committed-env-files` job that fails CI if any per-env file is tracked.
- `README.md` already documents env setup and points to `docs/SECRETS.md`.
- `docs/SECRETS.md` already explains publishable vs service-role keys, where secrets live, and rotation.

The only real gap is **automated secret content scanning** — nothing today greps commits for AWS keys, Supabase service-role JWTs, Stripe keys, etc.

## Change set (one small PR)

1. **New workflow `.github/workflows/secret-scan.yml`** — runs Gitleaks on PRs, pushes to `main`, and weekly cron.
   - Uses `gitleaks/gitleaks-action@v2` pinned to a SHA.
   - Full history scan on push/schedule; diff-only scan on PRs for speed.
   - Fails the job on any finding; uploads SARIF artifact for review.
   - Needs no secrets beyond `GITHUB_TOKEN` (no Gitleaks license required for public-action use).

2. **New `.gitleaks.toml`** at repo root — extends default ruleset and adds:
   - Allowlist for `.env.example`, `docs/SECRETS.md`, and `supabase/migrations/**` (migrations contain anon JWT references in comments).
   - Custom rule: flag any value matching the Supabase `service_role` JWT signature shape.
   - Custom rule: flag any `VITE_*` variable assigned a value that decodes as a service-role JWT (defense against accidental misuse).

3. **README update (small)** — add a one-line note under the existing "Environment setup" paragraph:
   - "Every PR runs Gitleaks; commits containing API keys or service-role JWTs will fail CI. See `docs/SECRETS.md` if a secret is ever committed."

4. **`docs/SECRETS.md` append** — short new "Automated scanning" section explaining what Gitleaks blocks, how to triage a false positive (add to `.gitleaks.toml` allowlist with justification), and the existing remediation steps if a real secret leaks.

## Files changed

- `.github/workflows/secret-scan.yml` (new)
- `.gitleaks.toml` (new)
- `README.md` (one paragraph)
- `docs/SECRETS.md` (one section)

## Not in scope

- No app code, services, hooks, or UI changes.
- No changes to `.gitignore` (already comprehensive).
- No changes to the existing `committed-env-files` job (it stays as a fast belt-and-suspenders check).
- No pre-commit hook installation — optional follow-up; keeps this PR CI-only and zero-install for contributors.

## Validation

- Push the branch; confirm the new `Secret Scan` job runs green on a clean tree.
- Add a throwaway commit with a fake AWS key locally, confirm Gitleaks fails the job, then drop the commit before opening the PR.
- Existing `npm run lint`, `npm test`, and `npm run build` are unaffected.

## Risk

Low. Workflow-only additions plus two docs paragraphs. Worst case: a noisy false positive blocks a PR, fixed by an allowlist entry in `.gitleaks.toml`.

## Suggested PR

**Title:** Add Gitleaks secret scanning to CI

**Description:** Adds a Gitleaks workflow that scans every PR, push to `main`, and weekly cron for committed secrets (API keys, Supabase service-role JWTs, etc.). Complements the existing `committed-env-files` check and `.gitignore` rules. Documents the scan in README and `docs/SECRETS.md`. No app or schema changes.
