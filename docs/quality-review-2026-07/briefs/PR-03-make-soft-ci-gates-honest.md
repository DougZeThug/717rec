# PR-03 — Make the two "soft" CI gates honest (real-backend E2E + Lighthouse)

**Phase:** 1 (Baseline) · **Tier:** 2 · **Agent:** Claude Code (workflow YAML) + Doug manual (GitHub secrets) · **Parallelizable:** yes · **Depends on:** nothing · **Expected score impact:** +0.7 overall (Automated testing +3, Production readiness +2)

## 1. Background

Two CI jobs currently look protective but can never fail, which quietly overstates the safety net:

1. **"E2E (real Supabase)"** — verified via CI logs on `main` run `29440142270` (commit `79744a0`): every `E2E_*` secret is empty in the job env, the single spec `e2e/real-backend.spec.ts` self-skips (`1 skipped`), and the job reports **success in ~60s**. It has never exercised anything, on any run, yet shows green.
   ```
   E2E_SUPABASE_URL:
   E2E_SUPABASE_ANON_KEY:
   ...
   -  1 [real-backend] › ... › login → schedule → submit score against real Supabase
   1 skipped
   ```
2. **"Run Lighthouse CI"** — `lighthouserc.json` sets every category assertion to `"warn"` (performance ≥0.7, a11y/BP/SEO ≥0.9), so degradations print warnings into a log nobody reads and the step passes regardless.

## 2. Objective

Every green check on the repo means something real ran and passed; anything that cannot run is visibly skipped or absent — never silently green.

## 3. Exact scope

`.github/workflows/ci.yml`, `lighthouserc.json`, GitHub repo secrets, `docs/E2E_REAL_BACKEND.md`.

## 4. Files to modify

- `.github/workflows/ci.yml` (e2e-real-backend job)
- `lighthouserc.json`
- `docs/E2E_REAL_BACKEND.md` (setup instructions refresh)

## 5. Implementation steps

**Real-backend E2E (choose one):**
- **Preferred:** Doug creates a **separate, dedicated Supabase project** for E2E and sets repo secrets `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`. A "staging schema" inside the production project is **not** acceptable: the e2e helper's service-role client and every table operation target the default `public` schema, so pointing these secrets at production-with-a-schema would seed and delete rows in real tables. Then add a guard step that **fails** the job when configuration is incomplete — it must bind and check **all five** secrets (the spec skips if *any* is absent, and a bare `run:` step sees none of them without an `env:` mapping):
  ```yaml
  - name: Require E2E secrets
    env:
      E2E_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
      E2E_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
      E2E_SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}
      E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
      E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
    run: |
      for v in E2E_SUPABASE_URL E2E_SUPABASE_ANON_KEY E2E_SUPABASE_SERVICE_ROLE_KEY E2E_TEST_USER_EMAIL E2E_TEST_USER_PASSWORD; do
        test -n "${!v}" || { echo "::error::$v missing — the real-backend spec would silently skip"; exit 1; }
      done
  ```
  (The Playwright step needs the same five in its `env:` — mirror the existing job env block.)
- **If no second project for now:** remove the `e2e-real-backend` job from `ci.yml` entirely (keep the spec and helper in the repo), and note in the README's CI table that real-backend E2E is not yet active. Deleting beats disabling with `if: ${{ vars.E2E_REAL_BACKEND_ENABLED == 'true' }}`, because GitHub reports a conditionally-skipped job as **Skipped, which still satisfies a required status check** — a disabled-but-required "E2E (real Supabase)" would keep green-lighting merges while testing nothing, which is exactly the failure mode this brief exists to fix. If the flag approach is used anyway (e.g. to keep the YAML in place), the job must never appear in any branch-protection required-checks list until the secrets exist and the flag is on. Restore the job in the same PR that adds the secrets, guard step included.

**Lighthouse:**
- In `lighthouserc.json`, promote to `"error"` with realistic floors measured from the current build (review measured entry 130.97 kB gz; CI Lighthouse historically passes):
  ```json
  "categories:performance": ["error", { "minScore": 0.65 }],
  "categories:accessibility": ["error", { "minScore": 0.9 }],
  "categories:best-practices": ["error", { "minScore": 0.85 }],
  "categories:seo": ["error", { "minScore": 0.9 }]
  ```
- Calibrate locally first — `lighthouserc.json` collects from `./dist`, so build before running: `npm run build && npx lhci autorun`. Set each floor ~0.05 below the measured score so the gate catches regressions without flaking.

## 6. Database requirements

E2E project only: apply the repo migrations to the E2E Supabase project (same replay script CI uses) before first run.

## 7. UI/UX requirements

None.

## 8. Testing requirements

- CI run with secrets present: real-backend job actually runs its login→schedule→submit-score path (log shows `1 passed`, not `1 skipped`).
- CI run with a secret deliberately unset (or the vars flag off): the job **fails** (preferred path) or does not appear (flag path) — it must not show green-and-skipped.

## 9. Validation commands

```bash
npm run build && npx lhci autorun   # lhci collects from ./dist — build first
npm run typecheck && npm run lint
```

## 10. Manual verification checklist (Doug)

- [ ] Create E2E Supabase project + set the 5 secrets (Settings → Secrets and variables → Actions) — **never production values**.
- [ ] Confirm the next CI run's "E2E (real Supabase)" log ends with `1 passed`.
- [ ] Confirm a Lighthouse regression (e.g. temporarily set minScore 0.99) fails the job, then restore.

## 11. Acceptance criteria

- No CI job can be green while its core step skipped.
- Lighthouse assertions are `error`-level with documented floors.
- `docs/E2E_REAL_BACKEND.md` matches the implemented setup.

## 12. Non-goals / rollback

- Non-goals: adding new e2e specs (the existing golden-path spec is fine to start), performance optimization work.
- Rollback: revert the YAML/JSON commit; delete the secrets. No product-code risk.
