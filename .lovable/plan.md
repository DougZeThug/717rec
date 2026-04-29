## Apply Dev Dependency Updates

Three patch/minor bumps for dev tooling. All low-risk.

### Updates
- `@typescript-eslint/*` 8.58.2 → 8.59.1 (lint rules)
- `eslint` plugin 10.2.0 → 10.2.1 (lint rules)
- `vitest` 4.1.4 → 4.1.5 (test runner)

### Steps
1. Bump versions in `package.json` and install with `--legacy-peer-deps`.
2. Run `bunx tsc --noEmit` and `bunx vite build` to verify no regressions.
3. Run `bunx eslint .` to check for any new lint errors from the typescript-eslint bump.
4. Run `bunx vitest run` to confirm tests still pass under the new vitest.
5. If any step fails, roll back the offending package and report.

### Verification
You'll see a clean build, lint, and test pass — no app behavior changes since these are all dev-only tools.