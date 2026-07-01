# PR: Make security-audit + a11y CI gates blocking

Turn two informational workflows into required gates, with a tiny, explicit allowlist mechanism so noise doesn't force us back to `continue-on-error`.

## 1. `.github/workflows/security-audit.yml` — blocking

Changes:
- Remove `continue-on-error: true` from the `npm audit` step.
- Switch the audit to production deps only:
  `npm audit --audit-level=high --omit=dev`
  This automatically excludes advisories that only affect dev tooling (e.g. `@lhci/cli` → `tmp`, `jsdom` → `undici`, vitest transitives). No hand-maintained dev list.
- Add a **prod allowlist step** for any residual production advisories judged non-exploitable. New file `.github/audit-allowlist.json`:
  ```json
  {
    "advisories": [],
    "notes": "Add { id: <GHSA/npm advisory id>, package: <name>, reason: <why non-exploitable>, expires: <YYYY-MM-DD> } entries. Reviewed quarterly."
  }
  ```
  Small inline node script in the workflow: run `npm audit --json --omit=dev`, drop any advisory whose id is in the allowlist, fail if anything remains at high/critical. Keeps entries visible in git rather than buried in a service.
- Keep the existing summary + `committed-env-files` job untouched.

## 2. `.github/workflows/a11y.yml` — blocking

Changes:
- Remove `continue-on-error: true` from the job.
- Update the header comment to reflect that it's now required.
- Add a small allowlist inside `e2e/a11y.spec.ts` (a `DISABLED_RULES: string[] = []` array passed to `AxeBuilder.disableRules(...)`) so a specific WCAG rule can be muted with a code comment explaining why, without silencing the whole gate. Starts empty; nothing is silenced today.

No other test/spec changes: the six routes already covered stay in scope.

## 3. Verification (before opening the PR)

Run locally exactly what the plan message calls out:
- `npm run typecheck && npm run lint` — clean.
- `npm run build` — passes.
- `npm audit --audit-level=high --omit=dev` — record the current result. If it reports high/critical prod advisories, either bump the dependency in the same PR or add a scoped entry to `.github/audit-allowlist.json` with a reason + expiry.
- `npx playwright test e2e/a11y.spec.ts` against a local `npm run build && npm run preview` to confirm the six routes pass axe WCAG 2 A/AA. Any violation surfaced here is fixed in the same PR (or, if truly unavoidable, added to `DISABLED_RULES` with a comment).

## Out of scope

- No changes to services, hooks, or bracket code — this PR is CI-only. The BracketStageService / useAdminAccess / handleDatabaseError guidance in the message doesn't apply to this scope; those apply to the next data-layer PR.
- No threshold changes to coverage or bundle-size gates (those live in PR8).

## Risk

Low. If the newly-blocking gate surfaces a real issue, it's either fixed in the same PR or a single-line allowlist entry with a written reason and expiry, keeping the gate meaningful.
