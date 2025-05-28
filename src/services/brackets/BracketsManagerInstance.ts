
import { BracketsManager } from 'brackets-manager';
import { bracketsAdapter } from './adapter/BracketsManagerAdapter';

/**
 * Centralized instance of BracketsManager with our custom adapter
 * This is the single source of truth for bracket operations
 */
export const manager = new BracketsManager(bracketsAdapter as any);

/**
 * Utility functions for working with the brackets manager
 */
export const BracketsManagerUtils = {
  /**
   * Create a new tournament stage
   */
  async createStage(tournamentId: string, name: string, type: 'single_elimination' | 'double_elimination', participants: any[]) {
    return manager.create.stage({
      tournamentId,
      name,
      type,
      participants
    });
  },

  /**
   * Get all matches for a stage
   */
  async getMatches(stageId: string) {
    return manager.get.stageMatches(stageId);
  },

  /**
   * Update a match result
   */
  async updateMatch(matchId: string, result: any) {
    return manager.update.match({
      id: matchId,
      ...result
    });
  }
};
