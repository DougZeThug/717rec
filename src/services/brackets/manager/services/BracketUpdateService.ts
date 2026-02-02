import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  StorageMatch,
  StorageGroup,
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

        // ⭐ Auto-advance any stuck LB BYE matches (safety net)
        await this.autoAdvanceLBByes(stageId);

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
   * Safety net: Auto-advance stuck LB BYE matches after each update.
   * Scans the losers bracket for matches that brackets-manager has already
   * marked as Ready (status 2) or Running (status 3) but that have exactly
   * one real opponent and one null (BYE) opponent.
   *
   * IMPORTANT: Only acts on matches at status >= 2. Matches at Locked (0) or
   * Waiting (1) are still waiting for opponents from feeder matches — their
   * empty slot is NOT a BYE, it's an unfilled slot that will be populated
   * when the feeder match completes. Force-advancing those would cascade a
   * team through the entire losers bracket incorrectly.
   */
  private async autoAdvanceLBByes(stageId: number): Promise<void> {
    try {
      // Find LB group (group number 2 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId });
      const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
      const lbGroup = groupsArray.find((g) => g.number === 2);

      if (!lbGroup) return; // Not a double-elimination bracket

      let maxPasses = 10; // Safety limit to prevent infinite loops

      while (maxPasses-- > 0) {
        // Fetch all current LB matches
        const allLBMatches = await this.storage.select('match', { group_id: lbGroup.id });
        const lbMatches = (
          Array.isArray(allLBMatches) ? allLBMatches : [allLBMatches]
        ) as StorageMatch[];

        // Find stuck BYE matches: exactly one real opponent, status is Ready (2)
        // or Running (3) — NOT Locked (0) or Waiting (1), because those are
        // still waiting for a real opponent from a feeder match.
        const stuckByes = lbMatches.filter((m) => {
          if (m.status < 2 || m.status >= 4) return false; // Only Ready/Running
          const hasOp1 = m.opponent1 != null && m.opponent1.id != null;
          const hasOp2 = m.opponent2 != null && m.opponent2.id != null;
          return (hasOp1 && !hasOp2) || (!hasOp1 && hasOp2);
        });

        if (stuckByes.length === 0) break; // No more stuck BYEs

        bracketLog(`[AUTO-BYE] Found ${stuckByes.length} stuck LB BYE match(es) to auto-advance`);

        for (const match of stuckByes) {
          try {
            const op1Real = match.opponent1 != null && match.opponent1.id != null;

            // Build update payload: real opponent wins with score 0
            const updatePayload: MatchUpdatePayload = { id: match.id };
            if (op1Real) {
              updatePayload.opponent1 = { score: 0, result: 'win' };
            } else {
              updatePayload.opponent2 = { score: 0, result: 'win' };
            }

            await this.manager.update.match(updatePayload);
            bracketLog(`[AUTO-BYE] Auto-advanced match ${match.id} successfully`);
          } catch (err) {
            // Log but don't throw — this is a safety net, not critical path
            errorLog(`[AUTO-BYE] Failed to auto-advance match ${match.id}:`, err);
          }
        }
      }
    } catch (error) {
      // Don't throw — auto-advancement is defensive, not critical
      errorLog('[AUTO-BYE] Error in autoAdvanceLBByes:', error);
    }
  }
}
