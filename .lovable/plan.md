

## Plan: Upgrade Vite to ≥7.3.2 to patch GHSA-4w7w-66w2-5vf9

### Why
Current `vite ^7.3.1` is affected by advisory GHSA-4w7w-66w2-5vf9 (medium severity, dev-server exposure). Fixed in 7.3.2. Patch-level bump — no breaking changes expected.

### What changes
- **1 file edited**: `package.json` — bump `vite` from `^7.3.1` to `^7.3.2` (caret already permits this; an explicit bump + lockfile refresh ensures it lands).
- Lockfile regenerates on install.

### Safety
- Patch release (7.3.1 → 7.3.2) — semver-safe, security fix only.
- No config changes needed in `vite.config.ts`.
- Plugins (`@vitejs/plugin-react-swc`, `lovable-tagger`, `vite-plugin-beasties`) all compatible with 7.3.x.
- `.npmrc` `legacy-peer-deps=true` preserved.

### Steps
1. Update `vite` entry in `package.json` devDependencies to `^7.3.2`.
2. Reinstall to refresh lockfile.
3. Verify: `npx tsc --noEmit` passes, dev server boots, `npm run build` succeeds.
4. Smoke test: home page loads in preview.

### Rollback
Revert `package.json` change — single-line revert.

