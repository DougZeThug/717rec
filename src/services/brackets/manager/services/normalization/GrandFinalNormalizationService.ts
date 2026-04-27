import { bracketLog, errorLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

export class GrandFinalNormalizationService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  async findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    try {
      const lbFinalRound = await this.lbStructureService.findLbFinalRound(stageId);
      if (!lbFinalRound) return null;

      const matches = await this.storage.select('match', { round_id: lbFinalRound.id });
      const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

      return matchesArray[0] || null;
    } catch (error) {
      errorLog('Error finding LB Final match:', error);
      return null;
    }
  }

  async normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    try {
      bracketLog('🔍 Checking Grand Final population...', { stageId });

      const gfGroup = await this.lbStructureService.findGfGroup(stageId);
      if (!gfGroup) {
        bracketLog('No GF group found, skipping normalization');
        return;
      }

      const gfRounds = await this.lbStructureService.findGroupRounds(gfGroup.id);
      const gfRound1 = gfRounds.find((round) => round.number === 1);

      if (!gfRound1) {
        bracketLog('No GF Round 1 found, skipping normalization');
        return;
      }

      const gfMatches = await this.storage.select('match', { round_id: gfRound1.id });
      const gfMatchesArray = (Array.isArray(gfMatches) ? gfMatches : [gfMatches]) as StorageMatch[];
      const gfMatch = gfMatchesArray[0];

      if (!gfMatch) {
        bracketLog('No GF match found, skipping normalization');
        return;
      }

      if (gfMatch.opponent2?.id) return;

      bracketLog('🔧 GF opponent2 missing, checking LB Final...');
      const lbFinalMatch = await this.findLBFinalMatch(stageId);

      if (lbFinalMatch?.status !== 4) return;

      const winnerId =
        lbFinalMatch.opponent1?.result === 'win'
          ? lbFinalMatch.opponent1?.id
          : lbFinalMatch.opponent2?.id;

      if (!winnerId) return;

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
    } catch (error) {
      errorLog('Error normalizing Grand Final:', error);
    }
  }
}
