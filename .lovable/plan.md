## Fix duplicate exports in `src/utils/colors/index.ts`

The file re-exports everything from `./powerScoreColors` (which already exports `formatPowerScore`) and also re-exports `getDivisionGradientClass` / `getDivisionStyles` from the design-system, then redeclares `formatPowerScore` locally — producing four JS-E1004 duplicate-export errors.

### Change

Edit `src/utils/colors/index.ts`:

1. Remove the local `formatPowerScore` const at the bottom (it duplicates the one already re-exported from `./powerScoreColors`, and uses a different format — `.toFixed(2)` vs `.toFixed(1)`). The canonical one in `powerScoreColors.ts` returns `'N/A'` for null/undefined and `.toFixed(1)`, matching what the rest of the codebase already uses via `@/utils/colors/powerScoreColors` and `@/utils/powerScore`.
2. Remove the explicit `export { getDivisionGradientClass, getDivisionStyles } from '@/styles/design-system/divisions';` line — these names already come through `export * from './divisionColors'` (verify) **or** keep this line and instead drop it from whichever sub-module re-exports it. Based on the duplicate warning, the collision is between this explicit re-export and one of the `export *` lines above; I'll grep to confirm which sub-module owns it and remove the duplicate side, keeping the design-system source as the single origin.

### Verification

- `npx eslint src/utils/colors/index.ts`
- `npm run typecheck`
- Spot-check that `formatPowerScore` callers still render one decimal (existing behavior from `powerScoreColors.ts`).

### Risk

Very low. One file, only removes duplicate re-exports. The only behavioral nuance is the local `.toFixed(2)` version being dropped in favor of the `.toFixed(1)` version that the rest of the app already imports directly.
