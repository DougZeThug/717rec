# Fix the failing page-name test for the Join page

## Cause
The new Join page (`/join`) has no name in the page-name list in `src/utils/routeName.ts`. A test checks that every page in the app has a name, so it fails.

## Fix
- Add `'/join': 'Join'` to the list, next to `'/contact': 'Contact'`.

## Checks
- Run `src/utils/__tests__/routeName.test.ts`.
- Run typecheck and lint.

No other code changes. The live site changes only in page labels, for example in error reports.
