# Clear the 4 "class methods should use this" warnings (JS-0105)

**These 4 warnings are already fixed.** No code change is needed. The fix landed today at 14:07 UTC (commit `2ec91902a`, "Move error-boundary button handlers out of the classes"). DeepSource still lists them because its scan is 16 days old and shows the old code.

The plan below only proves that, so the claim is checked and not assumed.

## Steps

1. **Confirm the 4 flagged methods are gone.** Read both files and show that:
   - `ErrorBoundary.tsx` has plain module functions `reloadPage` and `goHome` (lines 47-53), passed as `onReload={reloadPage} onGoHome={goHome}` (line 109). No `handleReload` / `handleGoHome` class methods.
   - `RouteErrorBoundary.tsx` has plain module functions `goBack` and `goHome` (lines 72-78), passed as `onGoBack={goBack} onGoHome={goHome}` (line 145). No `handleGoBack` / `handleGoHome` class methods.
   - Nothing anywhere still calls `this.handleReload`, `this.handleGoHome` or `this.handleGoBack`.
2. **Confirm the same warning does not hide elsewhere.** Re-run a project-wide scan for class methods whose body never mentions `this`. Today it returns zero hits in `src/`. The only `this`-free method left is `componentDidCatch`, which React must call on the instance; it keeps its existing `skipcq: JS-0105` note that says why.
3. **Confirm nothing broke.** Run the four error-boundary test files, then the type check and the style check.
4. **Report.** Tell Doug the warnings are stale and will clear on DeepSource's next scan of the current code. No publish needed, because no file changes.

## Technical details

- Verification commands:
  - `npm run test:file -- src/components/__tests__/ErrorBoundary.test.tsx`
  - `npm run test:file -- src/components/__tests__/RouteErrorBoundary.test.tsx`
  - `npm run test:file -- src/components/playoffs/__tests__/BracketErrorBoundary.test.tsx`
  - `npm run test:file -- src/components/playoffs/__tests__/BracketCreationErrorBoundary.test.tsx`
  - `npm run typecheck`
  - `npm run lint`
- The pattern scan is a throwaway script under `/tmp` (walks each class body, reports arrow-function class properties whose body never mentions `this`). It is not added to the project.
- Files touched: **none.** The four files above are read only.
- Why the handlers live outside the class: they never needed the instance. `window.location.reload()`, `window.location.href = '/'` and `window.history.back()` are plain browser calls, so moving them out removes the warning and drops one bound function per instance.
- Rollback: not needed, no change. If a later scan still flags these, the fix commit is `2ec91902a`.
