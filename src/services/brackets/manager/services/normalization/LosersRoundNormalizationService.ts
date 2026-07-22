import type { DataTypes } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

/**
 * Repair-only pass (invoked via the admin Repair Bracket action): fixes
 * losers-bracket round 1 rows corrupted by the retired auto-repair era —
 * the same participant occupying both slots, or a lone participant stuck in
 * the second slot. Errors are thrown loudly.
 */
export class LosersRoundNormalizationService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  async normalizeLosersR1(stageId: number): Promise<void> {
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
          `[NORMALIZE] DUPLICATE DETECTED in LB R1 Match ${match.id}: Participant ${opponent1Id} in both slots — clearing opponent2`
        );

        const { error } = await supabase
          .from('match')
          .update({
            opponent2_id: null,
            opponent2_score: null,
            opponent2_result: null,
            opponent1_result: 'win',
            opponent1_score: 0,
            status: 4,
          })
          .eq('id', match.id);

        if (error) {
          handleDatabaseError(error, `Failed to clear duplicate participant in match ${match.id}`);
        }
        continue;
      }

      // Shift a lone second-slot participant into the first slot ONLY when
      // slot 1 is a legacy TBD ({ id: null }). A strict-null slot 1 is a
      // library-native BYE ("BYE vs X") — the canonical layout, not damage.
      const opponent1IsTbd = match.opponent1 !== null && match.opponent1?.id == null;
      if (opponent1IsTbd && opponent2Id) {
        bracketLog(`[NORMALIZE] Shifting opponent2 to opponent1 in LB R1 Match ${match.id}`);
        await this.storage.update('match', { id: match.id }, {
          opponent1: { id: opponent2Id, score: null, result: null },
          opponent2: { id: null, score: null, result: null },
          status: match.status,
        } as unknown as Partial<DataTypes['match']>);
      }
    }

    bracketLog('[NORMALIZE] LB R1 normalization complete');
  }
}
