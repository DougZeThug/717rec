# Hooks Refactor Plan: Split Complex Hooks

> **Status:** Ready for Implementation
> **Created:** 2026-01-22
> **Branch:** `claude/plan-hooks-refactor-Z1wWF`

---

## Overview

This document outlines the plan to split 5 complex hooks (exceeding 250+ lines) into smaller, focused modules while maintaining **100% backward compatibility**.

### Hooks to Split

| Hook | Lines | Consumers | Risk Level |
|------|-------|-----------|------------|
| `useTeamSeasonBreakdown.ts` | 428 | 1 | Lowest |
| `useMatchUpdates.ts` | 250 | 1 | Low |
| `useSchedulePreview.ts` | 404 | 1 | Medium |
| `usePairingGenerator.ts` | 390 | 1 | Medium |
| `useAuth.ts` | 410 | 2 | Highest |

---

## Critical Safety Rules

### DO:
- ✅ Maintain identical export signatures for all hooks
- ✅ Keep main hooks at original import paths
- ✅ Extract pure utility functions first
- ✅ Test each hook after splitting before proceeding
- ✅ Run `npm run lint` after each change
- ✅ Run `npm run build` before committing

### DO NOT:
- ❌ Change function parameter signatures
- ❌ Remove any exported members (even if unused)
- ❌ Split stateful logic that shares useState across functions
- ❌ Modify consumer files unless absolutely necessary
- ❌ Change TypeScript types that are exported

---

## Implementation Order

Complete each hook fully before moving to the next.

---

## 1. useTeamSeasonBreakdown (Lowest Risk)

### Current Location
```
src/hooks/useTeamSeasonBreakdown.ts (428 lines)
```

### Consumer
```
src/components/teams/TeamAdvancedStatsSection.tsx
```

### Current Exported API
```typescript
{ advancedStats, isLoading, error }
```

### Analysis
- Lines 1-39: Imports and helper functions
- Lines 40-413: `fetchTeamSeasonBreakdown()` pure async function
- Lines 415-428: Actual React hook (14 lines)

### Target Structure
```
src/hooks/teams/seasonBreakdown/
├── index.ts                          # Re-exports useTeamSeasonBreakdown
├── useTeamSeasonBreakdown.ts         # React Query hook (14 lines)
├── fetchTeamSeasonBreakdown.ts       # Main fetch function (~160 lines)
├── processSeasonMatches.ts           # Match processing logic (~120 lines)
├── calculateSeasonStats.ts           # Stats aggregation (~80 lines)
└── types.ts                          # Local type definitions
```

### Step-by-Step Implementation

#### Step 1.1: Create folder structure
```bash
mkdir -p src/hooks/teams/seasonBreakdown
```

#### Step 1.2: Create `types.ts`
Extract these type definitions:
- `DivisionRelation`
- `SeasonRelation`

#### Step 1.3: Create `calculateSeasonStats.ts`
Extract these functions:
- `categorizeDivision()` (lines 22-31)
- `createEmptyDivisionRecord()` (lines 33-38)
- `getWinRate()` helper (lines 384-387)
- Power score trend calculation logic (lines 356-368)
- Best/worst division tier calculation (lines 371-402)

#### Step 1.4: Create `processSeasonMatches.ts`
Extract match processing from `fetchTeamSeasonBreakdown`:
- Sweep/close match detection logic
- Division record calculations
- Playoff match processing

#### Step 1.5: Create `fetchTeamSeasonBreakdown.ts`
Main orchestration function that:
- Runs parallel Supabase queries
- Calls `processSeasonMatches()`
- Calls stats calculation functions
- Returns `TeamAdvancedStats`

#### Step 1.6: Create `useTeamSeasonBreakdown.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchTeamSeasonBreakdown } from './fetchTeamSeasonBreakdown';

