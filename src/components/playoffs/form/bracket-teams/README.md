
# Bracket Form Teams Module

This module provides a comprehensive team selection system for playoff bracket creation. It handles team data processing, filtering by division, seeding, and user interaction state management.

## Architecture

```
bracket-teams/
├── components/          # UI Components
├── hooks/              # Custom React Hooks
├── types/              # TypeScript Interfaces
├── utils/              # Utility Functions
├── README.md           # Module Documentation
├── IMPORT_GUIDELINES.md # Import Pattern Documentation
└── index.ts            # Main Barrel Export
```

## Usage

```typescript
import { BracketFormTeamsContainer } from '@/components/playoffs/form/bracket-teams';
import { Division } from '@/types'; // Import core types directly

<BracketFormTeamsContainer
  divisionId="div-1"
  maxTeams={16}
  onChange={handleTeamSelection}
  divisions={divisions}
  minTeams={2}
/>
```

## Import Guidelines

**Important**: Always import core types like `Division` and `Team` directly from `@/types` to avoid circular dependencies. See [IMPORT_GUIDELINES.md](./IMPORT_GUIDELINES.md) for detailed patterns.

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

## Type Safety

This module follows strict import guidelines to prevent circular dependencies. All core types are imported directly from `@/types`, while module-specific types are defined locally.
