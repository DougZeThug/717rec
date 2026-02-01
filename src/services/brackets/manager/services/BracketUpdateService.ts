import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  StorageMatch,
  StorageStage,
  StorageGroup,
  StorageRound,
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

          bracketLog(`BYE match ${matchId} unlocked successfully - continuing to apply scores`);

          // ⭐ FIX: Don't return early - continue to apply scores in the same transaction
          // This allows BYE matches to be unlocked and scored in a single operation
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

        // ⭐ Auto-advance any LB BYE matches that now have one real opponent
        await this.autoAdvanceLBByes(stageId);

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
   * Auto-advance Losers Bracket BYE matches.
   *
   * After a match update, some LB matches may now have exactly one real opponent
   * and one null (BYE) opponent. This method finds those matches and auto-advances
   * the real team by calling manager.update.match() with a win result.
   *
   * Runs in a loop to handle cascading BYEs (e.g., advancing a team may reveal
   * another BYE match in the next LB round).
   */
  private async autoAdvanceLBByes(stageId: number): Promise<void> {
    try {
      // Find LB group (group number 2)
      const groups = await this.storage.select('group', { stage_id: stageId });
      const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
      const lbGroup = groupsArray.find((g) => g.number === 2);

      if (!lbGroup) return;

      // Loop to handle cascading BYEs
      const MAX_PASSES = 10; // Safety limit
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        // Reload participants before each pass so brackets-manager has fresh data
        const stage = (await this.storage.select('stage', stageId)) as StorageStage;
        if (stage) {
          await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(
            stage.tournament_id
          );
        }

        // Get all LB matches
        const matches = await this.storage.select('match', { group_id: lbGroup.id });
        const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

        // Find BYE matches: exactly one real opponent, other is null, not yet completed
        const byeMatches = matchesArray.filter((m) => {
          if (m.status >= 4) return false; // Already completed
          const hasOpp1 = m.opponent1 !== null && m.opponent1 !== undefined && !!m.opponent1?.id;
          const hasOpp2 = m.opponent2 !== null && m.opponent2 !== undefined && !!m.opponent2?.id;
          // Exactly one real opponent and one null/BYE
          return (hasOpp1 && !hasOpp2 && m.opponent2 === null) ||
                 (!hasOpp1 && hasOpp2 && m.opponent1 === null);
        });

        if (byeMatches.length === 0) {
          if (pass > 0) {
            bracketLog(`[AUTO-BYE] No more BYE matches after ${pass} pass(es)`);
          }
          break;
        }

        bracketLog(`[AUTO-BYE] Pass ${pass + 1}: Found ${byeMatches.length} LB BYE match(es) to auto-advance`);

        for (const match of byeMatches) {
          try {
            const hasOpp1 = match.opponent1 !== null && match.opponent1 !== undefined && !!match.opponent1?.id;

            // Unlock the match if it's locked/waiting
            if (match.status === 0 || match.status === 1) {
              await supabase
                .from('match')
                .update({ status: 2 }) // Set to Ready
                .eq('id', match.id);
            }

            // Build scores: the real opponent wins, the BYE side gets a forfeit loss
            const scores: MatchUpdatePayload = { id: match.id as number };
            if (hasOpp1) {
              scores.opponent1 = { score: 0, result: 'win' };
              scores.opponent2 = { score: 0, result: 'loss' };
            } else {
              scores.opponent1 = { score: 0, result: 'loss' };
              scores.opponent2 = { score: 0, result: 'win' };
            }

            bracketLog(`[AUTO-BYE] Auto-advancing match ${match.id}: ${hasOpp1 ? 'opponent1' : 'opponent2'} wins by BYE`);

            await this.manager.update.match(scores);

            bracketLog(`[AUTO-BYE] Match ${match.id} auto-advanced successfully`);
          } catch (err) {
            // Log but don't throw - other BYE matches might still succeed
            warnLog(`[AUTO-BYE] Failed to auto-advance match ${match.id}:`, err);
          }
        }

        // Small delay to let propagation settle before next pass
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Don't throw - auto-advancement is a safety net, not critical path
      errorLog('[AUTO-BYE] Error during LB BYE auto-advancement:', error);
    }
  }
}
