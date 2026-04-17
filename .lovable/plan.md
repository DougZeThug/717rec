

## Plan: Bump 6 dev dependencies (Dependabot grouped PR)

### Why
Routine grouped Dependabot update for dev tooling. Five patch bumps and one minor bump — all semver-safe.

### Risk per bump

**Zero risk (patch bumps)** — bug fixes only:
- `@types/node` 25.5.2 → 25.6.0 — type definitions only, no runtime impact
- `eslint-plugin-react-hooks` 7.0.1 → 7.1.1
- `typescript` 6.0.2 → 6.0.3
- `typescript-eslint` 8.58.0 → 8.58.2
- `vitest` 4.1.3 → 4.1.4 (matches the already-bumped `@vitest/coverage-v8` 4.1.4 — keeps versions aligned)

**Low risk (minor bump)**:
- `eslint-plugin-simple-import-sort` 12.1.1 → 13.0.0 — major version bump per semver, but this plugin's major bumps historically only drop old Node support; no rule changes affecting our `simple-import-sort/imports` config in `eslint.config.js`. Worst case: a few files need `npm run lint --fix` (auto-fixable).

### What changes
- **1 file edited**: `package.json` — bump 6 devDependency entries.
- **1 file regenerated**: `bun.lock` — refreshed on install.
- **0 source files changed**, **0 config changes**, **0 migrations**.

### Safety guarantees
- All dev-only — zero impact on production bundle.
- `vitest` and `@vitest/coverage-v8` stay version-aligned (both 4.1.4).
- `eslint.config.js` `simple-import-sort` rules unchanged; auto-fix available if needed.
- `.npmrc` `legacy-peer-deps=true` preserved.

### Steps
1. Update the 6 version entries in `package.json`.
2. Reinstall to refresh `bun.lock`.
3. Verify: `npx tsc --noEmit` passes, `npm run lint` passes, `npm test` green, `npm run build` succeeds.
4. If `simple-import-sort` v13 flags any files, run `npm run lint -- --fix`.

### Rollback
Revert `package.json` + `bun.lock` from git. Single-step revert.

