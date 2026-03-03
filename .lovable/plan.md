

## Plan: Add Typed Group/Round Interfaces to Viewer Types

Single file change in `src/services/brackets/viewer/types.ts`:

1. Add `BracketGroupRow` and `BracketRoundRow` interfaces
2. Update `ViewerData.groups` from `any[]` to `BracketGroupRow[]`
3. Update `ViewerData.rounds` from `any[]` to `BracketRoundRow[]`

No runtime changes — pure type narrowing.

