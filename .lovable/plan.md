## Goal

Add tests for the new Challonge fallback feature, matching existing patterns in the repo.

## Tests to add

1. **`src/services/__tests__/ChallongeFallbackService.test.ts`** — mock `@/integrations/supabase/client` (same `mockFrom` pattern used in `BlindDrawService.test.ts`). Covers:
   - `fetchConfig` returns row / throws `DatabaseError` / throws `NotFoundError` when missing.
   - `updateConfig` returns updated row / throws on error.
   - `fetchBrackets` returns array, returns `[]` when data is null, throws on error.
   - `createBracket` returns inserted row / throws on error.
   - `updateBracket` returns updated row / throws on error.
   - `deleteBracket` resolves on success / throws on error.

2. **`src/components/playoffs/embeds/__tests__/ChallongeFallback.test.tsx`** — mock the two hooks (`useChallongeFallbackConfig`, `useChallongeFallbackBrackets`). Covers:
   - Returns `null` when no brackets configured.
   - Renders configured `header_title` and `header_subtitle`.
   - Renders one toggle row per configured bracket.
   - Clicking "Expand All" toggles label to "Collapse All".
   - Clicking a bracket title reveals its iframe with the expected `challonge.com/<slug>/module` URL.

3. **`src/components/admin/challonge-fallback/__tests__/ChallongeFallbackSection.test.tsx`** — mock `useChallongeFallbackConfig`, `useChallongeFallbackBrackets`, and `useChallongeFallbackMutations`. Covers:
   - Shows loading state while queries are loading.
   - Hydrates the form from config (enabled switch, title, subtitle, bracket rows).
   - "Save settings" calls `updateConfig` with the edited values.
   - "Add bracket" appends a draft row whose Save button calls `createBracket`.
   - Editing an existing row and clicking Save calls `updateBracket`.
   - Clicking the trash icon on an existing row calls `deleteBracket`; on a new (unsaved) row removes it locally without a network call.

## Conventions reused

- Vitest + `@testing-library/react`, mocks via `vi.mock` before importing the SUT (as in `BlindDrawService.test.ts` and `HeroCardSectionsAndViews.test.tsx`).
- Service tests assert `DatabaseError` from `@/types/errors`.
- Component tests wrap with `QueryClientProvider` only if a real hook is used — here hooks are mocked, so no provider needed.
- No changes to existing tests; no new dependencies.
