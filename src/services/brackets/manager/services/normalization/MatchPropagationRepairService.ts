import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BYE_RESULT_SENTINEL } from '../../SupabaseSqlStorage/matchTransforms';
import type { StorageMatch, StorageRound } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

interface PersistedMatchSlotState {
  id: number;
  opponent1_id: number | null;
  opponent2_id: number | null;
  opponent1_result: string | null;
  opponent2_result: string | null;
  status: number;
}

async function getNextMatch(
  nextRoundId: number,
  nextMatchNumber: number
): Promise<PersistedMatchSlotState | null> {
  const { data: nextMatches, error } = await supabase
    .from('match')
    .select('id, opponent1_id, opponent2_id, opponent1_result, opponent2_result, status')
    .eq('round_id', nextRoundId)
    .eq('number', nextMatchNumber);

  if (error) handleDatabaseError(error, 'Failed to read the next match for propagation');
  if (!nextMatches || !nextMatches.length) return null;

  return nextMatches[0] as PersistedMatchSlotState;
}

/** A slot can receive a winner only if it is empty AND not a stored BYE. */
const slotAvailable = (id: number | null, result: string | null): boolean =>
  id === null && result !== BYE_RESULT_SENTINEL;

/**
 * Repair-only pass (invoked via the admin Repair Bracket action): walks the
 * losers bracket and the grand final, advancing winners of completed matches
 * whose propagation was lost (legacy auto-repair era damage). Never rewrites
 * completed source match results. Errors are thrown loudly.
 */
export class MatchPropagationRepairService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  async propagateCompletedMatches(stageId: number): Promise<void> {
    bracketLog('🔍 propagateCompletedMatches — scanning LB for stuck winners...', { stageId });

    const lbGroup = await this.lbStructureService.findLbGroup(stageId);
    if (lbGroup) {
      const rounds = await this.lbStructureService.findGroupRounds(lbGroup.id);
      const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);

