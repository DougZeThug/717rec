# Bump 4 dev-dependency updates

## Goal

Update 4 dev packages to their new versions. No app code changes.

| Package | From | To |
|---|---|---|
| @types/node | ^26.6.2 | ^26.6.4 |
| @vitest/coverage-v8 | 5.0.2 (pinned) | 5.0.3 (pinned) |
| typescript-eslint | ^8.70.1 | ^8.71.0 |
| vitest | 5.0.2 (pinned) | 5.0.3 (pinned) |

Vitest and @vitest/coverage-v8 stay pinned to the same exact version — coverage needs the matching Vitest.

## Steps

1. Edit `package.json` with the 4 new versions.
2. `npm install` — updates `package-lock.json`.
3. `bun install --lockfile-only` — updates `bun.lock` (the deploy build runs a frozen bun install; skipping this breaks the deploy).
4. Checks:
   - `npm run typecheck`
   - `npm run lint` (only the 1 known old warning is allowed)
   - `npm run build`
   - `npm run size`
   - Focused test gate: `npm run test:file` on a few test files that use Vitest and jest-dom matchers, to confirm the Vitest patch works with the test setup.
5. Run the dependency security scan.
6. Confirm nothing else changed; report results.

## Expected result

All checks pass. No source files change. Both lockfiles match package.json, so the next deploy installs cleanly.
