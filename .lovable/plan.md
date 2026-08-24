# Bump development dependencies: jest-dom, user-event, node types, eslint stack

## What to do

Update the six dev dependencies listed below to their latest versions and regenerate the lockfile. Then run the standard verification gates to catch any breaking changes from the two major-version bumps.

## Dependencies to update

| Package | Current | Target | Notes |
| --- | --- | --- | --- |
| @testing-library/jest-dom | ^6.9.1 | ^7.0.1 | Major version bump; check matcher types and import path |
| @testing-library/user-event | ^14.6.1 | ^14.6.4 | Patch bump; low risk |
| @types/node | ^26.1.0 | ^26.2.0 | Node types patch |
| eslint | ^10.6.0 | ^10.8.1 | Minor ESLint bump |
| eslint-plugin-react-refresh | ^0.5.3 | ^0.5.4 | Patch bump |
| eslint-plugin-simple-import-sort | 13.0.0 | ^14.0.0 | Major version bump; confirm import-sort rules still apply |

## Changes

1. Update `devDependencies` in `package.json` to the target versions shown above.
2. Regenerate `package-lock.json` with `npm install` (npm@10.9.2 per project settings; use `--legacy-peer-deps` because `.npmrc` requires it).
3. If any package introduces a new peer dependency that conflicts with existing constraints, resolve it by adjusting `devDependencies` or adding an `overrides` entry only when necessary.

## Verification

1. `npm run lint` — must pass with no new lint errors.
2. `npm run typecheck` — must pass with no new type errors.
3. `npm run test:file -- src/setupTests.ts` is not a test file; instead run a small targeted test file that uses `jest-dom` matchers, e.g., `src/components/help/__tests__/HelpQuickLinks.test.tsx`, to confirm the major bump did not break matcher types.
4. If all targeted checks pass, optionally run `npm run test:coverage` as the fast full-suite gate.

## Rollback criteria

If any gate fails because of a breaking change from `jest-dom` v7 or `eslint-plugin-simple-import-sort` v14, stop, capture the error, and add a targeted workaround or pin the offending package back to the previous major version before continuing.
