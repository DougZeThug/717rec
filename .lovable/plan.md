# Plan: Triage 8 npm audit advisories, apply safe fixes

Sandbox note: the Lovable npm proxy returns 404 for `npm audit`, so full enumeration will run against the public registry (already configured in `.npmrc` / lockfile after the earlier registry cleanup).

## Steps

1. **Enumerate**
   - Run `npm audit --json` and parse into a triage table: severity, package, dependency path (prod vs dev), advisory ID, fix version, whether the fix is semver-compatible or a breaking bump.
   - Save the raw report to `docs/quality-review-2026-07/evidence/audit.txt` (overwriting the stale one).

2. **Categorize each of the 8 advisories**
   - **Prod path, non-breaking fix** → upgrade via targeted `npm install <pkg>@<safe>` (not `audit fix --force`), regenerate `package-lock.json`.
   - **Dev-only** (eslint, vitest, playwright, lighthouse, etc.) → allowlist in `.github/audit-allowlist.json` with `{id, package, reason: "dev-only, excluded from prod audit gate", expires: +90d}`. CI already runs `npm audit --omit=dev`, so this is consistent with existing policy.
   - **Prod path but only breaking fix available** → stop and report back before bumping majors (per your "no majors without asking" preference).

3. **Apply the safe upgrades**
   - Minimal-diff bumps only. No `audit fix --force`.
   - Regenerate `package-lock.json` (npm is the canonical PM per `AGENTS.md`).

4. **Verify**
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:coverage` (fast full-suite gate)
   - `npm run build`
   - Re-run `npm audit --omit=dev` and confirm 0 unallowlisted high/critical.

5. **Document**
   - Short entry in `docs/quality-review-2026-07/briefs/STATUS.md` recording what was upgraded, what was allowlisted (with reasons + expiry), and what — if anything — was deferred pending your approval for a major bump.

## Out of scope
- Major version bumps on any prod dependency (I'll surface those and ask).
- React 19 (already excluded by Dependabot config).
- Backend / Supabase edge function deps.

## Deliverables
- Updated `package.json` + `package-lock.json` for safe upgrades.
- Updated `.github/audit-allowlist.json` for dev-only advisories.
- Refreshed `docs/quality-review-2026-07/evidence/audit.txt`.
- STATUS.md entry summarizing the sweep.
