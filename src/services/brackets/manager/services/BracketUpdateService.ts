import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  MatchUpdatePayload,
  StorageMatch,
  StorageRound,
  StorageStage,
  UpdateMatchOptions,
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
        const isByeMatch = !currentMatch.opponent1?.id || !currentMatch.opponent2?.id;

        // ⭐ Load participants into cache before update
        const matchData = currentMatch as StorageMatch;
        const stage = (await this.storage.select('stage', matchData.stage_id)) as StorageStage;
        if (stage) {
          await (this.storage as SupabaseSqlStorage).loadParticipantsForTournament(
            stage.tournament_id
          );
        }

        if (isByeMatch) {
          // =============================================
          // BYE MATCH PATH: bypass brackets-manager entirely
          // The library crashes with "Position is undefined" on BYE matches.
          // We handle scoring + propagation via direct SQL instead.
          // =============================================
          bracketLog(`🔀 BYE match detected (Match ${matchId}) — using direct SQL path`);

          // Determine which opponent is present (the winner)
          const winnerId = currentMatch.opponent1?.id ?? currentMatch.opponent2?.id;
          if (!winnerId) {
            bracketLog(`⚠️ BYE match ${matchId} has no participants — skipping`);
            return;
          }

          // Mark the BYE match as completed via direct SQL
          const winnerIsOpp1 = !!currentMatch.opponent1?.id;
          await supabase
            .from('match')
            .update({
              status: 4, // Completed
              opponent1_score: winnerIsOpp1 ? (scores.opponent1?.score ?? 0) : null,
              opponent1_result: winnerIsOpp1 ? 'win' : null,
              opponent2_score: !winnerIsOpp1 ? (scores.opponent2?.score ?? 0) : null,
              opponent2_result: !winnerIsOpp1 ? 'win' : null,
            })
            .eq('id', matchId);

          bracketLog(`✅ BYE match ${matchId} marked completed. Winner: ${winnerId}`);

          // Find the next match and place the winner
          const rounds = await this.storage.select('round', { group_id: currentMatch.group_id });
          const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
          const currentRound = roundsArray.find((r) => r.id === currentMatch.round_id);

          if (currentRound) {
            const nextRound = roundsArray.find((r) => r.number === currentRound.number + 1);
            if (nextRound) {
              // Count matches in current vs next round to determine mapping ratio
              const currentRoundMatches = await this.storage.select('match', { round_id: currentRound.id });
              const currentRoundMatchCount = (Array.isArray(currentRoundMatches) ? currentRoundMatches : [currentRoundMatches]).length;
              const nextRoundMatches = await this.storage.select('match', { round_id: nextRound.id });
              const nextRoundMatchCount = (Array.isArray(nextRoundMatches) ? nextRoundMatches : [nextRoundMatches]).length;

              // 1:1 mapping (same count) vs 2:1 mapping (halving)
              const isOneToOne = nextRoundMatchCount === currentRoundMatchCount;
              const nextMatchNumber = isOneToOne
                ? currentMatch.number
                : Math.ceil(currentMatch.number / 2);

              bracketLog(`📍 Propagating winner ${winnerId} → Round ${nextRound.number}, Match ${nextMatchNumber} (${isOneToOne ? '1:1' : '2:1'} mapping)`);

              const { data: nextMatches } = await supabase
                .from('match')
                .select('id, status, opponent1_id, opponent2_id')
                .eq('round_id', nextRound.id)
                .eq('number', nextMatchNumber);

              if (nextMatches && nextMatches.length > 0) {
                const nextMatch = nextMatches[0];

                // Already placed — skip
                if (nextMatch.opponent1_id === winnerId || nextMatch.opponent2_id === winnerId) {
                  bracketLog(`✅ Winner ${winnerId} already in next match ${nextMatch.id} — skipping`);
                } else {
                  // Find an empty slot — NEVER overwrite an existing participant
                  let targetSlot: 'opponent1' | 'opponent2' | null = null;
                  if (!nextMatch.opponent1_id) {
                    targetSlot = 'opponent1';
                  } else if (!nextMatch.opponent2_id) {
                    targetSlot = 'opponent2';
                  }

                  if (!targetSlot) {
                    bracketLog(`⚠️ Both slots occupied in next match ${nextMatch.id} — skipping to prevent overwrite`);
                  } else {
                    const updateFields: Record<string, unknown> = {};
                    if (targetSlot === 'opponent1') {
                      updateFields.opponent1_id = winnerId;
                    } else {
                      updateFields.opponent2_id = winnerId;
                    }

                    const otherSlotFilled = targetSlot === 'opponent1'
                      ? !!nextMatch.opponent2_id
                      : !!nextMatch.opponent1_id;

                    if (nextMatch.status <= 1) {
                      updateFields.status = otherSlotFilled ? 2 : nextMatch.status;
                    }

                    await supabase
                      .from('match')
                      .update(updateFields)
                      .eq('id', nextMatch.id);

                    bracketLog(`✅ Winner ${winnerId} placed in ${targetSlot} of match ${nextMatch.id}`);
                  }
                }
              }
            } else {
              bracketLog(`No next round found after round ${currentRound.number} — may be final match`);
            }
          }

          // Skip to normalization (don't call manager.update.match)
        } else {
          // =============================================
          // NORMAL MATCH PATH: use brackets-manager library
          // =============================================
          bracketLog(`CALLING manager.update.match() with:`, {
            id: matchId,
            opponent1: scores.opponent1,
            opponent2: scores.opponent2,
          });

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

          try {
            await this.manager.update.match(updatePayload);
            bracketLog(`manager.update.match() COMPLETED for Match ${matchId}`);
          } catch (propagationError) {
            const errorMessage =
              propagationError instanceof Error ? propagationError.message : String(propagationError);
            if (errorMessage.includes('Match not found') || errorMessage.includes('Position is undefined')) {
              bracketLog(`⚠️ Non-fatal propagation error for Match ${matchId}: ${errorMessage}`);
              bracketLog(`Match data was saved successfully. Continuing to normalization steps...`);
            } else {
              throw propagationError;
            }
          }
        }

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

        // ⭐ Propagate any completed matches whose winners didn't advance (safety net)
        await this.normalizationService.propagateCompletedMatches(stageId);

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
          `Match update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { cause: error }
        );
      }
    });
  }
}
