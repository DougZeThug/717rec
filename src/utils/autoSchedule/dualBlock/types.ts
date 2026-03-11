/**
 * Metrics for dual block pairings
 */
export interface DualMatchMetrics {
  /**
   * Number of teams that have matches in both blocks
   */
  teamsWithBothMatches: number;

  /**
   * Number of teams that only have a match in one block
   */
  teamsWithSingleMatch: number;

  /**
   * Score representing how well opponents are distributed between blocks
   * Higher scores indicate better distribution (different opponents in each block)
   */
  crossBlockCompatibility: number;

  /**
   * Number of teams that face the same opponent in both time blocks
   */
  teamsWithDuplicateOpponents: number;

  /**
   * Average compatibility score across all matches in both blocks
   */
  averageCompatibilityScore: number;

  /**
   * Overall quality score for the dual block schedule (0-100)
   */
  overallQualityScore: number;

  /**
   * How balanced the blocks are (teams playing in both blocks)
   */
  blockBalanceScore: number;
}

/**
 * Team opponent tracking for metrics calculation
 */
export interface TeamMatchCount {
  /**
   * Number of matches the team has
   */
  matchCount: number;

  /**
   * IDs of the opponents the team has faced
   */
  opponents: string[];
}

/**
 * Validation result for dual block schedule
 */
export interface DualBlockValidationResult {
  /**
   * Whether the schedule is valid
   */
  isValid: boolean;

  /**
   * Teams with duplicate opponents across blocks
   */
  teamsWithDuplicateOpponents: string[];

  /**
   * Teams that are overbooked (scheduled in overlapping time slots)
   */
  overbookedTeams: string[];

  /**
   * Warning messages
   */
  warnings: string[];

  /**
   * Error messages
   */
  errors: string[];
}
