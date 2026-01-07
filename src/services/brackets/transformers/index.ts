// Re-export match transformers for bracket-specific consumers
// Note: These now delegate to the centralized matchTransformers.ts

export { 
  transformDatabasePlayoffMatch,
  transformDatabasePlayoffMatches,
  transformDatabasePlayoffMatchesWithTeams
} from '@/utils/matchTransformers';

// Legacy aliases for backward compatibility
export { transformDatabasePlayoffMatches as transformSingleEliminationMatches } from '@/utils/matchTransformers';
export { transformDatabasePlayoffMatches as transformDoubleEliminationMatches } from '@/utils/matchTransformers';
