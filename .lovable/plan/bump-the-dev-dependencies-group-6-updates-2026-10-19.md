# Bump the dev-dependencies group (6 updates)

## What changes
- Raise the 6 packages in `package.json` to the versions in the Dependabot list.
- Keep vitest and @vitest/coverage-v8 pinned to the same exact version (5.0.5).
- Refresh both lockfiles: `npx npm@12 install --package-lock-only`, then `bun install --lockfile-only`.

## Risk
- All are patch updates for test and style tools. They do not reach the live site. Low risk.

## Checks
- `npm run typecheck`, `npm run lint`, `npm run build`.
- Focused tests: UI pop-ups, contact/Join form, MCP tools, and a coverage run on one file.
- A test run of the deploy install against `bun.lock`.

No app code changes are expected. No publish is needed.
