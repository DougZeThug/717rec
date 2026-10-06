import { bracketLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

/** brackets-manager status: 4 = Completed. */
const STATUS_COMPLETED = 4;
const STATUS_READY = 2;
/** One participant is in, the other is still to come. */
const STATUS_WAITING = 1;

function pickWinnerId(match: StorageMatch | null | undefined): number | null {
  if (!match) return null;
  if (match.opponent1?.result === 'win' && match.opponent1?.id != null) return match.opponent1.id;
  if (match.opponent2?.result === 'win' && match.opponent2?.id != null) return match.opponent2.id;
  return null;
}

/** Winner of a completed match, or null when it is not finished or has no winner. */
function completedWinnerId(match: StorageMatch | null): number | null {
  if (match?.status !== STATUS_COMPLETED) return null;
  return pickWinnerId(match) || null;
}

/**
 * A slot needs filling when it is an empty (legacy TBD) slot. Strict `null`
 * is a BYE and is never backfilled.
 */
function slotNeedsFill(slot: StorageMatch['opponent1']): boolean {
  return slot !== null && !slot?.id;
}

type GfUpdate = {
  opponent1?: { id: number; position: undefined };
  opponent2?: { id: number; position: undefined };
  status?: number;
};

/**
 * Status after the write. A still-locked GF match (status <= 1) becomes Ready
 * when both slots are filled, or Waiting when only one is. Any other status
 * is kept as it is.
 */
function computeGfStatus(gfMatch: StorageMatch, update: GfUpdate): number | undefined {
  if ((gfMatch.status ?? 0) > 1) return gfMatch.status;

  const willHaveOpp1 = Boolean(update.opponent1?.id ?? gfMatch.opponent1?.id);
  const willHaveOpp2 = Boolean(update.opponent2?.id ?? gfMatch.opponent2?.id);
  if (willHaveOpp1 && willHaveOpp2) return STATUS_READY;
  if (willHaveOpp1 || willHaveOpp2) return STATUS_WAITING;
  return gfMatch.status;
}

function describePopulatedSlots(update: GfUpdate): string {
  const slots = [update.opponent1 && 'opp1', update.opponent2 && 'opp2'].filter(Boolean);
  return slots.join('+');
}

/**
 * Repair-only pass (invoked via the admin Repair Bracket action): backfills
 * the grand-final slots from the WB/LB final winners when propagation was
 * lost (legacy auto-repair era damage). Errors are thrown loudly.
 */
export class GrandFinalNormalizationService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  private async findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    const lbFinalRound = await this.lbStructureService.findLbFinalRound(stageId);
    if (!lbFinalRound) return null;

    const matches = await this.storage.select('match', { round_id: lbFinalRound.id });
    const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

    return matchesArray[0] || null;
  }

  private async findWBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    const wbFinalRound = await this.lbStructureService.findWbFinalRound(stageId);
    if (!wbFinalRound) return null;

    const matches = await this.storage.select('match', { round_id: wbFinalRound.id });
    const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

    // WB Final is the last match in the WB final round.
    const sorted = [...matchesArray].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return sorted[sorted.length - 1] || null;
  }

  /** The single GF match (group 3, round 1), or null when any step is missing. */
  private async findGrandFinalMatch(stageId: number): Promise<StorageMatch | null> {
    const gfGroup = await this.lbStructureService.findGfGroup(stageId);
    if (!gfGroup) {
      bracketLog('No GF group found, skipping normalization');
      return null;
    }

    const gfRounds = await this.lbStructureService.findGroupRounds(gfGroup.id);
    const gfRound1 = gfRounds.find((round) => round.number === 1);

    if (!gfRound1) {
      bracketLog('No GF Round 1 found, skipping normalization');
      return null;
    }

    const gfMatches = await this.storage.select('match', { round_id: gfRound1.id });
    const gfMatchesArray = (Array.isArray(gfMatches) ? gfMatches : [gfMatches]) as StorageMatch[];
    const gfMatch = gfMatchesArray[0];

    if (!gfMatch) {
      bracketLog('No GF match found, skipping normalization');
      return null;
    }

    return gfMatch;
  }

  /**
   * Fills the empty slots from the finals. The WB winner belongs in opponent1;
   * the LB winner in opponent2. Only finals that are completed with a winner
   * are used.
   */
  private async backfillSlots(
    stageId: number,
    gfMatch: StorageMatch,
    needsOpp1: boolean,
    needsOpp2: boolean
  ): Promise<GfUpdate> {
    const update: GfUpdate = {};

    if (needsOpp1) {
      const wbWinnerId = completedWinnerId(await this.findWBFinalMatch(stageId));
      if (wbWinnerId) {
        update.opponent1 = { id: wbWinnerId, position: undefined };
        bracketLog('✅ [NORMALIZE GF] Populating opponent1 from WB Final winner', {
          gfMatchId: gfMatch.id,
          wbWinnerId,
        });
      }
    }

    if (needsOpp2) {
      const lbWinnerId = completedWinnerId(await this.findLBFinalMatch(stageId));
      if (lbWinnerId) {
        update.opponent2 = { id: lbWinnerId, position: undefined };
        bracketLog('✅ [NORMALIZE GF] Populating opponent2 from LB Final winner', {
          gfMatchId: gfMatch.id,
          lbWinnerId,
        });
      }
    }

    return update;
  }

  async normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    bracketLog('🔍 Checking Grand Final population...', { stageId });

    const gfMatch = await this.findGrandFinalMatch(stageId);
    if (!gfMatch) return;

    // Either side may be empty if legacy propagation failed.
    const needsOpp1 = slotNeedsFill(gfMatch.opponent1);
    const needsOpp2 = slotNeedsFill(gfMatch.opponent2);
    if (!needsOpp1 && !needsOpp2) return;

    const update = await this.backfillSlots(stageId, gfMatch, needsOpp1, needsOpp2);
    if (!update.opponent1 && !update.opponent2) return;

    update.status = computeGfStatus(gfMatch, update);

    await this.storage.update('match', { id: gfMatch.id }, update);

    successLog(
      'Grand Final normalized',
      `Populated [${describePopulatedSlots(update)}] on GF match ${gfMatch.id}`
    );
  }
}
