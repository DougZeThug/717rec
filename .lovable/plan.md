## Goal
Eliminate the `JS-E1004` duplicate-export warnings flagged by DeepSource in two barrel files, without changing any runtime behavior or public import paths.

## Findings

**1. `src/components/ui/charts/index.ts`**
- `ChartTooltip.tsx` re-exports `ChartTooltipContent` (`export { ChartTooltipContent } from './ChartTooltipContent'`) so consumers can do `import { ChartTooltip, ChartTooltipContent } from '@/components/ui/charts'`.
- The barrel then also does `export * from './ChartTooltip'` AND `export * from './ChartTooltipContent'`, exporting the same symbol twice.

**2. `src/services/brackets/manager/index.ts`**
- `BracketManagerService.ts` re-exports `CreateBracketOptions`, `UpdateMatchOptions`, `UpdateSeedingOptions` from `./types/BracketServiceTypes`.
- The barrel re-exports `BracketManagerService` (which surfaces those types) AND does `export type * from './types/BracketServiceTypes'`, exporting the same three type names twice.

Other barrels under `src/` were spot-checked — no further duplicate-named re-exports detected.

## Plan

### Fix 1 — charts barrel
In `src/components/ui/charts/index.ts`, drop the redundant `export * from './ChartTooltipContent'` line. `ChartTooltipContent` continues to be exported via `ChartTooltip.tsx`, so all existing imports keep working.

### Fix 2 — bracket manager barrel
In `src/services/brackets/manager/BracketManagerService.ts`, remove the inline `export type { CreateBracketOptions, UpdateMatchOptions, UpdateSeedingOptions }` block. The barrel's `export type * from './types/BracketServiceTypes'` already exposes them to consumers, and `BracketManagerService.ts` keeps its local `import type` for internal use.

This keeps `BracketServiceTypes` as the single source of truth (matches the comment "Shared types (for consumers of specialized services)") and avoids breaking any consumer importing from either the barrel or from `BracketManagerService` directly — quick `rg` confirmed no code imports those option types directly from `BracketManagerService.ts`; they come via the barrel.

### Verification
- `npx tsgo --noEmit` to confirm clean TS build.
- `npx eslint src/components/ui/charts src/services/brackets/manager` to confirm no new lint issues.

No other files change. No runtime behavior change.
