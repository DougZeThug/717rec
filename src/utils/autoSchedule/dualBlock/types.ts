
import { TeamPairing } from '@/types/autoSchedule';

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
