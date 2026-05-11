## Goal

All 2183 tests pass, but the test output is polluted by two noisy log streams. Silence them so CI logs stay clean.

## Issues

1. **`Error: Schedule request failed` printed twice** — comes from `src/pages/__tests__/Schedule.test.tsx` test `"shows an error state when schedule loading throws"`. The mock intentionally throws inside render to assert `expect(() => renderPage()).toThrow(...)`. React 18 still logs the caught render error to `console.error` and re-dispatches it via jsdom's event system, producing two stderr lines even though the test passes.

2. **`Not implemented: Window's scrollTo() method` (≈5 lines)** — jsdom doesn't implement `window.scrollTo`. Something during route transitions / page mounts (e.g. `ScrollToTop`-style effect) calls it.

## Fix

### 1. Replace the throwing-render test with an ErrorBoundary assertion

In `src/pages/__tests__/Schedule.test.tsx`, change the error test from "expect render to throw" to "render inside an error boundary and assert the fallback". This avoids React's uncaught-error logging entirely.

- Add a tiny inline `class ErrorBoundary extends React.Component` with `getDerivedStateFromError` that renders a known fallback (e.g. `"Schedule error"`).
- Wrap `<Schedule />` in `renderPage()` (or a variant) with that boundary.
- Silence `console.error` for that single test via `vi.spyOn(console, 'error').mockImplementation(() => {})` then restore in an `afterEach` / inline `mockRestore()`. React still logs once even with a boundary.
- Assertion becomes `expect(screen.getByText('Schedule error')).toBeInTheDocument()`.

### 2. Stub `window.scrollTo` in the global test setup

In `src/setupTests.ts`, add:

```ts
if (!window.scrollTo || window.scrollTo.toString().includes('Not implemented')) {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}
```

(Plus the same on `Element.prototype.scrollTo` for safety.) This removes all "Not implemented: Window's scrollTo()" messages across the suite without changing any production code.

## Verification

- Run `npx vitest run src/pages/__tests__/Schedule.test.tsx` — should pass with no `Error: Schedule request failed` lines in stderr.
- Run `npm test` — full suite should still report 2183 passed with no `scrollTo` "Not implemented" warnings.

## Out of scope

- No production code changes.
- No changes to other tests beyond the one Schedule test case being rewritten.
