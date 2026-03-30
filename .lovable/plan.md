

## Fix: Dynamic Seed Ordering Based on Bracket Size

### Problem
The current `seedOrdering` is hardcoded as `['inner_outer', 'natural', 'reverse_half_shift', 'reverse']` regardless of bracket size. According to `brackets-manager` docs, the first element controls WB seeding and the remaining elements control LB round orderings. The correct defaults are:

- **Size 8** (6-8 teams): `['inner_outer', 'natural', 'reverse', 'natural']`
- **Size 16** (9-16 teams): `['inner_outer', 'natural', 'reverse_half_shift', 'reverse', 'natural']`

Your current config uses `reverse_half_shift` for 8-team brackets (wrong) and is missing the final `natural` for 16-team brackets. This causes teams that played each other in WB to meet again too early in LB (like Bag Babies vs Birds of Prey).

### Fix

**File: `src/services/brackets/manager/services/BracketCreationService.ts`** (line 83)

Replace the hardcoded array with a dynamic selection based on `bracketSize`:

```typescript
const lbOrderings: Record<number, string[]> = {
  4:  ['natural', 'reverse'],
  8:  ['natural', 'reverse', 'natural'],
  16: ['natural', 'reverse_half_shift', 'reverse', 'natural'],
};
const seedOrdering = ['inner_outer', ...(lbOrderings[bracketSize] || lbOrderings[16])];
```

**One file, ~5 lines changed.** Existing brackets are unaffected — this only applies to newly created brackets.

