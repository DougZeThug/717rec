

## Approve: Production Dependency Bumps

All 9 updates are minor or patch version bumps with no breaking changes expected:

| Package | From | To | Type |
|---|---|---|---|
| @capgo/capacitor-social-login | 8.3.2 | 8.3.6 | patch |
| @sentry/react | 10.38.0 | 10.39.0 | minor |
| @supabase/supabase-js | 2.96.0 | 2.97.0 | minor |
| framer-motion | 12.34.1 | 12.34.3 | patch |
| lucide-react | 0.564.0 | 0.575.0 | minor |
| react-hook-form | 7.71.1 | 7.71.2 | patch |
| react-intersection-observer | 10.0.2 | 10.0.3 | patch |
| react-resizable-panels | 4.6.4 | 4.6.5 | patch |
| tailwind-merge | 3.4.1 | 3.5.0 | minor |

### Changes

**`package.json`** -- Update version ranges for all 9 dependencies to their new versions.

### Risk Assessment

All updates stay within their major version. The `.npmrc` with `legacy-peer-deps=true` is already in place to handle any transient peer dependency mismatches. No code changes required.

