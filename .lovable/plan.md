## Plan: Apply Dependabot dependency updates (round 2)

### Risk review

All 12 updates are patch or minor bumps within the same major. No known breaking changes:

- **@sentry/react** 10.56.0 → 10.57.0 (patch within v10)
- **@supabase/supabase-js** 2.106.2 → 2.108.1 (patch within v2)
- **@tanstack/react-query** 5.100.14 → 5.101.0 (minor within v5; additive only)
- **@vitest/eslint-plugin** 1.6.19 → 1.6.20 (patch)
- **lucide-react** 1.17.0 → 1.18.0 (minor; icon additions)
- **react-hook-form** 7.77.0 → 7.79.0 (patch within v7)
- **react-is** 19.2.6 → 19.2.7 (patch)
- **react-router / react-router-dom** 7.16.0 → 7.17.0 (minor within v7)
- **@tailwindcss/typography** 0.5.19 → 0.5.20 (patch)
- **@vitest/coverage-v8** 4.1.7 → 4.1.8 (patch — already aligned with vitest 4.1.x)
- **prettier** 3.8.3 → 3.8.4 (patch; formatting unchanged)

Note: `@tanstack/react-query` is currently pinned to an exact version (`5.100.14`), so it needs an explicit version bump in `package.json`.

### Steps

1. Update the 12 version entries in `package.json`.
2. Run `npm install --legacy-peer-deps` to refresh `package-lock.json`.
3. Run `npm test` to confirm the full vitest suite still passes.
4. Build runs automatically via the harness.

### Rollback

If anything fails, revert `package.json` + `package-lock.json` and bisect the offending package.
