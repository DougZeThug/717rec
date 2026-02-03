import { BracketsManager } from 'brackets-manager';

import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  StorageMatch,
  StorageStage,
  UpdateMatchOptions,
  MatchUpdatePayload,
} from '../types/BracketServiceTypes';
import type { BracketNormalizationService } from './BracketNormalizationService';

/**
 * Service responsible for bracket match updates
 * Handles match score updates, BYE propagation, and result normalization
 */
export class BracketUpdateService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager,
    private normalizationService: BracketNormalizationService
  ) {}

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both win and loss must be explicitly set for proper loser propagation
   * Updates are serialized to prevent race conditions during concurrent updates
   */
  async updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog('🎯 BracketUpdateService.updateMatch() START:', { matchId, scores });

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

        // NOTE: BYE handling is done natively by brackets-manager when null values
        // are in the seeding. The library automatically propagates BYE winners.
        // See: https://github.com/Drarig29/brackets-manager.js/blob/master/test/double-elimination.spec.js

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
}
