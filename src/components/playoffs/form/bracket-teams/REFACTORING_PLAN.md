
# BracketFormTeams Refactoring Plan - Detailed Implementation

## Phase 1: Complete ✅
- Component analysis completed
- Comprehensive test suite created  
- Current behavior documented

## Phase 2: Extract Data Processing Logic

### Files to Create:

#### 1. `hooks/useTeamDataProcessor.ts`
**Purpose**: Extract complex team data transformation logic
**Responsibilities**:
- Convert rankings to team format
- Add seed numbers based on ranking position
- Map division names to proper UUIDs
- Handle malformed or missing data

**Interface**:
```typescript
export const useTeamDataProcessor = (
  rankings: Ranking[] | null,
  divisions: Division[],
  isDataReady: boolean
) => {
  return {
    processedTeams: Team[],
    processingError: string | null
  };
};
```

#### 2. `hooks/useBracketFormData.ts`
**Purpose**: Combine data fetching, processing, and readiness checks
**Responsibilities**:
- Orchestrate data loading from multiple sources
- Determine overall data readiness state
- Provide centralized error handling
- Manage loading states

**Interface**:
```typescript
export const useBracketFormData = (divisions: Division[]) => {
  return {
    teams: Team[],
    isLoading: boolean,
    isError: boolean,
    errorMessage: string | null,
    isDataReady: boolean
  };
};
```

#### 3. `hooks/useDivisionMapping.ts`
**Purpose**: Extract division name-to-ID mapping logic
**Responsibilities**:
- Create and maintain division lookup map
- Handle missing divisions gracefully
- Memoize mapping for performance

**Interface**:
```typescript
export const useDivisionMapping = (
  divisions: Division[],
  isDataReady: boolean
) => {
  return {
    divisionMap: Map<string, string>,
    mapDivisionName: (name: string) => string | null
  };
};
```

## Phase 3: Extract State Management

#### 4. `hooks/useTeamSelectionState.ts`
**Purpose**: Extract team selection logic and parent sync
**Responsibilities**:
- Manage selected teams state
- Handle team toggle with validation
- Sync with parent onChange callback
- Enforce team limits

**Interface**:
```typescript
export const useTeamSelectionState = (
  maxTeams: number,
  onChange: (ids: string[]) => void,
  initialSelected: string[] = []
) => {
  return {
    selected: Set<string>,
    handleTeamToggle: (teamId: string) => void,
    selectedCount: number,
    selectedArray: string[]
  };
};
```

#### 5. `hooks/useFormValidation.ts`
**Purpose**: Extract validation logic for team requirements
**Responsibilities**:
- Validate minimum/maximum team requirements
- Provide validation messages
- Check form completion status

**Interface**:
```typescript
export const useFormValidation = (
  selectedCount: number,
  maxTeams: number,
  minTeams: number = 2
) => {
  return {
    isValid: boolean,
    validationMessage: string | null,
    canSubmit: boolean
  };
};
```

## Phase 4: Extract UI Components

#### 6. `components/TeamSelectionError.tsx`
**Purpose**: Extract error state rendering
**Responsibilities**:
- Display error messages
- Provide recovery actions (refresh button)
- Handle different error types

#### 7. `components/TeamSelectionLoading.tsx`
**Purpose**: Extract loading state rendering
**Responsibilities**:
- Show loading spinner/skeleton
- Display informative loading messages
- Maintain consistent loading UI

#### 8. `components/TeamSelectionEmpty.tsx`
**Purpose**: Extract empty state rendering
**Responsibilities**:
- Show empty state when no teams available
- Provide helpful guidance to user
- Handle different empty scenarios

#### 9. `components/TeamSelectionForm.tsx`
**Purpose**: Extract main form rendering logic
**Responsibilities**:
- Render team selection interface
- Handle user interactions
- Display team counts and limits

## Phase 5: Create Container Component

#### 10. `BracketFormTeamsContainer.tsx`
**Purpose**: Main container orchestrating all hooks and UI states
**Responsibilities**:
- Combine all extracted hooks
- Determine which UI state to render
- Handle state transitions
- Provide error boundaries

## Phase 6: File Organization

#### 11. Directory Structure:
```
src/components/playoffs/form/bracket-teams/
├── hooks/
│   ├── useTeamDataProcessor.ts
│   ├── useBracketFormData.ts
│   ├── useDivisionMapping.ts
│   ├── useTeamSelectionState.ts
│   ├── useFormValidation.ts
│   └── index.ts
├── components/
│   ├── TeamSelectionError.tsx
│   ├── TeamSelectionLoading.tsx
│   ├── TeamSelectionEmpty.tsx
│   ├── TeamSelectionForm.tsx
│   └── index.ts
├── types/
│   └── index.ts
├── __tests__/
│   ├── BracketFormTeams.comprehensive.test.tsx ✅
│   ├── BracketFormTeams.integration.test.tsx ✅
│   └── hooks/
│       ├── useTeamDataProcessor.test.ts
│       ├── useBracketFormData.test.ts
│       └── [other hook tests]
├── BracketFormTeamsContainer.tsx
└── index.ts
```

## Next Steps:
1. Implement Phase 2: Extract data processing hooks
2. Create unit tests for each extracted hook
3. Verify no functionality is lost during extraction
4. Continue with subsequent phases

## Success Criteria:
- All existing tests continue to pass
- New functionality is identical to original
- Code is more maintainable and testable
- Performance is maintained or improved
- TypeScript types are properly maintained
