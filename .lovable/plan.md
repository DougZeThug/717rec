# Dependabot Dependency Updates — Plan

## Context
Two Dependabot PRs are being applied together: one for production dependencies and one for dev dependencies. All bumps are patch or minor versions — no major version jumps.

## Packages to Update

### Production dependencies
| Package | From | To |
|---------|------|-----|
| @hookform/resolvers | ^5.2.2 | ^5.4.0 |
| @supabase/supabase-js | ^2.105.4 | ^2.106.1 |
| @tanstack/react-query | 5.100.10 | 5.100.14 |
| @vitest/eslint-plugin | ^1.6.17 | ^1.6.18 |
| date-fns | ^4.1.0 | ^4.3.0 |
| framer-motion | ^12.38.0 | ^12.40.0 |
| react-hook-form | 7.76.0 | 7.76.1 |
| react-resizable-panels | 4.11.1 | 4.11.2 |

### Dev dependencies
| Package | From | To |
|---------|------|-----|
| @types/node | ^25.8.0 | ^25.9.1 |
| vitest | 4.1.6 | 4.1.7 |
| @vitest/coverage-v8 | 4.1.6 | 4.1.7 |
| postcss | ^8.5.14 | ^8.5.15 |

## Steps

1. **Update package.json** — Update all 12 version strings to match the target versions.
2. **Install dependencies** — Run `npm install` (`.npmrc` has `legacy-peer-deps=true`) to update `package-lock.json`.
3. **Run test suite** — Execute `npm test` to confirm no regressions.
4. **Verify build** — Run `npm run build` to ensure the production build still compiles cleanly.

## Risk Assessment
- All changes are patch/minor bumps — breaking changes are highly unlikely.
- `framer-motion`, `react-hook-form`, and `@tanstack/react-query` are heavily used in the UI; tests will surface any issues.
- `vitest` bump affects the test runner and coverage reporter; test execution will validate this.

## Rollback
If tests or build fail, revert `package.json` and `package-lock.json`, then re-install to return to the prior state.