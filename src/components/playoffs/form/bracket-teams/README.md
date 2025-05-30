
# Bracket Form Teams Module

This module provides a comprehensive team selection system for playoff bracket creation. It handles team data processing, filtering by division, seeding, and user interaction state management.

## Architecture

```
bracket-teams/
├── components/          # UI Components
├── hooks/              # Custom React Hooks
├── types/              # TypeScript Interfaces
├── utils/              # Utility Functions
└── index.ts            # Main Barrel Export
```

## Usage

```typescript
import { BracketFormTeamsContainer } from '@/components/playoffs/form/bracket-teams';

<BracketFormTeamsContainer
  divisionId="div-1"
  maxTeams={16}
  onChange={handleTeamSelection}
  divisions={divisions}
  minTeams={2}
/>
```

## Key Features

- **Team Data Processing**: Converts rankings to seeded teams
- **Division Filtering**: Filter teams by division
- **State Management**: Handles selection state and validation
- **Form Validation**: Real-time validation with progress tracking
- **Error Handling**: Graceful error states and loading indicators

## Components

- `BracketFormTeamsContainer`: Main container component
- `TeamSelectionForm`: Interactive team selection UI
- `TeamSelectionError`: Error state display
- `TeamSelectionLoading`: Loading state display
- `TeamSelectionEmpty`: Empty state display

## Hooks

- `useBracketFormData`: Data fetching and processing
- `useBracketFormState`: Consolidated state management
- `useTeamSelectionState`: Team selection logic
- `useFormValidation`: Form validation and progress
- `useTeamDataProcessor`: Team data transformation
- `useDivisionMapping`: Division name to ID mapping
- `useTeamSelectionEffects`: Side effects management

## Testing

The module includes comprehensive test utilities in `utils/testDataFactory.ts` for creating mock data and test scenarios.
