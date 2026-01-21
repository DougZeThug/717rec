# BracketManagerService Refactoring Plan

## Executive Summary

This document outlines a **safe, incremental refactoring strategy** for splitting the `BracketManagerService.ts` (1,184 lines) into smaller, focused services using the **Facade Pattern**. The key principle is **zero breaking changes** - all existing consumers will continue to work without modification.

---

## Current State Analysis

### File Location
`src/services/brackets/manager/BracketManagerService.ts`

### Current Size
- **Total Lines:** 1,184
- **Methods:** 15
- **Concerns:** 6+

### Current Public API (Used by Consumers)

| Method | Lines | Used By |
|--------|-------|---------|
| `createBracket()` | 168-325 (157 lines) | `bracket-creator.ts` |
| `updateMatch()` | 332-468 (136 lines) | `usePlayoffMatchUpdate.ts`, `BracketsManagerMatchEditor.tsx` |
| `updateSeeding()` | 697-785 (88 lines) | `SeedingUpdateDialog.tsx` |
| `calculateFinalStandings()` | 812-890 (78 lines) | `useBracketCompletion.ts` |
| `checkByeEligibility()` | 1007-1009 (3 lines) | `BracketsManagerMatchEditor.tsx` |
| `adminToggleByeReady()` | 1050-1179 (129 lines) | `BracketsManagerMatchEditor.tsx` |
| `getStorage()` | 895-897 (3 lines) | Potentially internal |

### Current Private Methods

| Method | Lines | Purpose |
|--------|-------|---------|
| `calculateLBRounds()` | 473-479 | Utility for LB round calculation |
| `findLBFinalMatch()` | 484-516 | Find LB Final match for GF population |
| `normalizeGrandFinalPopulation()` | 522-591 | Fix GF population issues |
| `normalizeLosersR1()` | 597-691 | Fix LB R1 duplicate issues |
| `isLosersByeMatch()` | 903-1002 | Check BYE eligibility |
| `checkDownstreamPopulation()` | 1014-1039 | Check if downstream matches populated |

### Current Consumers

1. **`src/hooks/useBracketCompletion.ts`**
   - Uses: `bracketManagerService.calculateFinalStandings(bracketId)`

2. **`src/hooks/playoffs/usePlayoffMatchUpdate.ts`**
   - Uses: `bracketManagerService.updateMatch(options)`

3. **`src/services/bracket-creator.ts`**
   - Uses: `bracketManagerService.createBracket(options)`

4. **`src/components/playoffs/match-score-editor/BracketsManagerMatchEditor.tsx`**
   - Uses: `bracketManagerService.checkByeEligibility(matchId)`
   - Uses: `bracketManagerService.adminToggleByeReady(matchId, makeReady, clearDownstream)`
   - Uses: `bracketManagerService.updateMatch(options)`

5. **`src/components/playoffs/SeedingUpdateDialog.tsx`**
   - Uses: `bracketManagerService.updateSeeding(options)`

---

## Refactoring Strategy: Facade Pattern

### Why Facade Pattern?

The Facade Pattern allows us to:
1. **Keep the existing API unchanged** - `bracketManagerService` singleton remains the single entry point
2. **Delegate to specialized services internally** - New services handle specific concerns
3. **Test incrementally** - Each new service can be tested in isolation
4. **Roll back safely** - If anything breaks, we can revert individual services

### Target Structure

```
src/services/brackets/manager/
├── BracketManagerService.ts      # FACADE - existing API, delegates to specialized services
├── services/
│   ├── BracketCreationService.ts    # createBracket() implementation
│   ├── BracketUpdateService.ts      # updateMatch() implementation
│   ├── BracketNormalizationService.ts # normalize*() methods
│   ├── BracketSeedingService.ts     # updateSeeding() implementation
│   ├── BracketAdminService.ts       # admin operations, BYE handling
│   └── BracketStandingsService.ts   # calculateFinalStandings()
├── utils/
│   ├── BracketErrorUtils.ts         # Error serialization utilities
│   └── BracketQueryUtils.ts         # Common bracket queries
├── types/
│   └── BracketServiceTypes.ts       # Shared types
├── MatchUpdateQueue.ts              # (unchanged)
├── SupabaseSqlStorage.ts            # (unchanged)
└── index.ts                         # (unchanged exports)
```

