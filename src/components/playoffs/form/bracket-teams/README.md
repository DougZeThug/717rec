
# Bracket Form Teams Module

## Overview

This module provides components and utilities for team selection in bracket creation forms. It uses a simplified architecture with direct team selection management.

## Architecture

### Components

- **BracketFormTeamsContainer**: Main container component that orchestrates team selection
- **TeamSelectionForm**: Form component for displaying and selecting teams
- **TeamSelectionLoading**: Loading state component
- **TeamSelectionError**: Error state component with retry functionality
- **TeamSelectionEmpty**: Empty state when no teams are available

### Hooks

- **useBracketFormData**: Handles team data fetching and processing
- **useTeamSelectionState**: Manages team selection state and interactions
- **useBracketFormValidation**: Provides form validation logic

### Types

- **BracketFormTeamsContainerProps**: Props for the main container component
- **BracketFormStateResult**: State management result interface
- **ProcessedTeam**: Enhanced team interface with additional playoff-specific data

## Usage

```tsx
import { BracketFormTeamsContainer } from './bracket-teams';

<BracketFormTeamsContainer
  divisionId={selectedDivisionId}
  teams={teamsArray} // Optional - will fetch if not provided
  maxTeams={16}
  minTeams={2}
  divisions={availableDivisions}
  onChange={({ ids, isValid }) => {
    // Handle team selection changes
  }}
/>
```

## Key Features

- **Type-safe**: Full TypeScript support with runtime validation
- **Flexible data sources**: Can use provided teams or fetch from API
- **Real-time validation**: Immediate feedback on selection validity
- **Division filtering**: Automatic filtering by selected division
- **Performance optimized**: Memoized computations and efficient re-renders

## Testing

The module includes comprehensive test coverage:
- Unit tests for individual hooks
- Integration tests for component interactions
- Mock data factories for consistent testing

## Migration Notes

This module replaces the deprecated `BracketFormTeams` component. All functionality has been preserved while improving:
- Type safety
- Performance
- Maintainability
- Test coverage
