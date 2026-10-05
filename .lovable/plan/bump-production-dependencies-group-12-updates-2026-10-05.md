# Bump production-dependencies group (12 updates)

## Goal
Update the 12 packages listed in the request to their target versions, then verify the app still builds, types, lints, and passes tests.

## Packages
| Package | From | To |
|---|---|---|
| @capgo/capacitor-social-login | 8.5.11 | 8.5.12 |
| @sentry/react | 11.0.0 | 11.2.0 |
| @tanstack/react-query | 5.103.2 | 5.104.0 |
| framer-motion | 13.4.4 | 13.5.0 |
| lucide-react | 1.48.0 | 1.49.0 |
| react-day-picker | 10.0.1 | 10.0.2 |
| react-hook-form | 7.88.0 | 7.89.0 |
| @size-limit/file | 14.0.1 | 14.1.0 |
| globals | 17.12.0 | 17.13.0 |
| knip | 6.38.0 | 6.39.0 |
| size-limit | 14.0.1 | 14.1.0 |
| vite | 8.3.1 | 8.3.2 |

All minor/patch bumps. No major versions crossed. React stays on 18.

## Steps
1. Edit `package.json` with the target versions.
2. Run `npm install` to update `package-lock.json`.
3. Run `bun install --lockfile-only` to keep `bun.lock` in sync for the deploy build.
4. Run `npm run typecheck`.
5. Run `npm run lint`.
6. Run `npm run build`.
7. Run focused test gates: auth, MCP, validation tests.
8. Run `npm run size` (vite and size-limit both change here).
9. Run the dependency security scan.
10. Report results and any follow-up.

## Risks
- `@sentry/react` 11.0.0 → 11.2.0: minor bump, watch for deprecation warnings in Sentry init.
- `vite` 8.3.1 → 8.3.2: patch; build should be unaffected.
- `size-limit` / `@size-limit/file` 14.0.1 → 14.1.0: confirm `npm run size` still reads `.size-limit.json`.

## No source changes expected
Dependency-only task unless typecheck or tests reveal an API change.
