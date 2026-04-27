import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch, StorageRound } from '../../types/BracketServiceTypes';
import { LbStructureService } from './LbStructureService';

interface PersistedMatchSlotState {
  id: number;
  opponent1_id: number | null;
  opponent2_id: number | null;
  status: number;
}

async function getNextMatch(
  nextRoundId: number,
  nextMatchNumber: number
): Promise<PersistedMatchSlotState | null> {
  const { data: nextMatches } = await supabase
    .from('match')
    .select('id, opponent1_id, opponent2_id, status')
    .eq('round_id', nextRoundId)
    .eq('number', nextMatchNumber);

  if (!nextMatches || !nextMatches.length) return null;

  return nextMatches[0] as PersistedMatchSlotState;
}

export class MatchPropagationRepairService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  async propagateCompletedMatches(stageId: number): Promise<void> {
    try {
      bracketLog('🔍 propagateCompletedMatches — scanning LB for stuck winners...', { stageId });

      const lbGroup = await this.lbStructureService.findLbGroup(stageId);
      if (!lbGroup) return;

      const rounds = await this.lbStructureService.findGroupRounds(lbGroup.id);
      const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);

      for (let i = 0; i < sortedRounds.length - 1; i += 1) {
        await this.propagateRoundWinners(sortedRounds[i], sortedRounds[i + 1]);
      }
    } catch (error) {
      errorLog('Error in propagateCompletedMatches:', error);
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

      const targetSlot = !nextMatch.opponent1_id
        ? 'opponent1'
        : !nextMatch.opponent2_id
          ? 'opponent2'
          : null;

      if (!targetSlot) {
        bracketLog(
          `⚠️ [PROPAGATE] Both slots occupied in match ${nextMatch.id} — skipping winner ${winnerId}`
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

      await supabase.from('match').update(updateFields).eq('id', nextMatch.id);
      bracketLog(`✅ [PROPAGATE] Winner ${winnerId} placed in match ${nextMatch.id}`);
    }
  }
}
