import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageGroup, StorageMatch, StorageRound } from '../types/BracketServiceTypes';

/**
 * Service for normalizing and fixing bracket structure issues in double-elimination tournaments.
 *
 * ## Why This Exists
 * The `brackets-manager` library occasionally produces edge-case bugs when propagating
 * losers through the bracket, particularly in the Loser Bracket Round 1 and Grand Final.
 * This service provides defensive normalization to detect and fix these issues.
 *
 * ## Double-Elimination Bracket Structure
 * The library uses numbered groups to represent bracket sections:
 * - **Group 1 (WB)**: Winner Bracket - teams advance by winning
 * - **Group 2 (LB)**: Loser Bracket - teams drop here after first loss, eliminated on second
 * - **Group 3 (GF)**: Grand Final - WB champion vs LB champion
 *
 * ## Known Issues Handled
 * 1. **Duplicate participants in LB R1**: Same team appears in both opponent slots
 * 2. **Grand Final population gaps**: LB Final winner doesn't propagate to GF due to timing
 * 3. **Misplaced participants**: Opponent in wrong slot after loser propagation
 *
 * @see BracketManagerService - Main service that calls these normalizations
 */
export class BracketNormalizationService {
  constructor(private storage: SupabaseSqlStorage) {}

  /**
   * Calculate the total number of Loser Bracket rounds based on bracket size
   */
  calculateLBRounds(bracketSize: number): number {
    // For double elimination:
    // Size 4 → 2 LB rounds
    // Size 8 → 4 LB rounds
    // Size 16 → 6 LB rounds
    return Math.log2(bracketSize) * 2 - 2;
  }

  /**
   * Find the LB Final match for a given stage
   */
  async findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    try {
      // Find LB group (group number 2 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId });
      const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
      const lbGroup = groupsArray.find((g) => g.number === 2);

      if (!lbGroup) return null;

      const lbGroupId = lbGroup.id;

      // Find all LB rounds
      const rounds = await this.storage.select('round', { group_id: lbGroupId });
      const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];

      // The final round is the max round number
      const maxRoundNumber = Math.max(...roundsArray.map((r) => r.number));
      const lbFinalRound = roundsArray.find((r) => r.number === maxRoundNumber);

      if (!lbFinalRound) return null;

      // Get the LB Final match (should be the only match in that round)
      const matches = await this.storage.select('match', {
        round_id: lbFinalRound.id,
      });

