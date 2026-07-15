## Root cause
jsdom does not implement `HTMLCanvasElement.getContext()`. Some test path renders a component (likely a chart via `recharts`/`chart.js` or similar) that calls it, so jsdom logs "Not implemented". The project already has a single Vitest setup file at `src/setupTests.ts` wired via `vitest.config.ts` → `setupFiles: ['./src/setupTests.ts']`.

## Fix
Add a global `HTMLCanvasElement.prototype.getContext` mock to the existing `src/setupTests.ts` (no new setup system, no `canvas` npm package). Keep the mock small but sufficient for typical chart/measure calls.

### Change
- Edit `src/setupTests.ts` only. Append a canvas-context mock block near the other jsdom polyfills (pointer capture, scrollTo, IntersectionObserver).
- Use `vi.fn(() => createMockCanvasContext())` returning stubs for the commonly-called 2D methods (fill/stroke/paths, transforms, text, gradients, images, `measureText`, `getImageData`).
- Cast the assigned value with a narrow `as unknown as HTMLCanvasElement['getContext']` at the boundary to keep TS happy.
- No changes to `vite.config.ts`, `vitest.config.ts`, `package.json`, or any production code.

## Validation
Run available scripts from `package.json`:
- `npm run test:file -- <a previously failing test>` (fast confirmation the jsdom error is gone)
- `npm test` or `npm run test:coverage` (fast gate) for full suite
- `npm run lint`
- `npm run typecheck` (if defined) / otherwise `tsgo`

## Report deliverables
Root cause, files changed (`src/setupTests.ts` only), commands run and their results, and any unrelated remaining failures.

## Question
Do you have the failing test file name / stack trace? Knowing which component triggers `getContext()` (recharts, chart.js, qrcode, jsPDF, html2canvas, etc.) lets me tune the mock precisely. If not, I'll proceed with the general 2D-context mock above.
