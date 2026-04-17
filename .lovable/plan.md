

## Plan: Bump 20 production + dev dependencies (Dependabot grouped PR)

### Why
Routine grouped Dependabot update. All bumps are **patch or minor** versions — semver-safe, no breaking changes expected.

### Risk assessment per bump

**Zero risk (patch bumps)** — bug fixes only:
- `@capacitor/core` 8.3.0→8.3.1, `@capgo/capacitor-social-login` 8.3.9→8.3.14
- `@sentry/react` 10.47.0→10.49.0, `@supabase/supabase-js` 2.101.1→2.103.3
- `@tanstack/react-query` 5.96.2→5.99.0, `@vitest/eslint-plugin` 1.6.14→1.6.16
- `nanoid` 5.1.7→5.1.9, `react-is` 19.2.4→19.2.5
- `react-router` + `react-router-dom` 7.14.0→7.14.1
- `vite-plugin-beasties` 0.4.1→0.4.2, `@vitest/coverage-v8` 4.1.3→4.1.4
- `globals` 17.4.0→17.5.0, `jsdom` 29.0.1→29.0.2
- `postcss` 8.5.8→8.5.10, `prettier` 3.8.1→3.8.3

**Low risk (minor bumps)** — new features, backward-compatible:
- `lucide-react` 1.7.0→1.8.0 — new icons added, existing icons unchanged
- `react-resizable-panels` 4.9.0→4.10.0
- `autoprefixer` 10.4.27→10.5.0 — vendor prefix updates

### What changes
- **1 file edited**: `package.json` — bump 20 version entries.
- **1 file regenerated**: `bun.lock` — refreshed automatically on install.
- **0 source files changed**, **0 config changes**, **0 migrations**.

### Safety guarantees
- All bumps are within the same major version (semver-compatible).
- `.npmrc` `legacy-peer-deps=true` preserved — protects against transient peer conflicts.
- Vite/React/TS toolchain untouched — build pipeline stable.
- `nanoid` flagged as "unused" in the prior knip audit, but bumping costs nothing; will be removed in the deferred dead-code Phase A.

### Implementation steps
1. Update the 20 version entries in `package.json` to the target versions.
2. Reinstall to refresh `bun.lock`.
3. Verify: `npx tsc --noEmit` passes, `npm run build` succeeds, test suite green.
4. Smoke test: home, standings, schedule, playoffs, admin dashboard load cleanly.

### Rollback
Revert `package.json` + `bun.lock` from git history. Single-step revert.

