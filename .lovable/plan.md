

## Fix: Linter warnings in greedy scheduling files

Five minor linter issues across 3 files.

### Changes

**1. `src/utils/scheduling/greedy/index.ts` (line 86)** — JS-0242: `let` to `const`

`relaxationLevel` is never reassigned in this file (it's only reassigned inside `scheduleEven`/`scheduleOdd` via their own local copy). Change `let` to `const`.

**2. `src/utils/scheduling/greedy/scheduleEven.ts` (lines 250-254)** — JS-0246: string concatenation

Replace `template + (ternary)` with a single template literal using `${}` interpolation for the ternary.

**3. `src/utils/scheduling/greedy/scheduleOdd.ts` (lines 207-211)** — JS-0246: same fix

Same pattern — embed the ternary inside the template literal.

**4. `src/utils/scheduling/greedy/slotPairing.ts` (line 78)** — JS-C1002: rename `m` to `existingMatch`

The loop variable `const m = result[k]` should use a descriptive name.

**5. `src/utils/scheduling/greedy/slotPairing.ts` — JS-R1005: cyclomatic complexity of 51**

This is a valid flag but the function is already well-structured with clear comment-delimited sections. Refactoring it would split tightly coupled swap logic across multiple functions with many shared parameters, reducing readability. Add a suppression comment explaining why:

```ts
// eslint-disable-next-line complexity -- swap logic is inherently branchy; splitting reduces clarity
```

### Scope

4 files, cosmetic/linter-only changes. No logic changes.

