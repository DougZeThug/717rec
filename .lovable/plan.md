# Dependency Bump Plan — Additional Production & Dev Dependencies

## Goal
Safely bump the 6 additional dependencies listed below, refresh the lockfile, and verify the app still builds, types, lints, and passes tests.

## Packages to update

| Package | Current | Target | Section | Risk note |
|---|---|---|---|---|
| uuid | ^14.0.1 | ^14.0.2 | dependencies | Patch; used for ID generation, verify no API change |
| @axe-core/playwright | ^4.12.1 | ^4.13.0 | devDependencies | Accessibility testing; usually safe |
| @vitest/coverage-v8 | ^4.1.10 | ^4.1.11 | devDependencies | Vitest coverage patch |
| @vitest/eslint-plugin | ^1.6.26 | ^1.6.27 | devDependencies | ESLint plugin patch |
| globals | ^17.9.0 | ^17.11.0 | devDependencies | Global definitions; typically safe |
| knip | ^6.31.0 | latest 6.32.x patch | devDependencies | Dead-code finder; confirm exact patch at install time |

## Steps

1. **Update `package.json`**
   - Bump each package to its target version.
   - Resolve the exact `knip` patch version during install if the target is ambiguous.

2. **Refresh lockfile**
   - Run `npm install`.
   - Ensure private-cache URLs are repointed to `registry.npmjs.org` if any appear.

3. **Safety verification**
   - `npm run lint` — must pass clean.
   - `npm run typecheck` — must pass clean.
   - `npm run build` — must produce a successful production build.
   - `npm test` — full suite must pass.

## Deliverables
- Updated `package.json`.
- Refreshed `package-lock.json`.
- Clean lint, typecheck, build, and test results.
