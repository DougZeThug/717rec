
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
export * from './utils/TypeAdapter';

// Export the DatabaseAdapter from the root directory (not the one in database folder)
export { DatabaseAdapter } from './DatabaseAdapter';
// Export PlayoffDatabaseAdapter from the correct location
export { PlayoffDatabaseAdapter } from './database/PlayoffDatabaseAdapter';
export * from './database';

// Export our linker interfaces and implementations
// But avoid duplicate exports for IBracketLinker
export { 
  IMatchMapOperations,
  IBracketConnectionOperations
} from './linkers/interfaces/BracketLinkerInterfaces';
export * from './linkers/base/AbstractBracketLinker';
export * from './linkers/implementations/StandardBracketLinker';
export * from './linkers/PlayoffBracketLinker';
export * from './linkers/utils/LinkingUtils';
export * from './linkers/utils/BracketLinkingUtilities';
export * from './linkers/utils/FinalsGeneratorUtils';
export * from './linkers/types/MatchLinkingTypes';
