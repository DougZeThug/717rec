
# Migration Guide: brackets-manager.js Integration

This guide explains how we're transitioning from our custom bracket generation to the `brackets-manager.js` library.

## Why we're migrating

1. **Standardization**: Use a battle-tested library for bracket generation and management
2. **Maintainability**: Reduce the amount of custom code we need to maintain
3. **Features**: Gain access to advanced bracket features without extra development

## Key Changes

### New components

- `BracketsService.ts`: Core integration with brackets-manager.js
- `SupabaseAdapter`: Adapter for Supabase storage with brackets-manager.js

### Modified components

- `BracketService.ts`: Updated to use the new brackets-manager.js integration
- `bracketFetchers.ts`: Updated to use the new data format

## Data Model Changes

The brackets-manager.js library uses a slightly different data model than our custom implementation:

| Our Model | brackets-manager.js Model |
|----------|--------------------------|
| `team1Id`/`team2Id` | `opponent1.id`/`opponent2.id` |
| `nextWinMatchId` | `child_match_id` |
| `nextLoseMatchId` | `child_match_id_loser` |
| `matchType` | `group` |

## Migration Path

1. **New Brackets**: All new brackets will be created with the new system
2. **Existing Brackets**: Will continue to use the legacy system
3. **Gradual Transition**: We may offer migration tools for existing brackets in the future

## Testing

We've added tests to verify that the new brackets-manager.js integration works correctly with our application.