      for (let i = 0; i < sortedRounds.length - 1; i += 1) {
        await this.propagateRoundWinners(sortedRounds[i], sortedRounds[i + 1]);
      }
    }

    // Cross-group propagation into the Grand Final group.
    await this.propagateIntoGrandFinal(stageId);
  }

  /**
   * Propagate WB Final winner → GF round 1 opponent1, LB Final winner → GF
   * round 1 opponent2, and GF round 1 winner → GF round 2 if a reset match
   * exists. Operates on single cross-group edges the LB round-walker cannot
   * see.
   */
  private async propagateIntoGrandFinal(stageId: number): Promise<void> {
    const gfGroup = await this.lbStructureService.findGfGroup(stageId);
    if (!gfGroup) return;

    const gfRounds = await this.lbStructureService.findGroupRounds(gfGroup.id);
    const gfRound1 = gfRounds.find((r) => r.number === 1);
    if (!gfRound1) return;

    const wbFinalRound = await this.lbStructureService.findWbFinalRound(stageId);
    if (wbFinalRound) {
      await this.propagateFinalToGf(wbFinalRound, gfRound1, 'opponent1');
    }

    const lbFinalRound = await this.lbStructureService.findLbFinalRound(stageId);
    if (lbFinalRound) {
      await this.propagateFinalToGf(lbFinalRound, gfRound1, 'opponent2');
    }

    // Reset / double grand final
    const gfRound2 = gfRounds.find((r) => r.number === 2);
    if (gfRound2) {
      await this.propagateRoundWinners(gfRound1, gfRound2);
    }
  }

  private async propagateFinalToGf(
    finalRound: StorageRound,
    gfRound1: StorageRound,
    targetSlot: 'opponent1' | 'opponent2'
  ): Promise<void> {
    const finalMatches = await this.storage.select('match', { round_id: finalRound.id });
    const arr = (Array.isArray(finalMatches) ? finalMatches : [finalMatches]) as StorageMatch[];
    if (!arr.length) return;

    // For both WB and LB finals there is exactly one match per round in
    // brackets-manager's structure. Take the last by number for safety.
    const sorted = [...arr].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const finalMatch = sorted[sorted.length - 1];
    if (finalMatch.status !== 4) return;

    const winnerId =
      finalMatch.opponent1?.result === 'win'
        ? finalMatch.opponent1?.id
        : finalMatch.opponent2?.result === 'win'
          ? finalMatch.opponent2?.id
          : null;
    if (!winnerId) return;

    const gfMatch = await getNextMatch(gfRound1.id, 1);
    if (!gfMatch) return;
    if (gfMatch.opponent1_id === winnerId || gfMatch.opponent2_id === winnerId) return;

    const targetAvailable =
      targetSlot === 'opponent1'
        ? slotAvailable(gfMatch.opponent1_id, gfMatch.opponent1_result)
        : slotAvailable(gfMatch.opponent2_id, gfMatch.opponent2_result);
    if (!targetAvailable) {
      bracketLog(`⚠️ [PROPAGATE→GF] ${targetSlot} not available — skipping winner ${winnerId}`);
      return;
    }

    const updateFields: { opponent1_id?: number; opponent2_id?: number; status?: number } = {};
    if (targetSlot === 'opponent1') {
      updateFields.opponent1_id = winnerId;
    } else {
      updateFields.opponent2_id = winnerId;
    }

    const otherSlotFilled =
      targetSlot === 'opponent1' ? Boolean(gfMatch.opponent2_id) : Boolean(gfMatch.opponent1_id);
    if (gfMatch.status <= 1 && otherSlotFilled) {
      updateFields.status = 2;
    }

    bracketLog(`🔧 [PROPAGATE→GF] Winner ${winnerId} → GF round ${gfRound1.number} ${targetSlot}`);
    const { error: gfUpdateError } = await supabase
      .from('match')
      .update(updateFields)
      .eq('id', gfMatch.id);
    if (gfUpdateError) {
      handleDatabaseError(
        gfUpdateError,
        `Failed to propagate a winner into GF match ${gfMatch.id}`
      );
    }
  }

  private async propagateRoundWinners(round: StorageRound, nextRound: StorageRound): Promise<void> {
    const matches = await this.storage.select('match', { round_id: round.id });
    const matchesArray = (Array.isArray(matches) ? matches : [matches]) as StorageMatch[];

    const nextRoundMatches = await this.storage.select('match', { round_id: nextRound.id });
    const nextRoundMatchesArray = (
      Array.isArray(nextRoundMatches) ? nextRoundMatches : [nextRoundMatches]
    ) as StorageMatch[];
    const isOneToOne = nextRoundMatchesArray.length === matchesArray.length;

    for (const match of matchesArray) {
      if (match.status !== 4) continue;

      const winnerId =
        match.opponent1?.result === 'win'
          ? match.opponent1?.id
          : match.opponent2?.result === 'win'
            ? match.opponent2?.id
            : null;

      if (!winnerId) continue;

      const nextMatchNumber = isOneToOne ? match.number : Math.ceil(match.number / 2);
      const nextMatch = await getNextMatch(nextRound.id, nextMatchNumber);

      if (!nextMatch) continue;
      if (nextMatch.opponent1_id === winnerId || nextMatch.opponent2_id === winnerId) continue;

      const targetSlot = slotAvailable(nextMatch.opponent1_id, nextMatch.opponent1_result)
        ? 'opponent1'
        : slotAvailable(nextMatch.opponent2_id, nextMatch.opponent2_result)
          ? 'opponent2'
          : null;

      if (!targetSlot) {
        bracketLog(
          `⚠️ [PROPAGATE] No available slot in match ${nextMatch.id} — skipping winner ${winnerId}`
        );
        continue;
      }

      bracketLog(
        `🔧 [PROPAGATE] Winner ${winnerId} → Round ${nextRound.number} Match ${nextMatchNumber} ${targetSlot}`
      );

      const updateFields: { opponent1_id?: number; opponent2_id?: number; status?: number } = {};
      if (targetSlot === 'opponent1') {
        updateFields.opponent1_id = winnerId;
      } else {
        updateFields.opponent2_id = winnerId;
      }

      const otherSlotFilled =
        targetSlot === 'opponent1'
          ? Boolean(nextMatch.opponent2_id)
          : Boolean(nextMatch.opponent1_id);
      if (nextMatch.status <= 1 && otherSlotFilled) {
        updateFields.status = 2;
      }

      const { error: updateError } = await supabase
        .from('match')
        .update(updateFields)
        .eq('id', nextMatch.id);
      if (updateError) {
        handleDatabaseError(updateError, `Failed to advance a winner into match ${nextMatch.id}`);
      }
      bracketLog(`✅ [PROPAGATE] Winner ${winnerId} placed in match ${nextMatch.id}`);
    }
  }
}
