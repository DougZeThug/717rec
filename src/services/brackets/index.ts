
// Public API exports
export type { BracketState } from './types';
export type { MatchResult } from './types';
export type { PlayoffMatch } from './types';

// Non-ambiguous types export from types.ts
export type { 
  SeedTeam,
  BracketGenerationResult, 
  MatchType, 
  PlayInResult,
  PlayoffGame,
  PlayoffMatchType
} from './types';

// Database types (with explicitly named exports to avoid ambiguity)
export type { 
  IBracketRepository,
  IMatchResultService, 
  IPlayoffMatchesRepository, 
  IPlayoffGamesRepository, 
  IResetMatchService,
  ITeamAdvancementService,
  MatchResultDTO,
  DatabaseOperationError
} from './database/types';

// Explicitly handle ambiguous types by using a namespace or renaming
export type { DatabaseBracketState } from './database/types';
export type { DatabaseMatchResult } from './database/types';
export type { DatabasePlayoffMatch } from './database/types';

// Re-export classes and function exports
export * from './BracketGenerator';
export * from './BracketFactory';
export * from './BracketLinker';
export * from './generators/BaseBracketGenerator';
export * from './generators/PlayoffBracketGenerator';
export * from './utils/BracketSizeCalculator';
export * from './utils/TeamSeeding';
export * from './utils/ScoreParser';
// Export the DatabaseAdapter from the root directory (not the one in database folder)
export { DatabaseAdapter } from './DatabaseAdapter';
// Export PlayoffDatabaseAdapter from the correct location
export { PlayoffDatabaseAdapter } from './database/PlayoffDatabaseAdapter';
export * from './database';
export * from './linkers/PlayoffBracketLinker';