---

## Implementation Phases

### Phase 0: Pre-Refactoring Setup (Safety Net)
**Risk Level: None**
**Estimated Changes: ~50 lines**

1. **Create a Git branch for the refactoring**
   ```bash
   git checkout -b refactor/bracket-manager-split
   ```

2. **Add integration test coverage for all public methods**
   - Ensure `tests/bracketManagerSchema.test.ts` covers all public methods
   - Add tests for edge cases we discover during analysis

3. **Document current behavior**
   - Log all method signatures and return types
   - Capture current error messages for consistency

---

### Phase 1: Extract Shared Types and Utilities
**Risk Level: Very Low**
**Estimated Changes: ~200 lines**
**Breaking Changes: None**

#### Step 1.1: Create Shared Types File

**Create:** `src/services/brackets/manager/types/BracketServiceTypes.ts`

Extract from `BracketManagerService.ts`:
- `ErrorLike` interface (lines 10-18)
- `BracketOpponent` interface (lines 21-26)
- `StorageMatch` interface (lines 29-38)
- `StorageStage` interface (lines 41-48)
- `StorageGroup` interface (lines 51-55)
- `StorageRound` interface (lines 58-63)
- `StorageParticipant` interface (lines 66-71)
- `MatchUpdatePayload` interface (lines 74-84)

**Example:**
```typescript
// src/services/brackets/manager/types/BracketServiceTypes.ts
export interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  table?: string;
  operation?: string;
  statusCode?: number;
}

// ... rest of interfaces
```

#### Step 1.2: Create Error Utilities File

**Create:** `src/services/brackets/manager/utils/BracketErrorUtils.ts`

Extract from `BracketManagerService.ts`:
- `isErrorLike()` function (lines 89-91)
- `serializeError()` function (lines 96-126)

**Example:**
```typescript
// src/services/brackets/manager/utils/BracketErrorUtils.ts
import type { ErrorLike } from '../types/BracketServiceTypes';

export function isErrorLike(error: unknown): error is ErrorLike {
  return error !== null && typeof error === 'object';
}

export function serializeError(error: unknown): string {
  // ... existing implementation
}
```

#### Step 1.3: Update BracketManagerService to Use Extracted Code

**Modify:** `BracketManagerService.ts`

```typescript
// Add imports at top
import type {
  ErrorLike,
  StorageMatch,
  StorageStage,
  // ...
} from './types/BracketServiceTypes';
import { isErrorLike, serializeError } from './utils/BracketErrorUtils';

// Remove the extracted code (interfaces and functions)
```

#### Step 1.3 Verification:
```bash
npm run lint
npm run build
npm test
```

---

### Phase 2: Extract Normalization Service
**Risk Level: Low**
**Estimated Changes: ~250 lines**
**Breaking Changes: None**

#### Why Start Here?
- Normalization methods are **private** (not used by external consumers)
- They're **pure functions** that operate on storage
- Low risk of breaking external code

#### Step 2.1: Create Normalization Service

**Create:** `src/services/brackets/manager/services/BracketNormalizationService.ts`

Extract these methods:
- `calculateLBRounds()` (lines 473-479)
- `findLBFinalMatch()` (lines 484-516)
- `normalizeGrandFinalPopulation()` (lines 522-591)
- `normalizeLosersR1()` (lines 597-691)

