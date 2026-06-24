## Goal
Silence the DeepSource `JS-0002` "no console in browser code" warnings without changing runtime behavior. All current console calls are intentional — either in Node CLI scripts or in the project's logging/error-reporting wrappers — so the fix is configuration + targeted suppression comments, not removing the calls.

## Audit results

Files containing `console.*` (non-test, non-doc):

1. **Node CLI scripts** (run with `node`, never bundled to the browser):
   - `tools/codemods/palette-tokens.mjs` — flagged
   - `tools/codemods/size-axes.mjs` — same pattern, will be flagged next scan
2. **Browser-side wrappers where console is the whole point**:
   - `src/utils/logger.ts` (4 calls — `log/error/warn/log/log`)
   - `src/utils/sentry.ts` (5 calls — fallback when Sentry transport fails)
   - `src/utils/analytics.ts` (4 calls — dev-mode tracing when GA is disabled)
3. **JSDoc examples only** (not real code, but DeepSource sometimes still flags):
   - `src/utils/performance.ts` line 7
   - `src/services/brackets/manager/BracketManagerService.ts` lines 261/263/307/312

## Changes

### 1. Tell DeepSource the `tools/` scripts are Node, not browser
Update `.deepsource.toml` to add `nodejs` to the JS analyzer environment so CLI scripts under `tools/` stop being treated as browser code:

```toml
[[analyzers]]
name = "javascript"
enabled = true

  [analyzers.meta]
  plugins = ["react"]
  environment = ["browser", "nodejs"]
  dialect = "typescript"
```

This is the documented fix in the DeepSource message itself and clears all 5 flagged occurrences in `tools/codemods/palette-tokens.mjs` plus the equivalent ones in `size-axes.mjs`.

### 2. Suppress intentional browser console calls with `skipcq`
Add `// skipcq: JS-0002` to each console line in:
- `src/utils/logger.ts` (the whole purpose of this file is to wrap console)
- `src/utils/sentry.ts` (final fallback when the Sentry endpoint can't be reached — must surface in devtools)
- `src/utils/analytics.ts` (dev-mode trace output when GA isn't configured)

### 3. Suppress JSDoc-example console references
Add `// skipcq: JS-0002` next to the `console.log` lines inside the JSDoc blocks of `src/utils/performance.ts` and `src/services/brackets/manager/BracketManagerService.ts` only if DeepSource flags them after the other fixes. (These are inside `/** ... */` comments and usually ignored, so this is a contingency, not a guaranteed edit.)

## Out of scope
- Removing or rewriting any logging behavior.
- Test files, markdown docs, and `public/repro/double_elim_repro.html` (standalone repro page) — not part of the app bundle and not flagged.

## Verification
After build mode: re-run DeepSource (or wait for the next scan) and confirm `JS-0002` count drops to 0. No code paths change, so no runtime regression risk.