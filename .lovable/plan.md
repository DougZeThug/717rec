# Fix the UserMenu test isolation failure

## The problem

- 11 of 12 UserMenu tests fail when the whole file runs, but every test passes alone.
- Cause: a test opens the user menu and never closes it. Radix leaves marks on the page body (pointer-events blocked, hidden wrappers). The next test's first click lands on that leftover state instead of the button.
- This is not caused by the dependency bump. The same failures happen on the old package versions.

## The fix

1. Close the menu at the end of each test in `src/components/auth/__tests__/UserMenu.test.tsx`
   - Add an `afterEach` that presses Escape when a menu is open, then lets React Testing Library clean up.
2. Clear Radix leftovers globally in `src/setupTests.ts`
   - After each test, remove `pointer-events` from `document.body` style and drop any leftover Radix portal containers.
   - This protects every other test file that uses a dropdown, popover or dialog, not only this one.
3. Delete the temporary investigation file `src/components/auth/__tests__/temp.test.tsx`.

No change to `UserMenu.tsx` or any app behaviour. Test-only change.

## Verification

- `npm run test:file -- src/components/auth/__tests__/UserMenu.test.tsx` — expect 12 passed.
- Auth gate: run the auth test folders — expect all passed.
- `npm run typecheck` and lint — expect clean.

## Not in this plan

The dependency bump is a separate job. TypeScript 7 still breaks `typescript-eslint`, so the bump stays reverted until you decide how to handle that. Package versions are untouched here.
