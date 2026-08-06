# Dependency group bump (22 packages)

## What this is

A routine Dependabot-style refresh of runtime and tooling packages. No app features change. Three of the bumps cross a major version and need a quick compatibility check.

## What will be done

1. Raise the declared ranges in `package.json` to the listed targets:
   - Runtime: `@sentry/react` 10.69.0, `@supabase/supabase-js` 2.112.0, `@tanstack/react-query` 5.101.4, `framer-motion` 12.43.0, `lucide-react` 1.28.0, `react-hook-form` 7.84.0, `react-intersection-observer` 11.0.0, `react-window` 2.3.0, `recharts` 3.10.1, `vite-plugin-beasties` 0.4.3 (already at this floor).
   - Tooling: `@playwright/test` 1.62.1, `@size-limit/file` 13.0.3, `@vitejs/plugin-react-swc` 4.3.3, `@vitest/eslint-plugin` 1.6.26, `autoprefixer` 10.5.4, `globals` 17.9.0, `jsdom` 30.0.1, `knip` 6.31.0, `lovable-tagger` 1.3.3, `postcss` 8.5.26 (already above the listed 8.5.25), `prettier` 3.9.6, `size-limit` 13.0.3.
2. Refresh `package-lock.json` with a single `npm install`, keeping public `registry.npmjs.org` URLs.
3. Check the three major bumps:
   - `react-intersection-observer` 10 -> 11: used in `animated-chart-wrapper.tsx` and `MessageFeed.tsx`. Adjust the `useInView` call sites if the option names changed.
   - `jsdom` 29 -> 30: run the Radix-heavy test files to confirm the test environment still behaves.
   - `size-limit` / `@size-limit/file` 12 -> 13: confirm `npm run size` still reads `.size-limit.json` and reports against the existing 150 KB / 1200 KB budgets.
4. Verify: `npm run typecheck`, `npm run lint`, `npm run build`, plus targeted tests for message board, charts, and Radix-heavy pages.
5. If anything breaks, fix the call site rather than pinning back, and report exactly what changed.

## Notes

- React stays on 18; no framework majors are crossed.
- `postcss` and `vite-plugin-beasties` are already at or above the requested versions, so they stay as-is.
