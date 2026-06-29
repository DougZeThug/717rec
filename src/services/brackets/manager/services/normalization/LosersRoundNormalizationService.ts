import type { DataTypes } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

export class LosersRoundNormalizationService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  async normalizeLosersR1(stageId: number): Promise<void> {
    try {
      this.storage.clearParticipantCache();

      const lbR1 = await this.lbStructureService.findLbFirstRound(stageId);
      if (!lbR1) {
        bracketLog('No LB R1 found, skipping normalization');
        return;
      }

      const matches = await this.storage.select('match', { round_id: lbR1.id });
      const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

      bracketLog(`[NORMALIZE] Checking ${matchesArray.length} LB R1 matches for duplicates`);

      for (const match of matchesArray) {
        const opponent1Id = match.opponent1?.id;
        const opponent2Id = match.opponent2?.id;

        if (opponent1Id && opponent2Id && opponent1Id === opponent2Id) {
          bracketLog(
            `[NORMALIZE] DUPLICATE DETECTED in LB R1 Match ${match.id}: Participant ${opponent1Id} in both slots`
          );
          bracketLog(
            '[NORMALIZE] Force-clearing opponent2 using direct SQL to bypass defensive merge'
          );

          // Direct SQL is intentional for this edge case: it bypasses storage adapter merge behavior,
          // which otherwise rehydrates the old opponent2 payload and prevents duplicate cleanup.
          const { error } = await supabase
            .from('match')
            .update({
              opponent2_id: null,
              opponent2_score: null,
              opponent2_result: null,
              status: 4,
            })
            .eq('id', match.id);

          if (error) {
            errorLog(`[NORMALIZE] Failed to clear duplicate in match ${match.id}:`, error);
            errorLog('[NORMALIZE] Error details:', JSON.stringify(error, null, 2));
          } else {
            bracketLog(
              `[NORMALIZE] Successfully cleared duplicate in match ${match.id}, converted to BYE`
            );
            this.storage.clearParticipantCache();
          }
          continue;
        }

        if (!opponent1Id && opponent2Id) {
          bracketLog(`[NORMALIZE] Shifting opponent2 to opponent1 in LB R1 Match ${match.id}`);
          await this.storage.update('match', { id: match.id }, {
            opponent1: { id: opponent2Id, score: null, result: null },
            opponent2: { id: null, score: null, result: null },
            status: match.status,
          } as unknown as Partial<DataTypes['match']>);
        }
      }

      bracketLog('[NORMALIZE] LB R1 normalization complete');
    } catch (error) {
      errorLog('Error normalizing LB R1:', error);
    }
  }
}
