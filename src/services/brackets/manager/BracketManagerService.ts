import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import { matchUpdateQueue } from './MatchUpdateQueue';
import { SupabaseSqlStorage } from './SupabaseSqlStorage';
import type {
  BracketOpponent,
  StorageMatch,
  StorageStage,
  StorageGroup,
  StorageRound,
  StorageParticipant,
  MatchUpdatePayload,
  CreateBracketOptions,
  UpdateMatchOptions,
  UpdateSeedingOptions,
  ErrorLike,
} from './types/BracketServiceTypes';
import { isErrorLike, serializeError } from './utils/BracketErrorUtils';
import { BracketNormalizationService } from './services/BracketNormalizationService';
import { BracketAdminService } from './services/BracketAdminService';
import { BracketStandingsService } from './services/BracketStandingsService';
import { BracketSeedingService } from './services/BracketSeedingService';
import { BracketCreationService } from './services/BracketCreationService';

// Re-export public types for consumers
export type { CreateBracketOptions, UpdateMatchOptions, UpdateSeedingOptions } from './types/BracketServiceTypes';

/**
 * Service wrapper for brackets-manager.js with SQL Storage
 * Uses SQL tables (stage, group, round, match, match_game, participant)
 * All operations automatically persist to database
 */
export class BracketManagerService {
  private storage: SupabaseSqlStorage;
  private manager: BracketsManager;
  private normalizationService: BracketNormalizationService;
  private adminService: BracketAdminService;
  private standingsService: BracketStandingsService;
  private seedingService: BracketSeedingService;
  private creationService: BracketCreationService;

  constructor() {
    this.storage = new SupabaseSqlStorage();
    // Enable verbose logging for brackets-manager operations
    const VERBOSE = true;
    this.manager = new BracketsManager(this.storage, VERBOSE);
    this.normalizationService = new BracketNormalizationService(this.storage);
    this.adminService = new BracketAdminService(this.storage);
    this.standingsService = new BracketStandingsService(this.storage, this.manager);
    this.seedingService = new BracketSeedingService(this.storage, this.manager);
    this.creationService = new BracketCreationService(this.storage, this.manager);
  }

  /**
   * Create a new bracket using brackets-manager with SQL storage
   */
  async createBracket(options: CreateBracketOptions): Promise<void> {
    return this.creationService.createBracket(options);
  }

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both win and loss must be explicitly set for proper loser propagation
   * Updates are serialized to prevent race conditions during concurrent updates
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog('🎯 BracketManagerService.updateMatch() START:', { matchId, scores });