      const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];
      return matchesArray[0] || null;
    } catch (error) {
      errorLog('Error finding LB Final match:', error);
      return null;
    }
  }

  /**
   * Normalizes Grand Final population by ensuring the LB Final winner is placed correctly.
   *
   * ## Problem This Solves
   * Due to race conditions in score submission, the LB Final winner may not automatically
   * propagate to the Grand Final's opponent2 slot. This leaves the GF with only the WB
   * champion (opponent1) and a missing opponent2.
   *
   * ## When Called
   * After score submissions complete, particularly after LB Final is scored.
   *
   * ## Algorithm
   * 1. Find GF group (group number 3) and its Round 1 match
   * 2. Check if opponent2 is missing
   * 3. If LB Final (last round of group 2) is complete, extract winner
   * 4. Populate GF opponent2 with LB Final winner
   *
   * @param stageId - The brackets-manager stage ID for this tournament
   */
  async normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    try {
      bracketLog('🔍 Checking Grand Final population...', { stageId });

      // Find GF group (group number 3 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId });
      const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
      const gfGroup = groupsArray.find((g) => g.number === 3);

      if (!gfGroup) {
        bracketLog('No GF group found, skipping normalization');
        return;
      }

      const gfGroupId = gfGroup.id;

      // Get GF Round 1
      const rounds = await this.storage.select('round', { group_id: gfGroupId });
      const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
      const gfRound1 = roundsArray.find((r) => r.number === 1);

      if (!gfRound1) {
        bracketLog('No GF Round 1 found, skipping normalization');
        return;
      }

      const gfMatches = await this.storage.select('match', {
        round_id: gfRound1.id,
      });
      const gfMatchesArray = (Array.isArray(gfMatches) ? gfMatches : [gfMatches]) as StorageMatch[];
      const gfMatch = gfMatchesArray[0];

      if (!gfMatch) {
        bracketLog('No GF match found, skipping normalization');
        return;
      }

      // If opponent2 is missing, populate from LB Final
      if (!gfMatch.opponent2?.id) {
        bracketLog('🔧 GF opponent2 missing, checking LB Final...');

        const lbFinalMatch = await this.findLBFinalMatch(stageId);

        if (lbFinalMatch && lbFinalMatch.status === 4) {
          // Match is complete
          const winnerId =
            lbFinalMatch.opponent1?.result === 'win'
              ? lbFinalMatch.opponent1?.id
              : lbFinalMatch.opponent2?.id;

          if (winnerId) {
            bracketLog('✅ [NORMALIZE GF] Populating opponent2 from LB Final winner', {
              gfMatchId: gfMatch.id,
              lbWinnerId: winnerId,
            });

            await this.storage.update(
              'match',
              { id: gfMatch.id },
              {
                opponent2: { id: winnerId, position: undefined },
                status: gfMatch.status,
              }
            );

            successLog('Grand Final normalized', `Populated opponent2 with LB winner ${winnerId}`);
          }
        }
      }
    } catch (error) {
      errorLog('Error normalizing Grand Final:', error);
      // Don't throw - normalization is defensive, not critical
    }
  }

  /**
   * Normalizes Loser Bracket Round 1 matches to fix duplicate participant issues.
   *
   * ## Problem This Solves
   * The `brackets-manager` library can create invalid match states in LB R1 when multiple
   * losers from WB R1 are placed simultaneously. This results in the same participant
   * appearing in both opponent1 and opponent2 slots of a single match.
   *
   * ## Example Bug State
   * ```
   * Before normalization:
   * LB R1 Match 5: { opponent1: TeamA, opponent2: TeamA }  // INVALID - duplicate!
   *
   * After normalization:
   * LB R1 Match 5: { opponent1: TeamA, opponent2: null }   // Valid BYE match
   * ```
   *
   * ## Algorithm Steps
   * 1. Find LB group (group number 2) and its first round
   * 2. For each match, check if opponent1.id === opponent2.id
   * 3. If duplicate detected, clear opponent2 via direct SQL (bypasses storage adapter merge)
   * 4. If only opponent2 is filled, shift to opponent1 slot
   *
   * ## Why Direct SQL?
   * The storage adapter's update method has defensive merge logic that would preserve
   * the existing opponent2 value. Direct SQL bypasses this to force-clear duplicates.
   *
   * @param stageId - The brackets-manager stage ID for this tournament
   */
  async normalizeLosersR1(stageId: number): Promise<void> {
    try {
      // Clear cache before normalization as we're changing structure
      (this.storage as SupabaseSqlStorage).clearParticipantCache();

      // Find LB group (group number 2 in double elimination)
      const groups = await this.storage.select('group', { stage_id: stageId });
      const groupsArray = (Array.isArray(groups) ? groups : [groups]) as StorageGroup[];
      const lbGroup = groupsArray.find((g) => g.number === 2);

      if (!lbGroup) {
        bracketLog('No LB group found, skipping normalization');
        return;
      }

      const lbGroupId = lbGroup.id;

      // Find LB R1 (first round in LB group)
      const rounds = await this.storage.select('round', { group_id: lbGroupId });
      const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
      const minRoundNumber = Math.min(...roundsArray.map((r) => r.number));
      const lbR1 = roundsArray.find((r) => r.number === minRoundNumber);

      if (!lbR1) {
        bracketLog('No LB R1 found, skipping normalization');
        return;
      }

      const lbR1Id = lbR1.id;

      // Get all LB R1 matches
      const matches = await this.storage.select('match', { round_id: lbR1Id });
      const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

      bracketLog(`[NORMALIZE] Checking ${matchesArray.length} LB R1 matches for duplicates`);

      for (const match of matchesArray) {
        const opponent1Id = match.opponent1?.id;
        const opponent2Id = match.opponent2?.id;

        // CRITICAL FIX: Detect if same participant is in both slots (duplicate bug)
        if (opponent1Id && opponent2Id && opponent1Id === opponent2Id) {
          bracketLog(
            `[NORMALIZE] DUPLICATE DETECTED in LB R1 Match ${match.id}: Participant ${opponent1Id} in both slots`
          );
          bracketLog(
            `[NORMALIZE] Force-clearing opponent2 using direct SQL to bypass defensive merge`
          );

          // Bypass storage adapter's defensive merge and use direct SQL
          // Use service role to ensure permissions
          const { error } = await supabase
            .from('match')
            .update({
              opponent2_id: null,
              opponent2_score: null,
              opponent2_result: null,
              status: 4, // Set to waiting/ready status for BYE
            })
            .eq('id', match.id);

          if (error) {
            errorLog(`[NORMALIZE] Failed to clear duplicate in match ${match.id}:`, error);
            // Log full error details for debugging
            errorLog(`[NORMALIZE] Error details:`, JSON.stringify(error, null, 2));
          } else {
            bracketLog(
              `[NORMALIZE] Successfully cleared duplicate in match ${match.id}, converted to BYE`
            );
            // Clear cache to reflect changes
            (this.storage as SupabaseSqlStorage).clearParticipantCache();
          }
          continue;
        }

        // If only opponent2 is filled, shift to opponent1
        if (!opponent1Id && opponent2Id) {
          bracketLog(`[NORMALIZE] Shifting opponent2 to opponent1 in LB R1 Match ${match.id}`);
          await this.storage.update(
            'match',
            { id: match.id },
            {
              opponent1: { id: opponent2Id, score: null, result: null },
              opponent2: { id: null, score: null, result: null },
              status: match.status,
            }
          );
        }
      }

      // BYE matches are handled manually via forfeit scoring in the match editor
      // No automatic BYE detection needed

      bracketLog(`[NORMALIZE] LB R1 normalization complete`);
    } catch (error) {
      errorLog('Error normalizing LB R1:', error);
      // Don't throw - normalization is defensive, not critical
    }
  }
}
