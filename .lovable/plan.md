

## Fix: package-lock.json out of sync

### Problem

The CI pipeline (`npm ci`) fails because `@vitest/eslint-plugin@1.6.14` is in `package.json` but missing from `package-lock.json`. This happened when we swapped `eslint-plugin-vitest` for `@vitest/eslint-plugin` — the lockfile wasn't regenerated with `npm install`.

### Fix

Run `npm install --legacy-peer-deps` to regenerate `package-lock.json` with the correct entries. This is a lockfile-only change — no code or dependency changes.

### Scope

1 file updated: `package-lock.json`

