# Dependency Bump Plan — Production Dependencies

## Goal
Safely bump the 7 production dependencies listed below and refresh the lockfile, then verify the app still builds, types, lints, and passes tests.

## Packages to update

| Package | From | To | Risk note |
|---|---|---|---|
| @capgo/capacitor-social-login | 8.3.40 | 8.4.4 | Capacitor plugin; check for native/Capacitor API changes |
| @hookform/resolvers | 5.7.1 | 5.9.1 | Zod resolver; usually safe, verify form validation still passes |
| @sentry/react | 10.69.0 | 10.70.0 | Patch/minor; typically safe |
| @supabase/supabase-js | 2.112.0 | 2.112.3 | Patch; realtime/auth fixes likely, verify Supabase calls |
| framer-motion | 12.43.0 | 13.1.1 | Major version jump; watch for API/deprecation changes |
| lucide-react | 1.28.0 | 1.33.0 | Icon library; usually safe, confirm no removed icons |
| react-hook-form | 7.84.0 | 7.85.0 | Minor; check type changes on `useForm` |

## Steps

1. **Update `package.json`**
   - Bump each of the 7 packages to the target version in the `dependencies` section.

2. **Refresh lockfile**
   - Run `npm install` with the project's configured npm version.
   - Ensure private-cache URLs are repointed to `registry.npmjs.org` if any appear.

3. **Safety verification**
   - `npm run lint` — must pass clean.
   - `npm run typecheck` — must pass clean.
   - `npm run build` — must produce a successful production build.
   - `npm run test:file -- <targeted-smoke-tests>` — run a fast subset first.
   - `npm run test:coverage` — full fast gate.

4. **Risk follow-up**
   - If `framer-motion` v13 introduces breaking changes, either pin back to v12 or patch the affected animation code.
   - If `@capgo/capacitor-social-login` changes its native interface, verify no social-login code path is affected.

## Deliverables
- Updated `package.json`.
- Refreshed `package-lock.json`.
- Clean lint, typecheck, build, and test results.
