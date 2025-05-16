

// Public API exports
export type { BracketState } from './types';
export type { MatchResult } from './types';
export type { PlayoffMatch } from './types';

// Non-ambiguous types export from types.ts
export type { 
  SeedTeam,
  BracketGenerationResult, 
  MatchType, 
  PlayInResult
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
export type { BracketState as DatabaseBracketState } from './database/types';
export type { MatchResult as DatabaseMatchResult } from './database/types';
export type { PlayoffMatch as DatabasePlayoffMatch } from './database/types';

// Re-export classes and function exports
export * from './BracketGenerator';
export * from './BracketFactory';
export * from './generators/BaseBracketGenerator';
export * from './utils/BracketSizeCalculator';
export * from './utils/TeamSeeding';
export * from './utils/ScoreParser';
export * from './DatabaseAdapter';
export * from './database';

