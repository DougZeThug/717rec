Apply the safe, non-major production dependency bumps from the Dependabot list, skip the two major-version bumps, and verify everything still builds and passes lint/typecheck/tests.

## Changes

**Bump these packages (non-major updates only):**
- `@sentry/react`: `^10.60.0` → `^10.64.0`
- `@supabase/supabase-js`: `^2.108.1` → `^2.110.1`
- `@tanstack/react-query`: `^5.101.1` → `^5.101.2`
- `@vitest/eslint-plugin`: `^1.6.20` → `^1.6.21`
- `framer-motion`: `^12.41.0` → `^12.42.2`
- `lucide-react`: `^1.21.0` → `^1.23.0`
- `react-hook-form`: `^7.80.0` → `^7.81.0`
- `react-router`: `^7.17.0` → `^7.18.1` (kept in sync with `react-router-dom`)
- `react-router-dom`: `^7.17.0` → `^7.18.1`
- `recharts`: `^3.9.0` → `^3.9.2`
- `knip`: `^6.24.0` → `^6.25.0`
- `lovable-tagger`: `^1.3.0` → `^1.3.1`
- `postcss`: `^8.5.15` → `^8.5.16`
- `prettier`: `3.8.4` → `3.9.4`

**Skip/confirm these:**
- `react-is`: stay at `18.3.1` (do not jump to 19.x while React is still 18)
- `react-router` 8.1.0 major bump: skip for now, keep at 7.x
- `@vitest/coverage-v8`: already at `^4.1.10`, no change needed

## Verification

After updating `package.json` and running `npm install`:
1. `npm run lint` passes
2. `npm run typecheck` passes
3. `npm run build` succeeds
4. At least one focused test run passes (e.g. `MatchCard` or `MatchRecapSummary`)

If any new lint/format errors appear from the Prettier/ESLint bumps, auto-fix them with `npm run lint:fix` and re-verify.