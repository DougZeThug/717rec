

## Plan: Fix 17 TypeScript build errors in test files

### What's broken

Three test files drifted out of sync with their source types. All errors are in **test files only** — no production code is affected.

### Errors and fixes

**1. `SeasonForm.test.tsx` (1 error)** — `mockSeason` is missing the required `is_archived` field on the `Season` type.
- Add `is_archived: false` to the mock object.

**2. `TeamMembershipApprovalTab.test.tsx` (1 error)** — `mockApproveMembership.mockResolvedValue()` is called with zero args (same TS arity issue we fixed before).
- Change to `mockApproveMembership.mockResolvedValue(undefined)`.

**3. `BracketsViewerComponent.test.tsx` (15 errors)** — The test helpers don't match the current `PlayoffBracket` / `PlayoffTeam` types:
   - `makeBracket` uses `status: 'active'` → the type field is `state` with values `'pending' | 'in_progress' | 'completed'`. Replace with `state: 'in_progress'`.
   - `makeBracket` includes `division_id: null` and `season_id: 'season-1'` → neither exists on `PlayoffBracket`. Remove both (or move `division_id` to the optional `divisionId` string field if needed; tests don't read it, so just remove).
   - `makeTeam` uses `logoUrl: null` → the type field is `logo_url: string | undefined`. Remove the line (it's optional and tests don't read it).
   - The component prop type is `PlayoffBracket & { bracket_data?: InMemoryDatabase['data'] }`, but the helper returns `bracket_data?: unknown`. Change the helper's return-type annotation to match: `PlayoffBracket & { bracket_data?: import('brackets-memory-db').InMemoryDatabase['data'] }`. Since no test sets `bracket_data`, the field stays absent and no test bodies need to change.

### Files touched

- `src/components/admin/seasons/__tests__/SeasonForm.test.tsx` — 1 line
- `src/components/admin/teams/__tests__/TeamMembershipApprovalTab.test.tsx` — 1 line
- `src/components/playoffs/viewer/__tests__/BracketsViewerComponent.test.tsx` — ~6 lines (helper definitions only; test bodies untouched)

### Edge function "errors" in the report

The 4 `Check supabase/functions/...` lines at the top are pre-existing Deno-vs-Node typecheck noise that the project's main build doesn't gate on. They're not new and not caused by recent changes. **Not addressing them in this fix.** If you want them cleaned up, that's a separate plan.

### Verification

Run `npm run typecheck` — all 17 errors should clear. No runtime behavior changes since these are test-only type fixes.

### Rollback

Revert the 3 test files. One step.