export const useTeamSeasonBreakdown = (teamId: string | undefined) => {
  const { data: advancedStats, isLoading, error } = useQuery({
    queryKey: ['team-season-breakdown', teamId],
    queryFn: () => fetchTeamSeasonBreakdown(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  return { advancedStats, isLoading, error };
};
```

#### Step 1.7: Create `index.ts`
```typescript
export { useTeamSeasonBreakdown } from './useTeamSeasonBreakdown';
// Re-export types if needed by consumers
export type { TeamAdvancedStats, SeasonBreakdown } from '@/types/teamAdvancedStats';
```

#### Step 1.8: Update original file
Replace `src/hooks/useTeamSeasonBreakdown.ts` with:
```typescript
// Re-export from new location for backward compatibility
export { useTeamSeasonBreakdown } from './teams/seasonBreakdown';
```

#### Step 1.9: Verify
```bash
npm run lint
npm run build
```

### Verification Checklist
- [ ] `TeamAdvancedStatsSection.tsx` works without changes
- [ ] Build passes with no TypeScript errors
- [ ] Lint passes with no errors

---

## 2. useMatchUpdates (Low Risk)

### Current Location
```
src/hooks/useMatchUpdates.ts (250 lines)
```

### Consumer
```
src/hooks/useMatchManagement.ts (relative import: ./useMatchUpdates)
```

### ⚠️ Important: Naming Collision
There is ANOTHER hook with the same name at:
```
src/components/admin/mass-score-entry/hooks/useMatchUpdates.ts
```
These are completely different hooks. Do NOT modify the mass-score-entry version.

### Current Exported API
```typescript
{
  editingMatch,
  deleteMatchId,
  isDeleting,
  setEditingMatch,
  setDeleteMatchId,
  handleUpdateMatch,
  handleDeleteMatch,
  invalidateAllDataQueries,  // Used internally, must keep exported
}
```

### Target Structure
```
src/hooks/matches/updates/
├── index.ts                      # Re-exports
├── useMatchUpdates.ts            # Main hook with state (~60 lines)
├── useMatchUpdate.ts             # handleUpdateMatch logic (~90 lines)
├── useMatchDelete.ts             # handleDeleteMatch logic (~70 lines)
└── utils/
    ├── statReversalUtils.ts      # Stat reversal helpers (~40 lines)
    └── queryInvalidation.ts      # invalidateAllDataQueries (~20 lines)
```

### Step-by-Step Implementation

#### Step 2.1: Create folder structure
```bash
mkdir -p src/hooks/matches/updates/utils
```

#### Step 2.2: Create `utils/queryInvalidation.ts`
Extract `invalidateAllDataQueries()` function (lines 227-238)

#### Step 2.3: Create `utils/statReversalUtils.ts`
Extract the stat reversal logic used in both update and delete:
- Logic from lines 84-110 (handleUpdateMatch reversal)
- Logic from lines 160-181 (handleDeleteMatch reversal)

Create a shared helper:
```typescript
export const reverseTeamStats = async (
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): Promise<void> => {
  // Extracted logic
};
```

#### Step 2.4: Create `useMatchDelete.ts`
Extract `handleDeleteMatch` as a custom hook that:
- Takes `matches`, `setMatches`, `deleteMatchId`, `setDeleteMatchId`, `setIsDeleting`
- Returns `handleDeleteMatch` function

#### Step 2.5: Create `useMatchUpdate.ts`
Extract `handleUpdateMatch` as a custom hook that:
- Takes `matches`, `setMatches`, `editingMatch`, `setEditingMatch`
- Returns `handleUpdateMatch` function

#### Step 2.6: Create `useMatchUpdates.ts` (main hook)
Compose the sub-hooks:
```typescript
export const useMatchUpdates = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { handleUpdateMatch } = useMatchUpdate(/* params */);
  const { handleDeleteMatch } = useMatchDelete(/* params */);

  return {
    editingMatch,
    deleteMatchId,
    isDeleting,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch,
    invalidateAllDataQueries,
  };
};
```

#### Step 2.7: Create `index.ts`
```typescript
export { useMatchUpdates } from './useMatchUpdates';
```

#### Step 2.8: Update original file
Replace `src/hooks/useMatchUpdates.ts` with:
```typescript
// Re-export from new location for backward compatibility
export { useMatchUpdates } from './matches/updates';
```

#### Step 2.9: Verify
```bash
npm run lint
npm run build
```

### Verification Checklist
- [ ] `useMatchManagement.ts` works without changes (uses relative import)
- [ ] Mass score entry hook is untouched
- [ ] Build passes
- [ ] Lint passes

---

## 3. useSchedulePreview (Medium Risk)

### Current Location
```
src/hooks/useSchedulePreview.ts (404 lines)
```

### Consumer
```
src/components/admin/batch-matches/auto-schedule/hooks/useAutoScheduleSection.ts
```

### Current Exported API
```typescript
{
  autoScheduleStep,
  setAutoScheduleStep,
  isLoading,
  isGenerating,
  timeBlockTeams,
  pairedBlocks,
  generatedPairings,
  unmatchedTeamIds,
  previewSchedule,
  handleGenerateSchedule,
  convertPairingsToMatches,
  getTeamCountStatus,
  performTeamBalancing,
}
```

### Dependencies
- Uses `usePairingGenerator` internally
- Uses `useTeamScheduleLoader` internally

### Target Structure
```
src/hooks/scheduling/
├── index.ts                        # Re-exports
├── useSchedulePreview.ts           # Main orchestration hook (~120 lines)
├── useScheduleValidation.ts        # Validation logic (~60 lines)
├── useDualBlockLogic.ts            # Team balancing (~80 lines)
└── utils/
    └── matchConversionUtils.ts     # convertPairingsToMatches (~100 lines)
```

### Step-by-Step Implementation

#### Step 3.1: Create folder structure
```bash
mkdir -p src/hooks/scheduling/utils
```

#### Step 3.2: Create `utils/matchConversionUtils.ts`
Extract `convertPairingsToMatches()` function (lines 271-387)
This is a pure function with no hook dependencies.

#### Step 3.3: Create `useDualBlockLogic.ts`
Extract:
- `pairedBlocks` state
- `performTeamBalancing()` function (lines 133-158)
- Dual block configuration handling

#### Step 3.4: Create `useScheduleValidation.ts`
Extract validation logic from `previewSchedule()`:
- Odd team block detection (lines 91-104)
- Insufficient block warnings (lines 106-112)
- Integration with `validateTeamCounts` utility

#### Step 3.5: Create main `useSchedulePreview.ts`
Compose all sub-hooks and utilities:
```typescript
export const useSchedulePreview = () => {
  // State
  const [autoScheduleStep, setAutoScheduleStep] = useState<AutoScheduleStep>('teams');

  // Sub-hooks
  const { isLoading, timeBlockTeams, loadTeamsForDate, getTeamCountStatus } = useTeamScheduleLoader();
  const { isGenerating, generatedPairings, unmatchedTeamIds, generateMatchPairings } = usePairingGenerator();
  const { pairedBlocks, performTeamBalancing } = useDualBlockLogic();

  // ... rest of implementation

  return { /* all 13 members */ };
};
```

#### Step 3.6: Create `index.ts`
```typescript
export { useSchedulePreview } from './useSchedulePreview';
export type { AutoScheduleStep } from './useSchedulePreview';
```

#### Step 3.7: Update original file
Replace `src/hooks/useSchedulePreview.ts` with:
```typescript
export { useSchedulePreview, type AutoScheduleStep } from './scheduling';
```

#### Step 3.8: Verify
```bash
npm run lint
npm run build
```

### Verification Checklist
- [ ] `useAutoScheduleSection.ts` works without changes
- [ ] All 13 exported members preserved
- [ ] Build passes
- [ ] Lint passes

---

## 4. usePairingGenerator (Medium Risk)

### Current Location
```
src/hooks/usePairingGenerator.ts (390 lines)
```

### Consumer
```
src/hooks/useAutoSchedule/usePairingOperations.ts
```

### Current Exported API
```typescript
{
  isGenerating,
  generatedPairings,
  unmatchedTeamIds,
  teamBlockMap,
  generateMatchPairings,
}
```

### ⚠️ State Coupling Warning
This hook has tightly coupled state:
- `useState` for `generatedPairings`, `unmatchedTeamIds`, `teamBlockMap`
- These are set INSIDE `generateMatchPairings`
- Splitting the function would break state updates

### Recommended Approach: Minimal Split
Only extract pure utility functions, keep main hook structure intact.

### Target Structure
```
src/hooks/scheduling/
├── usePairingGenerator.ts          # Keep mostly intact (~300 lines)
└── utils/
    ├── dualBlockScheduler.ts       # Dual mode orchestration (~100 lines)
    └── standardPairing.ts          # Standard mode logic (~80 lines)
```

### Step-by-Step Implementation

#### Step 4.1: Create utility files
Extract the mode-specific logic as helper functions:

**`utils/dualBlockScheduler.ts`:**
```typescript
export const scheduleDualBlockPairings = async (
  timeBlockTeams: TimeBlockTeamsMap,
  config: AlgorithmConfig,
  blockMap: Record<string, string[]>,
  historyPairs: [string, string][]
): Promise<{ pairings: TeamPairingMap; unmatchedTeamIds: string[]; diagnostics: SchedulingDiagnostics }> => {
  // Extract lines 110-286 logic
};
```

**`utils/standardPairing.ts`:**
```typescript
export const scheduleStandardPairings = async (
  timeBlockTeams: TimeBlockTeamsMap,
  config: AlgorithmConfig,
  historyPairs: [string, string][]
): Promise<{ pairings: TeamPairingMap; unmatchedTeamIds: string[] }> => {
  // Extract lines 287-344 logic
};
```

#### Step 4.2: Simplify main hook
```typescript
export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string[]>>({});

  const generateMatchPairings = useCallback(async (/* params */) => {
    setIsGenerating(true);
    try {
      // Build block map...

      if (config.dualMatchMode) {
        const result = await scheduleDualBlockPairings(/* params */);
        // Update state...
      } else {
        const result = await scheduleStandardPairings(/* params */);
        // Update state...
      }
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  return { isGenerating, generatedPairings, unmatchedTeamIds, teamBlockMap, generateMatchPairings };
};
```

#### Step 4.3: Verify
```bash
npm run lint
npm run build
```

### Verification Checklist
- [ ] `usePairingOperations.ts` works without changes
- [ ] All 5 exported members preserved
- [ ] State updates still work correctly
- [ ] Build passes
- [ ] Lint passes

---

## 5. useAuth (Highest Risk)

### Current Location
```
src/hooks/useAuth.ts (410 lines)
```

### Consumers
1. `src/contexts/AuthContext.tsx` - uses ALL 14 exported members
2. `src/hooks/useTeamRequests.ts` - uses only `user`

### Current Exported API
```typescript
{
  // State (7)
  session,
  user,
  profile,
  isLoading,
  isProfileLoading,
  authInitialized,
  authError,
  // Actions (7)
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  signInWithGoogleNative,
  refreshProfile,
  clearAuthError,
}
```

### ⚠️ Complex Dependencies
The main `useEffect` (lines 87-230) has complex dependencies:
- `fetchProfile`
- `checkProfileSetup`
- `ensureThemeConsistency`
- `onAuthStateChange` listener

**Do NOT split the useEffect logic.**

### Target Structure
```
src/hooks/auth/
├── index.ts                    # Main useAuth export
├── useAuthState.ts             # State declarations only (~30 lines)
├── useAuthProfile.ts           # Profile fetching logic (~60 lines)
├── useAuthMethods.ts           # Sign in/up/out methods (~150 lines)
├── useAuthInitialization.ts    # Main useEffect (~100 lines)
└── utils/
    └── authErrorHandler.ts     # Error handling utilities (~30 lines)
```

### Step-by-Step Implementation

#### Step 5.1: Create folder structure
```bash
mkdir -p src/hooks/auth/utils
```

#### Step 5.2: Create `utils/authErrorHandler.ts`
Extract error handling:
```typescript
export const handleAuthError = (
  error: Error,
  context: string,
  setAuthError: (error: string | null) => void
): string => {
  const errorMessage = error.message || `An error occurred during ${context}`;
  setAuthError(errorMessage);
  errorLog(`Error during ${context}:`, error);
  toast({
    title: `${context} failed`,
    description: errorMessage,
    variant: 'destructive',
  });
  return errorMessage;
};
```

#### Step 5.3: Create `useAuthProfile.ts`
Extract profile-related functions:
- `fetchProfile()` (lines 53-67)
- `checkProfileSetup()` (lines 70-77)
- `refreshProfile()` (lines 80-84)

```typescript
export const useAuthProfile = (user: User | null, navigate: NavigateFunction) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => { /* ... */ }, []);
  const checkProfileSetup = useCallback((profileData: UserProfile | null) => { /* ... */ }, [navigate]);
  const refreshProfile = useCallback(async () => { /* ... */ }, [user, fetchProfile]);

  return {
    profile,
    setProfile,
    isProfileLoading,
    setIsProfileLoading,
    fetchProfile,
    checkProfileSetup,
    refreshProfile,
  };
};
```

#### Step 5.4: Create `useAuthMethods.ts`
Extract authentication methods:
- `signIn()` (lines 233-266)
- `signUp()` (lines 269-313)
- `signOut()` (lines 316-336)
- `signInWithGoogle()` (lines 339-358)
- `signInWithGoogleNative()` (lines 361-390)

```typescript
export const useAuthMethods = (
  clearAuthError: () => void,
  ensureThemeConsistency: () => void,
  handleAuthError: HandleAuthErrorFn,
  navigate: NavigateFunction
) => {
  const signIn = useCallback(async (email: string, password: string) => { /* ... */ }, [/* deps */]);
  const signUp = useCallback(async (email: string, password: string) => { /* ... */ }, [/* deps */]);
  const signOut = useCallback(async () => { /* ... */ }, [/* deps */]);
  const signInWithGoogle = useCallback(async () => { /* ... */ }, [/* deps */]);
  const signInWithGoogleNative = useCallback(async () => { /* ... */ }, [/* deps */]);

  return { signIn, signUp, signOut, signInWithGoogle, signInWithGoogleNative };
};
```

#### Step 5.5: Create main `index.ts` (useAuth)
Compose all sub-hooks:
```typescript
export const useAuth = () => {
  const navigate = useNavigate();
  const { ensureThemeConsistency } = useThemeConsistency();

  // State
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const handleError = useCallback((error: Error, context: string) => {
    return handleAuthError(error, context, setAuthError);
  }, []);

  // Profile hook
  const {
    profile, setProfile, isProfileLoading, setIsProfileLoading,
    fetchProfile, checkProfileSetup, refreshProfile
  } = useAuthProfile(user, navigate);

  // Auth methods
  const { signIn, signUp, signOut, signInWithGoogle, signInWithGoogleNative } =
    useAuthMethods(clearAuthError, ensureThemeConsistency, handleError, navigate);

  // Initialization effect (keep inline - complex dependencies)
  useEffect(() => {
    // Lines 87-230 - keep this intact
  }, []);

  return {
    session, user, profile, isLoading, isProfileLoading, authInitialized, authError,
    signIn, signUp, signOut, signInWithGoogle, signInWithGoogleNative, refreshProfile, clearAuthError,
  };
};
```

#### Step 5.6: Update original file
Replace `src/hooks/useAuth.ts` with:
```typescript
// Re-export from new location for backward compatibility
export { useAuth } from './auth';
```

#### Step 5.7: Verify
```bash
npm run lint
npm run build
```

### Verification Checklist
- [ ] `AuthContext.tsx` works without ANY changes
- [ ] `useTeamRequests.ts` works without changes
- [ ] All 14 exported members preserved
- [ ] Auth flow still works (sign in, sign out, profile loading)
- [ ] Build passes
- [ ] Lint passes

---

## Post-Implementation Checklist

### After ALL hooks are split:

1. **Run full test suite** (if tests exist)
   ```bash
   npm run test
   ```

2. **Run build**
   ```bash
   npm run build
   ```

3. **Manual testing**
   - [ ] Sign in/out flow works
   - [ ] Team advanced stats page loads
   - [ ] Match update/delete works
   - [ ] Auto-scheduling works
   - [ ] Dual block mode works

4. **Commit with descriptive message**
   ```bash
   git add .
   git commit -m "Refactor: Split complex hooks into smaller, focused modules

   - useTeamSeasonBreakdown: Extract fetch logic and stats calculation
   - useMatchUpdates: Extract update/delete operations and utilities
   - useSchedulePreview: Extract validation and dual block logic
   - usePairingGenerator: Extract scheduling mode utilities
   - useAuth: Extract profile, methods, and error handling

   All exports maintain backward compatibility.
   No changes required to consumer components."
   ```

5. **Push to branch**
   ```bash
   git push -u origin claude/plan-hooks-refactor-Z1wWF
   ```

---

## Rollback Plan

If issues are discovered after implementation:

1. Each hook can be rolled back independently by:
   - Restoring the original file from git
   - Deleting the new folder structure

2. Git commands:
   ```bash
   # Rollback specific hook (example: useAuth)
   git checkout HEAD~1 -- src/hooks/useAuth.ts
   rm -rf src/hooks/auth/
   ```

3. The re-export pattern means consumers never need changes, so rollback is isolated.

---

## Questions to Resolve Before Implementation

1. **Testing:** Are there existing tests for these hooks that need to pass?
2. **Types:** Should type definitions be co-located or kept in `src/types/`?
3. **Index files:** Should `src/hooks/index.ts` be updated to re-export from new locations?

---

*Last updated: 2026-01-22*