    // Serialize updates to prevent race conditions
    return matchUpdateQueue.enqueue(async () => {
      try {
        // ⭐ Fetch current match state before update
        const currentMatch = await this.storage.select('match', matchId);
        bracketLog(`CURRENT MATCH STATE - Match ${matchId}:`, {
          opponent1: currentMatch.opponent1,
          opponent2: currentMatch.opponent2,
          round_id: currentMatch.round_id,
          group_id: currentMatch.group_id,
          number: currentMatch.number,
          stage_id: currentMatch.stage_id,
          status: currentMatch.status,
        });

        // ⭐ Check if this is a BYE match (one opponent is null)
        const isByeMatch = !currentMatch.opponent1 || !currentMatch.opponent2;

        // ⭐ If it's a BYE match and locked/waiting, unlock it for manual advancement
        // Status: 0 = Locked, 1 = Waiting, 2 = Ready, 3 = Running, 4 = Completed, 5 = Archived
        if (isByeMatch && (currentMatch.status === 0 || currentMatch.status === 1)) {
          bracketLog(
            `Unlocking BYE match ${matchId} for manual advancement (status: ${currentMatch.status} -> 2)`
          );

          // Directly update the match status in the database to Ready (2)
          await supabase
            .from('match')
            .update({ status: 2 }) // 2 = Ready
            .eq('id', matchId);

          // ⭐ Update the local object to match the database
          currentMatch.status = 2;

          bracketLog(`BYE match ${matchId} unlocked successfully`);

          // ⭐ FIX: Return early to prevent calling manager.update.match() without scores
          // This prevents BYE matches from being marked as Completed (status 4) without a winner
          return;
        }

        // ⭐ Load participants into cache before update
        const matchData = currentMatch as StorageMatch;
        const stage = (await this.storage.select('stage', matchData.stage_id)) as StorageStage;
        if (stage) {
          await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(
            stage.tournament_id
          );
        }

        bracketLog(`CALLING manager.update.match() with:`, {
          id: matchId,
          opponent1: scores.opponent1,
          opponent2: scores.opponent2,
        });

        // Build update payload - only include opponents that exist
        const updatePayload: MatchUpdatePayload = { id: matchId };

        if (scores.opponent1) {
          updatePayload.opponent1 = {
            score: scores.opponent1.score,
            result: scores.opponent1.result,
          };
        }

        if (scores.opponent2) {
          updatePayload.opponent2 = {
            score: scores.opponent2.score,
            result: scores.opponent2.result,
          };
        }

        bracketLog(`Final update payload:`, updatePayload);

        // Update match using brackets-manager (automatically saves to SQL and handles propagation)
        await this.manager.update.match(updatePayload);

        bracketLog(`manager.update.match() COMPLETED for Match ${matchId}`);

        // ⭐ Normalize LB R1 to fix same-side-twice issues
        const stageId =
          typeof currentMatch.stage_id === 'string'
            ? parseInt(currentMatch.stage_id)
            : currentMatch.stage_id;

        // Run normalization multiple times to catch timing issues
        for (let i = 0; i < 3; i++) {
          await this.normalizationService.normalizeLosersR1(stageId);
          // Small delay to let propagation complete
          if (i < 2) await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // ⭐ Normalize Grand Final population after every update (defensive)
        await this.normalizationService.normalizeGrandFinalPopulation(stageId);

        // ⭐ Fetch and log next matches to see propagation results
        const updatedMatch = await this.storage.select('match', matchId);
        bracketLog(`UPDATED MATCH STATE - Match ${matchId}:`, {
          opponent1: updatedMatch.opponent1,
          opponent2: updatedMatch.opponent2,
        });

        // Log all LB matches to see propagation
        const allMatches = await this.storage.select('match', {
          stage_id: updatedMatch.stage_id,
          group_id: 2, // Loser bracket group
        });
        bracketLog(
          `ALL LB MATCHES after Match ${matchId} update:`,
          allMatches.map((m) => ({
            id: m.id,
            round: m.round_id,
            number: m.number,
            opponent1_id: m.opponent1?.id,
            opponent2_id: m.opponent2?.id,
            opponent1_result: m.opponent1?.result,
            opponent2_result: m.opponent2?.result,
          }))
        );

        bracketLog('Match updated successfully in SQL tables');
        successLog('Match updated successfully', String(matchId));
      } catch (error) {
        failureLog('Failed to update match', error);
        errorLog(`FULL ERROR DETAILS for Match ${matchId}:`, error);
        throw new Error(
          `Match update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  /**
   * Normalize Losers Bracket Round 1 matches to fix duplicate participant issues
   * Detects and fixes cases where the same participant is in both opponent slots
   * @public - Used externally by tests and other services
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    return this.normalizationService.normalizeLosersR1(stageId);
  }

  /**
   * Update the seeding of an existing bracket stage
   * Only allowed if changes don't impact existing match results
   */
  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    return this.seedingService.updateSeeding(options);
  }

  /**
  async canUpdateMatch(matchId: number): Promise<{ canUpdate: boolean; reason?: string }> {
    try {
      const match = await this.storage.select('match', matchId);
      
      // Check if match is already completed
      if (match.status === 4) { // Status 4 = completed
        return { canUpdate: false, reason: 'Match already completed' };
      }
      
      // Check if both participants are known
      if (!match.opponent1?.id || !match.opponent2?.id) {
        return { canUpdate: false, reason: 'Waiting for participants' };
      }
      
      return { canUpdate: true };
    } catch (error) {
      errorLog('Error checking match update status:', error);
      return { canUpdate: false, reason: 'Error checking match status' };
    }
  }

  /**
   * Calculate and store final standings for a completed bracket
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    return this.standingsService.calculateFinalStandings(bracketId);
  }

  /**
   * Get the storage instance for direct access if needed
   */
  getStorage(): SupabaseSqlStorage {
    return this.storage;
  }

  /**
   * Check if a match is eligible for BYE status toggle (public wrapper)
   */
  async checkByeEligibility(matchId: number) {
    return this.adminService.checkByeEligibility(matchId);
  }


  /**
   * Admin-only: Toggle BYE match status between Waiting, Ready, and Completed
   *
   * Supports reopening completed matches with downstream cascade clearing.
   *
   * @param matchId - Match ID in the brackets-manager database
   * @param makeReady - If true, set to Ready (2). If false, revert to Waiting (1)
   * @param clearDownstream - If true, clear downstream matches when reopening completed match
   */
  async adminToggleByeReady(
    matchId: number,
    makeReady: boolean,
    clearDownstream: boolean = false
  ) {
    return this.adminService.adminToggleByeReady(matchId, makeReady, clearDownstream);
  }
}

// Export singleton instance
export const bracketManagerService = new BracketManagerService();
