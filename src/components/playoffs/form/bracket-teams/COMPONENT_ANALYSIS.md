
# BracketFormTeams Component Analysis

## Current Responsibilities

### 1. Data Fetching
- Fetches team rankings via `useTeamRankings()` hook
- Receives divisions data as prop from parent component
- Manages loading states for asynchronous data

### 2. Data Transformation
- Converts rankings data to team format with seed numbers
- Maps division names to division IDs using lookup map
- Transforms raw ranking data into structured team objects with all required fields

### 3. Data Processing & Validation
- Checks data readiness before processing (both rankings and divisions must be loaded)
- Creates division name-to-ID mapping for proper team assignment
- Handles missing or invalid data gracefully

### 4. Filtering Logic
- Uses `useFilteredTeams` hook to filter teams by selected division
- Handles cases where no teams exist for selected division
- Manages filtered team state updates

### 5. Team Selection Logic
- Uses `useTeamSelection` hook for managing selected teams
- Enforces maximum team limits during selection
- Syncs selection state with parent component via onChange callback
- Handles team toggle operations with validation

### 6. Team Seeding
- Uses `useTeamSeeding` hook to apply proper seeding to filtered teams
- Maintains seed order based on power rankings

### 7. Error State Management
- Detects and handles error states (failed data loading)
- Shows appropriate error messages and recovery options
- Handles edge cases gracefully

### 8. Loading State Management
- Shows loading indicators while data is being fetched
- Prevents user interaction during loading states
- Provides informative loading messages

### 9. UI Rendering
- Renders FormField with proper labels and descriptions
- Shows team selection summary with counts
- Displays SimpleTeamSelectionList for team interaction
- Renders different UI states (loading, error, empty, success)

## Props Interface
```typescript
interface BracketFormTeamsProps {
  divisionId: string | null;     // Selected division filter
  maxTeams: number;              // Maximum teams allowed
  onChange: (ids: string[]) => void; // Callback for selection changes
  divisions?: { id: string; name: string }[]; // Available divisions
}
```

## State Dependencies
- `rankings` - from useTeamRankings hook
- `rankingsLoading` - loading state for rankings
- `selected` - from useTeamSelection hook
- `filteredTeams` - computed from useFilteredTeams hook
- `seededTeams` - computed from useTeamSeeding hook

## Side Effects
1. **onChange Callback**: Syncs selected team IDs with parent component
2. **Division Mapping**: Creates lookup map when divisions data changes
3. **Team Processing**: Transforms rankings data when data becomes ready
4. **Selection Validation**: Enforces team limits during selection

## User Interactions
1. **Team Selection**: Click to toggle team selection (via SimpleTeamSelectionList)
2. **Error Recovery**: Refresh page button in error states
3. **Loading States**: Visual feedback during data loading

## Error Scenarios
1. **Failed Rankings Load**: Shows error with refresh option
2. **No Divisions**: Shows message about no divisions available
3. **No Teams in Division**: Shows empty state for selected division
4. **Data Processing Errors**: Graceful fallbacks with logging

## Performance Considerations
- Uses React.useMemo for expensive computations (division mapping, team processing)
- Uses React.useCallback for event handlers
- Proper dependency arrays to prevent unnecessary re-renders

## Testing Requirements
- Mock all external hooks (useTeamRankings, useFilteredTeams, etc.)
- Test all UI states (loading, error, empty, success)
- Test data transformation logic
- Test user interactions (team selection/deselection)
- Test edge cases and error scenarios
- Test prop changes and their effects
- Test performance (memoization working correctly)
