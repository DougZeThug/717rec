

## Fix: package-lock.json Out of Sync

### Problem
Your deployment platform runs `npm ci` which requires `package-lock.json` to exactly match `package.json`. The lock file has older versions for ~50 packages (e.g. `@capacitor/core` 8.1.0 vs 8.3.0, `@sentry/react` 10.43.0 vs 10.47.0). This happened because `bun install` updated `package.json` versions but didn't update the npm lock file.

### Fix
Run `npm install --legacy-peer-deps` to regenerate `package-lock.json` so it matches the current `package.json`. This is the only change needed — no code files are modified.

**File changed:** `package-lock.json` (regenerated)

