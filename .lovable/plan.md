
# Plan: Fix Minor Code Quality Issues

## Overview
Address 4 small code quality issues to improve consistency and reduce technical debt.

## Changes

### 1. Fix Typo in Variable Name
**File:** `src/components/playoffs/BracketDetail.tsx` (line 60)

Change `divisonLower` to `divisionLower` - simple typo fix.

### 2. Use Nullish Coalescing Consistently
**File:** `src/services/matches/MatchReadService.ts` (line 47)

Change `data || []` to `data ?? []` for proper nullish coalescing. This ensures we only fall back to an empty array when `data` is `null` or `undefined`, not when it's falsy (though in practice, the query returns an array or null).

### 3. Remove Redundant Validation
**File:** `src/services/brackets/validation/BracketValidationService.ts` (lines 68-72)

Current code has redundant checks:
```typescript
if (!Array.isArray(data.teams) || data.teams.length === 0) {
  errors.push('At least 2 teams must be selected');
} else if (data.teams.length < 2) {
  errors.push('Minimum 2 teams required for bracket creation');
}
```

The second branch only triggers when `length === 1`, but both messages say the same thing. Consolidate to:
```typescript
if (!Array.isArray(data.teams) || data.teams.length < 2) {
  errors.push('At least 2 teams must be selected');
}
```

### 4. Remove Incomplete Test File
**File:** `src/components/playoffs/__tests__/MatchCard.tbd.test.tsx`

This test file:
- Has `.tbd` in the name indicating it's incomplete
- Only checks that the component doesn't crash (no real assertions)
- Comments acknowledge it doesn't test the actual behavior

A more comprehensive test already exists at `src/components/playoffs/match-card/__tests__/PlayoffMatchCard.test.tsx`. Remove this incomplete file.

## Summary
| File | Change |
|------|--------|
| `BracketDetail.tsx` | Fix typo: `divisonLower` → `divisionLower` |
| `MatchReadService.ts` | Use `??` instead of `\|\|` |
| `BracketValidationService.ts` | Consolidate redundant validation |
| `MatchCard.tbd.test.tsx` | Delete incomplete test file |

**Total: 4 files changed**
