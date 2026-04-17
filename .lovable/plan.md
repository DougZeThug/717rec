

## Plan: Regenerate `package-lock.json` to sync with `package.json`

### Why
CI runs `npm ci`, which requires `package.json` and `package-lock.json` to be perfectly in sync. The recent dependency bumps updated `package.json` and `bun.lock`, but the repo also has a `package-lock.json` (used by GitHub Actions per `.github/workflows/test.yml` line: `cache: 'npm'` + `npm ci`) that was **not** refreshed. Result: `npm ci` fails with 40+ "lock file does not satisfy" errors.

### Root cause
- Lovable's sandbox uses `bun` → updates `bun.lock`.
- GitHub Actions uses `npm ci` → reads `package-lock.json`.
- The two lockfiles drifted.

### Fix
Run `npm install` locally (in the sandbox, in default mode) to regenerate `package-lock.json` from the current `package.json`. This produces a fresh lockfile that matches every version in `package.json`, including all transitive deps (browserslist, caniuse-lite, @vitest/utils, etc. that the error log flagged as missing/mismatched).

### What changes
- **1 file regenerated**: `package-lock.json` (the only file CI cares about).
- **0 source files changed**, **0 `package.json` changes**, **0 `bun.lock` changes**.

### Steps
1. Run `npm install --legacy-peer-deps` (respects `.npmrc`) to rebuild `package-lock.json`.
2. Verify the new lockfile contains the expected versions (vite 7.3.2, @sentry/react 10.49.0, @supabase/supabase-js 2.103.3, etc.).
3. Confirm `npm ci --legacy-peer-deps` would now succeed (dry validation).

### Long-term note (optional, not part of this fix)
The repo maintains two lockfiles (`bun.lock` + `package-lock.json`), which guarantees this drift will recur on every Dependabot bump. Worth considering: pick one package manager and delete the other lockfile. Not doing it now — out of scope for this fix.

### Rollback
Revert `package-lock.json` from git history. Single-step.

