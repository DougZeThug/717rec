export * from '../sqlChecks';

// Main facade and types
export type {
  CreateBracketOptions,
  UpdateMatchOptions,
  UpdateSeedingOptions,
} from './BracketManagerService';
export { BracketManagerService, bracketManagerService } from './BracketManagerService';

// Core infrastructure
export { matchUpdateQueue } from './MatchUpdateQueue';
export { SupabaseSqlStorage } from './SupabaseSqlStorage';

// Specialized services (for internal use and testing)
export { BracketAdminService } from './services/BracketAdminService';
export { BracketCreationService } from './services/BracketCreationService';
export { BracketNormalizationService } from './services/BracketNormalizationService';
export { BracketSeedingService } from './services/BracketSeedingService';
export { BracketStandingsService } from './services/BracketStandingsService';
export { BracketUpdateService } from './services/BracketUpdateService';

// Shared types (for consumers of specialized services)
export type * from './types/BracketServiceTypes';
