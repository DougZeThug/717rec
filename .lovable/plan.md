## Problem

`src/pages/__tests__/TeamDetails.test.tsx` fails with `TypeError: Cannot read properties of undefined (reading 'add')` inside `react-helmet-async`'s `HelmetDispatcher.init`. This started when `TeamDetails.tsx` was updated to render `<SeoHead />` (which uses `<Helmet>`), but the test renders the page without a `HelmetProvider` context wrapper.

## Fix

Wrap the test render tree in `HelmetProvider` so `<Helmet>` has the `helmetInstances` context it needs.

### Change

`src/pages/__tests__/TeamDetails.test.tsx` — in the `renderPage` helper:

- Import `HelmetProvider` from `react-helmet-async`.
- Wrap the existing `<QueryClientProvider>` tree in a fresh `<HelmetProvider>` per render.

No production code changes. No other tests touched.

## Verification

Run `npx vitest run src/pages/__tests__/TeamDetails.test.tsx` and confirm all 5 tests pass.