**Example:**
```typescript
// src/services/brackets/manager/services/BracketNormalizationService.ts
import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, successLog } from '@/utils/logger';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageMatch, StorageGroup, StorageRound } from '../types/BracketServiceTypes';

export class BracketNormalizationService {
  constructor(private storage: SupabaseSqlStorage) {}

  /**
   * Calculate the total number of Loser Bracket rounds based on bracket size
   */
  calculateLBRounds(bracketSize: number): number {
    return Math.log2(bracketSize) * 2 - 2;
  }

  /**
   * Find the LB Final match for a given stage
   */
  async findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    // ... existing implementation
  }

  /**
   * Normalize Grand Final population after LB Final
   */
  async normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    // ... existing implementation
  }

  /**
   * Normalize Losers Bracket Round 1 matches
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    // ... existing implementation
  }
}
```

#### Step 2.2: Integrate into BracketManagerService

**Modify:** `BracketManagerService.ts`

```typescript
import { BracketNormalizationService } from './services/BracketNormalizationService';

export class BracketManagerService {
  private storage: SupabaseSqlStorage;
  private manager: BracketsManager;
  private normalizationService: BracketNormalizationService;

  constructor() {
    this.storage = new SupabaseSqlStorage();
    this.manager = new BracketsManager(this.storage, true);
    this.normalizationService = new BracketNormalizationService(this.storage);
  }

  // In updateMatch(), replace:
  // await this.normalizeLosersR1(stageId);
  // with:
  // await this.normalizationService.normalizeLosersR1(stageId);

  // Similarly for normalizeGrandFinalPopulation()
}
```

#### Step 2.2 Verification:
```bash
npm run lint
npm run build
npm test
# Manual test: Update a match in development and verify normalization still works
```

---

### Phase 3: Extract Admin Service
**Risk Level: Low-Medium**
**Estimated Changes: ~200 lines**
**Breaking Changes: None**

#### Step 3.1: Create Admin Service

**Create:** `src/services/brackets/manager/services/BracketAdminService.ts`

Extract these methods:
- `isLosersByeMatch()` (lines 903-1002)
- `checkByeEligibility()` (lines 1007-1009)
- `checkDownstreamPopulation()` (lines 1014-1039)
- `adminToggleByeReady()` (lines 1050-1179)

**Example:**
```typescript
// src/services/brackets/manager/services/BracketAdminService.ts
import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';

export class BracketAdminService {
  constructor(private storage: SupabaseSqlStorage) {}

  async checkByeEligibility(matchId: number) {
    return this.isLosersByeMatch(matchId);
  }

  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ): Promise<{
    matchId: number;
    status: number;
    statusName: string;
    message: string;
  }> {
    // ... existing implementation
  }

  private async isLosersByeMatch(matchId: number): Promise<{...}> {
    // ... existing implementation
  }

  private async checkDownstreamPopulation(matchId: number): Promise<{...}> {
    // ... existing implementation
  }
}
```

#### Step 3.2: Integrate into BracketManagerService

```typescript
import { BracketAdminService } from './services/BracketAdminService';

export class BracketManagerService {
  private adminService: BracketAdminService;

  constructor() {
    // ... existing
    this.adminService = new BracketAdminService(this.storage);
  }

  // Delegate to admin service
  async checkByeEligibility(matchId: number) {
    return this.adminService.checkByeEligibility(matchId);
  }

  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ) {
    return this.adminService.adminToggleByeReady(matchId, makeReady, clearDownstream);
  }
}
```

---

### Phase 4: Extract Standings Service
**Risk Level: Low**
**Estimated Changes: ~100 lines**
**Breaking Changes: None**

#### Step 4.1: Create Standings Service

**Create:** `src/services/brackets/manager/services/BracketStandingsService.ts`

Extract:
- `calculateFinalStandings()` (lines 812-890)

**Example:**
```typescript
// src/services/brackets/manager/services/BracketStandingsService.ts
import { supabase } from '@/integrations/supabase/client';
import { BracketsManager } from 'brackets-manager';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageStage, StorageParticipant } from '../types/BracketServiceTypes';

export class BracketStandingsService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager
  ) {}

  async calculateFinalStandings(bracketId: string): Promise<void> {
    // ... existing implementation
  }
}
```

