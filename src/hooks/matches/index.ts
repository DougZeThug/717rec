// Re-export validation utilities
export type { MatchValidationResult } from './utils/matchValidationUtils';
export { validateGameScore } from './utils/matchValidationUtils';

// Re-export other match-related utilities
export type { MatchResultData } from './types/matchSubmissionTypes';
export { determineMatchResults } from './utils/matchResultUtils';
