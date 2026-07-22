import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  StorageParticipant,
  StorageStage,
  UpdateSeedingOptions,
} from '../types/BracketServiceTypes';
import { serializeError } from '../utils/BracketErrorUtils';
import { assertUniqueSeedingNames } from '../utils/seedingGuards';

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

    assertUniqueSeedingNames(newSeeding);

    try {
      // Step 1: Get the stage ID for this bracket
      const stages = await this.storage.select('stage', {
        tournament_id: bracketId,
      });

      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        throw new NotFoundError('Stage', bracketId);
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
      // brackets-manager's seedOrdering handles bracket positioning.
      // Entries are objects carrying team_id so any participant rows the
      // library creates are team-linked from the start (no name matching).
      const seedingArray: ({ name: string; team_id: string } | null)[] = teamsBySeed
        .map((t) => ({ name: t.name, team_id: t.id }))
        .concat(Array(byesNeeded).fill(null));

      bracketLog('📝 New seeding array prepared:', {
        length: seedingArray.length,
        teams: seedingArray.filter((s) => s !== null).length,
        tbds: seedingArray.filter((s) => s === null).length,
      });

      // Step 6: Update seeding via brackets-manager
      await this.manager.update.seeding(stageId, seedingArray, keepSameSize);

      // Step 7: Re-read participants and re-sync seed positions by team_id.
      // (team_id itself is stable: existing rows keep theirs; any new rows
      // were inserted by the library with team_id from the seeding objects.)
      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (participants) {
        const participantArray = (
          Array.isArray(participants) ? participants : [participants]
        ) as StorageParticipant[];

        const seedIndexByTeamId = new Map(teamsBySeed.map((t, index) => [t.id, index]));
        await Promise.all(
          participantArray.map(async (participant) => {
            const seedIndex = seedIndexByTeamId.get(participant.team_id ?? '');
            if (seedIndex === undefined) {
              // Not in the new seeding (removed team or legacy BYE row) — clear
              // its slot position so it can't shadow a real seed.
              const { error: clearError } = await supabase
                .from('participant')
                .update({ position: null })
                .eq('id', participant.id);
              if (clearError) handleDatabaseError(clearError, 'Failed to clear participant seed');
            } else {
              const { error: positionError } = await supabase
                .from('participant')
                .update({ position: seedIndex + 1 })
                .eq('id', participant.id);
              if (positionError) {
                handleDatabaseError(positionError, 'Failed to sync participant seed position');
              }
            }
          })
        );
      }

      successLog('Seeding updated successfully', bracketId);
    } catch (error) {
      const errorMsg = serializeError(error);
      failureLog('Failed to update seeding', errorMsg);

      // Check if error is due to existing match results
      if (errorMsg.includes('impact') || errorMsg.includes('result')) {
        throw new BusinessLogicError(
          'Cannot update seeding: Changes would affect existing match results. ' +
            "You can only reorder teams that haven't started matches yet.",
          error
        );
      }

      throw new BusinessLogicError(`Seeding update failed: ${errorMsg}`, error);
    }
  }
}
