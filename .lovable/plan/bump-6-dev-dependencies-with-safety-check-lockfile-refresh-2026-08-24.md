# Bump 6 dev dependencies (with safety check + lockfile refresh)

## Safety check — all 6 are safe

I checked the npm registry and the release notes for each one. **None are deprecated, and none break this project.**

| Package | Current | Target | Risk |
| --- | --- | --- | --- |
| @testing-library/jest-dom | 6.9.1 | 7.0.1 | Safe. Major, but the only breaks are: `@testing-library/dom` is now a required peer (we already have `^10.4.1`, needs `>=10 <11`) and Node must be `>=22` (we pin Node 24). 7.0.1 also makes `vitest` an optional peer, so no new install noise. |
| @testing-library/user-event | 14.6.1 | 14.6.4 | Safe. Patch only. |
| @types/node | 26.1.1 | 26.2.0 | Safe. Types-only minor. |
| eslint | 10.6.0 | 10.8.1 | Safe. Minor. Node engine `>=24` matches our pin. |
| eslint-plugin-react-refresh | 0.5.3 | 0.5.4 | Safe. Patch. Peer `eslint ^9 \|\| ^10`. |
| eslint-plugin-simple-import-sort | 13.0.0 | 14.0.0 | Safe. Major, but the only change is sorting of quoted "arbitrary module namespace names" (`import { "a-b" as c }`). This repo does not use that syntax, so no re-sorting is triggered. |

No peer-dependency conflicts. No new transitive risk beyond what is already installed.

## Changes

1. Update the six entries in `devDependencies` in `package.json`. Keep the existing style: caret ranges for the five that already use them, and pin `eslint-plugin-simple-import-sort` to exact `14.0.0` (it is currently exact `13.0.0`).
2. Install with `npm install` (the repo requires npm; `.npmrc` already sets `legacy-peer-deps=true`).

## Lockfile refresh (required)

`package-lock.json` must be rewritten with the same npm major the deploy machine uses, or `npm ci` fails with `EUSAGE ... Missing: @swc/core-linux-arm64-gnu ... from lock file`. This has bitten this repo before.

1. `npx npm@12 install --package-lock-only` — records every platform's optional packages.
2. Confirm every `resolved` URL still points at `registry.npmjs.org` (no Lovable private-cache URLs).
3. `npx npm@12 ci --dry-run` — must complete with no `EUSAGE` error.

## Verification

1. `npm run lint` — must be clean. This is the real gate for both ESLint bumps and for simple-import-sort v14.
2. `npm run typecheck` — must be clean. This is the real gate for jest-dom v7 matcher types and `@types/node`.
3. `npm run test:file -- src/components/help/__tests__/HelpQuickLinks.test.tsx` — confirms jest-dom matchers (`toHaveAttribute`, `toBeInTheDocument`) still resolve at runtime.
4. `npm run test:coverage` — fast full-suite gate, to catch any matcher change across the ~3.9k tests.
5. `npm run build` — confirms the lockfile refresh did not break the production build.

## If something fails

Stop and report the exact error. Do not paper over it. Roll the single offending package back to its previous version and keep the other five, since the two majors are independent of each other.
