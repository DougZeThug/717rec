# Plan: address the "1 remaining `any`"

## Finding

There is **no actual `any` type left** in the codebase. I checked three ways:

1. **ESLint** (`@typescript-eslint/no-explicit-any` is set to `error` for both app and test files in `eslint.config.js`) — a full run reports **0 errors, 0 warnings**.
2. **Ripgrep** across `src/`, `tests/`, and `supabase/` for `: any`, `<any>`, `as any`, `any[]`, `Array<any>`, `Record<…, any>`, `Promise<any>` — **0 real hits**.
3. Test files are covered by the same rule, so the earlier `BracketStandingsService.test.ts` cast we removed was the last one.

The only match ripgrep still returns is a **comment** — not a type — in one file:

- `src/components/playoffs/form/bracket-teams/components/BracketFormTeamsContainer.tsx:20`
  `* Phase 4: Type-safe with runtime guards and zero 'as any' casts`

That is a doc line describing that the file is free of `any`. It is not a violation, and the tool that produced the "1 any" count was almost certainly counting this string match.

## Recommended action

**Option A (recommended): do nothing.** The codebase is clean. ESLint enforces it going forward.

**Option B: silence the false positive** so future greps/dashboards read zero. One-line edit to the JSDoc:

```ts
// before
* Phase 4: Type-safe with runtime guards and zero 'as any' casts

// after
* Phase 4: Type-safe with runtime guards and no unchecked casts
```

No behavior change, no test/build impact.

## What I'd do on approval

Apply Option B — rewrite that one comment line in `BracketFormTeamsContainer.tsx` — and re-run `npx eslint .` to confirm still clean. That's the whole change.

Let me know which option you want (or skip both if you prefer to leave it).
