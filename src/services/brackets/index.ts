
// Public API exports
export * from './types';

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

// Re-export types that would be ambiguous if exported from both modules
// Creating explicit named exports to resolve ambiguity
export type { 
  BracketMatch, 
  BracketGenerationResult, 
  MatchType, 
  PlayInResult,
  SeedTeam
} from './types';

// Explicitly handle ambiguous types by using a namespace or renaming
export { BracketState as BracketStateType } from './database/types';
export { MatchResult as DatabaseMatchResult } from './database/types';
export { PlayoffMatch as DatabasePlayoffMatch } from './database/types';

// Re-export classes and function exports
export * from './BracketGenerator';
export * from './BracketFactory';
export * from './generators/BaseBracketGenerator';
export * from './utils/BracketSizeCalculator';
export * from './utils/TeamSeeding';
export * from './utils/ScoreParser';
export * from './DatabaseAdapter';
export * from './database';