---

### Phase 5: Extract Seeding Service
**Risk Level: Medium**
**Estimated Changes: ~120 lines**
**Breaking Changes: None**

#### Step 5.1: Create Seeding Service

**Create:** `src/services/brackets/manager/services/BracketSeedingService.ts`

Extract:
- `updateSeeding()` (lines 697-785)

---

### Phase 6: Extract Creation Service
**Risk Level: Medium-High**
**Estimated Changes: ~180 lines**
**Breaking Changes: None**

**Note:** This is higher risk because `createBracket()` is a critical path. Extra testing required.

#### Step 6.1: Create Creation Service

**Create:** `src/services/brackets/manager/services/BracketCreationService.ts`

Extract:
- `createBracket()` (lines 168-325)

---

### Phase 7: Extract Update Service
**Risk Level: High**
**Estimated Changes: ~160 lines**
**Breaking Changes: None**

**Note:** This is the highest risk because `updateMatch()` is the most frequently used method.

#### Step 7.1: Create Update Service

**Create:** `src/services/brackets/manager/services/BracketUpdateService.ts`

Extract:
- `updateMatch()` (lines 332-468)

This service will depend on:
- `BracketNormalizationService` (for calling normalize methods)
- `matchUpdateQueue` (for serialization)

---

### Phase 8: Final Cleanup
**Risk Level: Low**
**Estimated Changes: ~50 lines**
**Breaking Changes: None**

1. Update `index.ts` to export new services (optional, for internal use)
2. Add JSDoc comments to facade methods
3. Update documentation

---

## Final BracketManagerService (Facade)

After all phases, the `BracketManagerService.ts` should look like this:

```typescript
// src/services/brackets/manager/BracketManagerService.ts
import { BracketsManager } from 'brackets-manager';
import { SupabaseSqlStorage } from './SupabaseSqlStorage';
import { BracketCreationService } from './services/BracketCreationService';
import { BracketUpdateService } from './services/BracketUpdateService';
import { BracketNormalizationService } from './services/BracketNormalizationService';
import { BracketSeedingService } from './services/BracketSeedingService';
import { BracketAdminService } from './services/BracketAdminService';
import { BracketStandingsService } from './services/BracketStandingsService';

// Re-export types for consumers
export type { CreateBracketOptions, UpdateMatchOptions, UpdateSeedingOptions } from './types/BracketServiceTypes';

/**
 * Facade for bracket management operations
 * Delegates to specialized services while maintaining backward compatibility
 */
export class BracketManagerService {
  private storage: SupabaseSqlStorage;
  private manager: BracketsManager;

  private creationService: BracketCreationService;
  private updateService: BracketUpdateService;
  private normalizationService: BracketNormalizationService;
  private seedingService: BracketSeedingService;
  private adminService: BracketAdminService;
  private standingsService: BracketStandingsService;

  constructor() {
    this.storage = new SupabaseSqlStorage();
    this.manager = new BracketsManager(this.storage, true);

    // Initialize specialized services
    this.normalizationService = new BracketNormalizationService(this.storage);
    this.creationService = new BracketCreationService(this.storage, this.manager);
    this.updateService = new BracketUpdateService(this.storage, this.manager, this.normalizationService);
    this.seedingService = new BracketSeedingService(this.storage, this.manager);
    this.adminService = new BracketAdminService(this.storage);
    this.standingsService = new BracketStandingsService(this.storage, this.manager);
  }

  // === PUBLIC API (unchanged signatures) ===

  async createBracket(options: CreateBracketOptions): Promise<void> {
    return this.creationService.createBracket(options);
  }

  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    return this.updateService.updateMatch(options);
  }

  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    return this.seedingService.updateSeeding(options);
  }

  async calculateFinalStandings(bracketId: string): Promise<void> {
    return this.standingsService.calculateFinalStandings(bracketId);
  }

  async checkByeEligibility(matchId: number) {
    return this.adminService.checkByeEligibility(matchId);
  }

  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ) {
    return this.adminService.adminToggleByeReady(matchId, makeReady, clearDownstream);
  }

  getStorage(): SupabaseSqlStorage {
    return this.storage;
  }

  // Expose normalizeLosersR1 for direct calls (used in some places)
  async normalizeLosersR1(stageId: number): Promise<void> {
    return this.normalizationService.normalizeLosersR1(stageId);
  }
}

// Export singleton instance (maintains existing pattern)
export const bracketManagerService = new BracketManagerService();
```

