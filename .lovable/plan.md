## Problem
Toggling the Challonge fallback on in admin doesn't show anything on `/playoffs`. The fallback is only rendered in `PlayoffPageContent.tsx`, but that component is dead code — the actual page renders `PlayoffPageLayout` → `PlayoffViewSelector` → `PlayoffView` / `AdminView`, none of which include `<ChallongeFallback />`.

## Fix

1. **`src/components/playoffs/layout/PlayoffPageLayout.tsx`** — render `<ChallongeFallback />` above `PlayoffViewSelector`, gated by `useChallongeFallbackConfig()` data:
   - Only render when `config?.enabled === true`.
   - Only when no bracket detail is open (`!data.selectedBracketId`) so it doesn't show inside a bracket page.
   - Skip during initial loading (`!data.isLoading`).

2. **Remove dead-code fallback render** in `src/components/playoffs/PlayoffPageContent.tsx` (component is unused by the live page; leaving the duplicate render risks divergence). Confirm it has no other consumers before removing the import.

3. **Test update** — extend `src/components/playoffs/embeds/__tests__/ChallongeFallback.test.tsx` or add a small layout test verifying the fallback appears when `enabled=true` and is hidden when `enabled=false`/loading.

## Out of scope
- No DB / RLS changes.
- No styling changes to the fallback itself.
- Other security findings on the More panel.
