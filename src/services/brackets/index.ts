
// Public API exports
export * from './types';
// Database types (with explicitly named exports to avoid ambiguity)
export { 
  IBracketRepository,
  IMatchResultService, 
  IPlayoffMatchesRepository, 
  IPlayoffGamesRepository, 
  IResetMatchService,
  ITeamAdvancementService,
  MatchResultDTO,
  DatabaseOperationError
} from './database/types';

export * from './BracketGenerator';
export * from './BracketFactory';
export * from './generators/BaseBracketGenerator';
export * from './utils/BracketSizeCalculator';
export * from './utils/TeamSeeding';
export * from './utils/ScoreParser';
export * from './DatabaseAdapter';
export * from './database';