**Final line count:** ~80 lines (down from 1,184)

---

## Testing Strategy

### Before Each Phase
1. Run full test suite: `npm test`
2. Run build: `npm run build`
3. Run lint: `npm run lint`

### After Each Phase
1. Repeat all above
2. Manual testing in development:
   - Create a new bracket
   - Update match scores
   - Verify winner propagation
   - Test BYE handling
   - Test seeding updates

### Integration Tests to Add
```typescript
// tests/bracketManagerServiceFacade.test.ts
describe('BracketManagerService Facade', () => {
  it('should delegate createBracket to CreationService');
  it('should delegate updateMatch to UpdateService');
  it('should delegate updateSeeding to SeedingService');
  it('should delegate calculateFinalStandings to StandingsService');
  it('should delegate checkByeEligibility to AdminService');
  it('should delegate adminToggleByeReady to AdminService');
});
```

---

## Rollback Plan

If any phase causes issues:

1. **Immediate:** Revert the last commit
   ```bash
   git revert HEAD
   ```

2. **If multiple commits affected:** Reset to last known good state
   ```bash
   git log --oneline  # Find the commit hash
   git reset --hard <commit-hash>
   ```

3. **Document the issue** before retrying

---

## Success Criteria

- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] All 5 consumer files work without changes
- [ ] Manual testing passes:
  - [ ] Bracket creation works
  - [ ] Match updates work with winner propagation
  - [ ] Seeding updates work
  - [ ] BYE handling works
  - [ ] Final standings calculation works
- [ ] Final `BracketManagerService.ts` is under 100 lines

---

## Estimated Timeline (If Uninterrupted)

| Phase | Description | Effort |
|-------|-------------|--------|
| Phase 0 | Setup & Safety Net | Small |
| Phase 1 | Extract Types & Utils | Small |
| Phase 2 | Extract Normalization | Small |
| Phase 3 | Extract Admin | Small |
| Phase 4 | Extract Standings | Small |
| Phase 5 | Extract Seeding | Medium |
| Phase 6 | Extract Creation | Medium |
| Phase 7 | Extract Update | Medium |
| Phase 8 | Cleanup | Small |

---

## Questions to Address Before Starting

1. **Should we add more comprehensive tests first?**
   - Current test coverage may not catch all edge cases

2. **Do we want to expose the new services directly?**
   - Currently planning to keep them internal (only facade exposed)
   - Could expose them for more granular testing/control

3. **Should we consider a different pattern?**
   - Alternative: Mixin pattern
   - Alternative: Functional composition
   - Recommendation: Stick with Facade for simplicity

---

## Appendix: File Size Estimates After Refactoring

| File | Estimated Lines |
|------|-----------------|
| `BracketManagerService.ts` (Facade) | ~80 |
| `BracketCreationService.ts` | ~180 |
| `BracketUpdateService.ts` | ~160 |
| `BracketNormalizationService.ts` | ~200 |
| `BracketSeedingService.ts` | ~120 |
| `BracketAdminService.ts` | ~180 |
| `BracketStandingsService.ts` | ~100 |
| `BracketServiceTypes.ts` | ~100 |
| `BracketErrorUtils.ts` | ~50 |
| **Total** | **~1,170** |

The total lines will be similar, but now spread across focused, testable modules.
