import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  StorageParticipant,
  StorageStage,
  UpdateSeedingOptions,
} from '../types/BracketServiceTypes';
import { serializeError } from '../utils/BracketErrorUtils';

/**
 * Service responsible for updating bracket seeding
 * Handles reordering teams in a bracket while preserving bracket structure
 */
export class BracketSeedingService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager
  ) {}

  /**
   * Update the seeding of an existing bracket stage
   * Only allowed if changes don't impact existing match results
   */
  async updateSeeding(options: UpdateSeedingOptions): Promise<void> {
    const { bracketId, newSeeding, keepSameSize = true } = options;

    bracketLog('🔄 Updating bracket seeding:', {
      bracketId,
      newSeedingCount: newSeeding.length,
      keepSameSize,
    });

    try {
      // Step 1: Get the stage ID for this bracket
      const stages = await this.storage.select('stage', {
        tournament_id: bracketId,
      });

      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        throw new Error(`No stage found for bracket: ${bracketId}`);
      }

      const stagesArray = (Array.isArray(stages) ? stages : [stages]) as StorageStage[];
      const stage = stagesArray[0];
      const stageId = stage.id;

      // Step 2: Sort teams by seed
      const teamsBySeed = [...newSeeding].sort((a, b) => a.seed - b.seed);

      // Step 3: Calculate bracket size and BYEs needed
      let bracketSize = 2;
      while (bracketSize < teamsBySeed.length) {
        bracketSize *= 2;
      }
      const byesNeeded = bracketSize - teamsBySeed.length;

      // Step 4: Create simple seeding array in seed order
      // brackets-manager's seedOrdering handles bracket positioning
      const seedingArray: (string | null)[] = teamsBySeed
        .map((t) => t.name)
        .concat(Array(byesNeeded).fill(null));

      bracketLog('📝 New seeding array prepared:', {
        length: seedingArray.length,
        teams: seedingArray.filter((s) => s !== null).length,
        tbds: seedingArray.filter((s) => s === null).length,
      });

      // Load participants into cache before seeding update
      await this.storage.loadParticipantsForTournament(bracketId);

      // Step 6: Update seeding via brackets-manager
      await this.manager.update.seeding(stageId, seedingArray, keepSameSize);

      // Step 7: Re-read participants (names may have been reassigned by brackets-manager)
      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (participants) {
        const participantArray = (
          Array.isArray(participants) ? participants : [participants]
        ) as StorageParticipant[];

        // Synchronize position and team_id for every participant row
        for (const participant of participantArray) {
          if (participant.name === null) {
            // BYE slot — clear team_id and keep a valid position
            await supabase
              .from('participant')
              .update({ position: null, team_id: null })
              .eq('id', participant.id);
          } else {
            const team = teamsBySeed.find((t) => t.name === participant.name);
            if (team) {
              // Use 1-based index in the seed-ordered array as the bracket slot position
              const slotPosition = teamsBySeed.indexOf(team) + 1;
              await supabase
                .from('participant')
                .update({ position: slotPosition, team_id: team.id })
                .eq('id', participant.id);
            }
          }
        }
      }

      successLog('Seeding updated successfully', bracketId);
    } catch (error) {
      const errorMsg = serializeError(error);
      failureLog('Failed to update seeding', errorMsg);

      // Check if error is due to existing match results
      if (errorMsg.includes('impact') || errorMsg.includes('result')) {
        throw new Error(
          'Cannot update seeding: Changes would affect existing match results. ' +
            "You can only reorder teams that haven't started matches yet."
        );
      }

      throw new Error(`Seeding update failed: ${errorMsg}`);
    }
  }
}
