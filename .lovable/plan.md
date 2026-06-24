# Fix the One-Off Lint Errors

Six unrelated lint issues, each touching 1–2 files. Each fix is small and isolated.

## 1. Parse error in `public/progressier.js`
**Error:** `/* eslint-env */ comments are no longer supported`
**Fix:** Add `public/progressier.js` to ESLint's `ignores` list in `eslint.config.js` (it's a third-party vendor script, not our source). Alternatively remove the offending comment from the file's first line.

## 2. `no-require-imports` — `tailwind.config.ts:274`
**Fix:** Replace `require('...')` with an ES import at the top of the file (likely `tailwindcss-animate` or similar plugin). Change `plugins: [require('x')]` to `import x from 'x'` + `plugins: [x]`.

## 3. `no-unsafe-function-type` — `src/pages/__tests__/Contact.test.tsx:78`
**Fix:** Replace the bare `Function` type with an explicit signature, e.g. `(...args: unknown[]) => unknown` or the specific handler signature being mocked.

## 4. `react-hooks/static-components` (3 files)
Components defined inside other components or returned from hooks should be hoisted.
- `src/components/playoffs/form/bracket-teams/components/SeedStatusBadge.tsx` (lines 38, 52)
- `src/components/ui/icon.tsx` (lines 84, 103)
- `src/components/ui/seasonal-icon.tsx` (lines 65, 69)

**Fix:** Move inline component definitions out of their parent component scope so they aren't redefined on each render.

## 5. `react-hooks/immutability` (3 hooks)
Reassigning or mutating values that React Compiler expects to be stable.
- `src/hooks/message-board/useMessageBoard.ts` (lines 69, 81)
- `src/hooks/playoffs/useOptimisticScoreMutation.ts` (lines 132, 144)
- `src/hooks/useScoreSubmissions.ts` (lines 26, 29)

**Fix:** Replace in-place mutations with new object/array creation (spread instead of push/assign).

## 6. `preserve-manual-memoization` (2 files)
`useMemo`/`useCallback` dependency arrays don't match what the React Compiler infers.
- `src/components/admin/opponent-history/OpponentHistoryTab.tsx` (lines 44, 54): change `[data?.teams]` → `[data.teams]` (or read `data` directly) so inferred and declared deps match.
- The message-board and optimistic-score hooks above also fire this — fixing the immutability issue in (5) typically resolves these.

## Verification
Run `npx eslint .` after each group; expect the targeted rule counts to drop to 0 without introducing new errors. Build with `npx tsgo --noEmit -p tsconfig.app.json` to confirm no type regressions.

## Out of scope
- Remaining `set-state-in-effect`, `exhaustive-deps`, `only-export-components`, `prettier`, and the 10 newly-surfaced `no-explicit-any` errors (different files than the prior pass — addressed in a separate task if desired).
