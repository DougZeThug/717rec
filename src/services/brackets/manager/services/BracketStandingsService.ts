import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageStage, StorageParticipant } from '../types/BracketServiceTypes';

/**
 * Service for calculating and managing bracket standings
 */
export class BracketStandingsService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager
  ) {}

  /**
   * Calculate and store final standings for a completed bracket
   */
  async calculateFinalStandings(bracketId: string): Promise<void> {
    bracketLog('Calculating final standings from SQL tables:', { bracketId });

    try {
      // Get all stages for this bracket from SQL tables
      const stages = await this.storage.select('stage', { tournament_id: bracketId });

      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        warnLog('No stages found for bracket:', bracketId);
        return;
      }

      const stagesArray = (Array.isArray(stages) ? stages : [stages]) as StorageStage[];
      const stage = stagesArray[0];

      // Get final standings from brackets-manager
      const finalStandings = await this.manager.get.finalStandings(stage.id);

      bracketLog('Final standings calculated:', {
        stageId: stage.id,
        standings: finalStandings,
      });

      // Get participants to map back to team IDs
      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (!participants) {
        errorLog('No participants found for bracket:', bracketId);
        return;
      }

      const participantArray = (
        Array.isArray(participants) ? participants : [participants]
      ) as StorageParticipant[];

      // Create a Map for O(1) lookups by participant ID
      const participantMap = new Map<number, StorageParticipant>();
      participantArray.forEach((p) => {
        participantMap.set(p.id, p);
      });

      // Update playoff_team_records
      interface FinalStanding {
        id: number;
        name: string;
        rank: number;
      }
      const recordUpdates = (finalStandings as FinalStanding[])
        .map((standing, index) => {
          const participant = participantMap.get(standing.id);
          return {
            team_id: participant?.team_id,
            bracket_id: bracketId,
            placement: index + 1,
          };
        })
        .filter((r) => r.team_id);

      if (recordUpdates.length > 0) {
        const { error } = await supabase.from('playoff_team_records').upsert(recordUpdates, {
          onConflict: 'team_id,bracket_id',
        });

        if (error) {
          errorLog('Error updating playoff team records:', error);
          throw error;
        }

        successLog('Final standings updated in playoff_team_records', bracketId);
      }
    } catch (error) {
      failureLog('Failed to calculate final standings', error);
      throw new Error(
        `Final standings calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
