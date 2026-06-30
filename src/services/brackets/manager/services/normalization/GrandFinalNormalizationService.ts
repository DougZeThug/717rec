import { bracketLog, errorLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

/** brackets-manager status: 4 = Completed. */
const STATUS_COMPLETED = 4;
const STATUS_READY = 2;

function pickWinnerId(match: StorageMatch | null | undefined): number | null {
  if (!match) return null;
  if (match.opponent1?.result === 'win' && match.opponent1?.id != null) return match.opponent1.id;
  if (match.opponent2?.result === 'win' && match.opponent2?.id != null) return match.opponent2.id;
  return null;
}

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

  async findWBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    try {
      const wbFinalRound = await this.lbStructureService.findWbFinalRound(stageId);
      if (!wbFinalRound) return null;

      const matches = await this.storage.select('match', { round_id: wbFinalRound.id });
      const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

      // WB Final is the last match in the WB final round.
      const sorted = [...matchesArray].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      return sorted[sorted.length - 1] || null;
    } catch (error) {
      errorLog('Error finding WB Final match:', error);
      return null;
    }
  }

  /**
   * Re-read the GF round 1 match and report whether both opponent slots are
   * populated. Returns false if anything goes wrong so the caller retries.
   */
  private async isGrandFinalFullyPopulated(stageId: number): Promise<boolean> {
    try {
      const gfGroup = await this.lbStructureService.findGfGroup(stageId);
      if (!gfGroup) return true; // No GF group → nothing to repair.

      const gfRounds = await this.lbStructureService.findGroupRounds(gfGroup.id);
      const gfRound1 = gfRounds.find((round) => round.number === 1);
      if (!gfRound1) return true;

      const gfMatches = await this.storage.select('match', { round_id: gfRound1.id });
      const arr = (Array.isArray(gfMatches) ? gfMatches : [gfMatches]) as StorageMatch[];
      const gfMatch = arr[0];
      if (!gfMatch) return true;

      return !!gfMatch.opponent1?.id && !!gfMatch.opponent2?.id;
    } catch (error) {
      errorLog('isGrandFinalFullyPopulated check failed:', error);
      return false;
    }
  }

  /**
   * Idempotent best-effort repair of the Grand Final. Runs
   * 'normalizeGrandFinalPopulation' and, if a slot is still missing, waits
   * briefly and retries. Designed to be invoked immediately after the WB or
   * LB Final completes so the GF becomes playable without admin intervention.
   */
  async repairGrandFinalWithRetries(
    stageId: number,
    opts: { attempts?: number; delayMs?: number } = {}
  ): Promise<void> {
    const attempts = Math.max(1, opts.attempts ?? 3);
    const delayMs = Math.max(0, opts.delayMs ?? 150);

    for (let i = 0; i < attempts; i += 1) {
      if (await this.isGrandFinalFullyPopulated(stageId)) {
        if (i > 0) bracketLog(`✅ [REPAIR GF] populated after ${i} retr${i === 1 ? 'y' : 'ies'}`);
        return;
      }

      bracketLog(`🔧 [REPAIR GF] attempt ${i + 1}/${attempts}`, { stageId });
      await this.normalizeGrandFinalPopulation(stageId);

      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    if (!(await this.isGrandFinalFullyPopulated(stageId))) {
      bracketLog('⚠️ [REPAIR GF] GF still incomplete after retries', { stageId });
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

      // Determine the desired contents of each slot independently. The WB winner
      // belongs in opponent1; the LB winner in opponent2. Either side may be
      // empty if brackets-manager failed to propagate.
      const needsOpp1 = !gfMatch.opponent1?.id;
      const needsOpp2 = !gfMatch.opponent2?.id;
      if (!needsOpp1 && !needsOpp2) return;

      const update: {
        opponent1?: { id: number; position: undefined };
        opponent2?: { id: number; position: undefined };
        status?: number;
      } = {};

      if (needsOpp1) {
        const wbFinalMatch = await this.findWBFinalMatch(stageId);
        if (wbFinalMatch?.status === STATUS_COMPLETED) {
          const wbWinnerId = pickWinnerId(wbFinalMatch);
          if (wbWinnerId) {
            update.opponent1 = { id: wbWinnerId, position: undefined };
            bracketLog('✅ [NORMALIZE GF] Populating opponent1 from WB Final winner', {
              gfMatchId: gfMatch.id,
              wbWinnerId,
            });
          }
        }
      }

      if (needsOpp2) {
        const lbFinalMatch = await this.findLBFinalMatch(stageId);
        if (lbFinalMatch?.status === STATUS_COMPLETED) {
          const lbWinnerId = pickWinnerId(lbFinalMatch);
          if (lbWinnerId) {
            update.opponent2 = { id: lbWinnerId, position: undefined };
            bracketLog('✅ [NORMALIZE GF] Populating opponent2 from LB Final winner', {
              gfMatchId: gfMatch.id,
              lbWinnerId,
            });
          }
        }
      }

      if (!update.opponent1 && !update.opponent2) return;

      // After the write, will both slots be populated? If so, flip a still-locked
      // GF match up to Ready so admins can enter the score.
      const willHaveOpp1 = !!(update.opponent1?.id ?? gfMatch.opponent1?.id);
      const willHaveOpp2 = !!(update.opponent2?.id ?? gfMatch.opponent2?.id);
      if (willHaveOpp1 && willHaveOpp2 && (gfMatch.status ?? 0) <= 1) {
        update.status = STATUS_READY;
      } else if ((willHaveOpp1 || willHaveOpp2) && (gfMatch.status ?? 0) <= 1) {
        update.status = 1; // Waiting: one participant ready, awaiting the other
      } else {
        update.status = gfMatch.status;
      }

      await this.storage.update('match', { id: gfMatch.id }, update);

      successLog(
        'Grand Final normalized',
        `Populated [${update.opponent1 ? 'opp1' : ''}${update.opponent1 && update.opponent2 ? '+' : ''}${update.opponent2 ? 'opp2' : ''}] on GF match ${gfMatch.id}`
      );
    } catch (error) {
      errorLog('Error normalizing Grand Final:', error);
    }
  }
}
