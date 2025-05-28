
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
  async createStage(tournamentId: string, name: string, type: 'single_elimination' | 'double_elimination', seeding: any[]) {
    return manager.create({
      name,
      tournamentId,
      type,
      seeding,
      settings: { grandFinal: 'double' }
    });
  },

  /**
   * Get all matches for a stage
   */
  async getMatches(stageId: string) {
    return manager.get.stageData(stageId);
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
