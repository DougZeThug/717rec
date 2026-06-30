import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { bracketLog, errorLog } from '@/utils/logger';

import type {
  StorageMatch,
  StorageRound,
  UpdateMatchOptions,
} from '../../types/BracketServiceTypes';
import type { BracketUpdateContext } from './types';

type UpdateByeMatchOptions = Pick<UpdateMatchOptions, 'matchId' | 'scores'> & {
  currentMatch: StorageMatch;
};

export async function updateByeMatch(
  ctx: BracketUpdateContext,
  options: UpdateByeMatchOptions
): Promise<void> {
  const { storage } = ctx;
  const { matchId, scores, currentMatch } = options;

  // =============================================
  // BYE MATCH PATH: bypass brackets-manager entirely
  // The library crashes with "Position is undefined" on BYE matches.
  // We handle scoring + propagation via direct SQL instead.
  // =============================================
  bracketLog(`🔀 BYE match detected (Match ${matchId}) — using direct SQL path`);

  // Determine which opponent is present (the winner)
  const winnerId = currentMatch.opponent1?.id ?? currentMatch.opponent2?.id;
  if (!winnerId) {
    bracketLog(`⚠️ BYE match ${matchId} has no participants — skipping`);
    return;
  }

  // Mark the BYE match as completed via direct SQL
  const winnerIsOpp1 = !!currentMatch.opponent1?.id;
  const { error: byeUpdateError } = await supabase
    .from('match')
    .update({
      status: 4, // Completed
      opponent1_score: winnerIsOpp1 ? (scores.opponent1?.score ?? 0) : null,
      opponent1_result: winnerIsOpp1 ? 'win' : null,
      opponent2_score: !winnerIsOpp1 ? (scores.opponent2?.score ?? 0) : null,
      opponent2_result: !winnerIsOpp1 ? 'win' : null,
    })
    .eq('id', matchId);

  if (byeUpdateError) {
    errorLog(`Failed to update BYE match ${matchId}:`, byeUpdateError);
    throw new BusinessLogicError(
      `Failed to update BYE match: ${byeUpdateError.message}`,
      byeUpdateError
    );
  }

  bracketLog(`✅ BYE match ${matchId} marked completed. Winner: ${winnerId}`);

  // Find the next match and place the winner
  const rounds = await storage.select('round', { group_id: currentMatch.group_id });
  const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
  const currentRound = roundsArray.find((r) => r.id === currentMatch.round_id);

  if (!currentRound) return;

  const nextRound = roundsArray.find((r) => r.number === currentRound.number + 1);
  if (!nextRound) {
    bracketLog(`No next round found after round ${currentRound.number} — may be final match`);
    return;
  }

  // Count matches in current vs next round to determine mapping ratio
  const currentRoundMatches = await storage.select('match', {
    round_id: currentRound.id,
  });
  const currentRoundMatchCount = (
    Array.isArray(currentRoundMatches) ? currentRoundMatches : [currentRoundMatches]
  ).length;
  const nextRoundMatches = await storage.select('match', {
    round_id: nextRound.id,
  });
  const nextRoundMatchCount = (
    Array.isArray(nextRoundMatches) ? nextRoundMatches : [nextRoundMatches]
  ).length;

  // 1:1 mapping (same count) vs 2:1 mapping (halving)
  const isOneToOne = nextRoundMatchCount === currentRoundMatchCount;
  const nextMatchNumber = isOneToOne ? currentMatch.number : Math.ceil(currentMatch.number / 2);

  bracketLog(
    `📍 Propagating winner ${winnerId} → Round ${nextRound.number}, Match ${nextMatchNumber} (${isOneToOne ? '1:1' : '2:1'} mapping)`
  );

  const { data: nextMatches } = await supabase
    .from('match')
    .select('id, status, opponent1_id, opponent2_id')
    .eq('round_id', nextRound.id)
    .eq('number', nextMatchNumber);

  if (!nextMatches || nextMatches.length === 0) return;

  const nextMatch = nextMatches[0];

  // Already placed — skip
  if (nextMatch.opponent1_id === winnerId || nextMatch.opponent2_id === winnerId) {
    bracketLog(`✅ Winner ${winnerId} already in next match ${nextMatch.id} — skipping`);
    return;
  }

  // Find an empty slot — NEVER overwrite an existing participant
  let targetSlot: 'opponent1' | 'opponent2' | null = null;
  if (!nextMatch.opponent1_id) {
    targetSlot = 'opponent1';
  } else if (!nextMatch.opponent2_id) {
    targetSlot = 'opponent2';
  }

  if (!targetSlot) {
    bracketLog(
      `⚠️ Both slots occupied in next match ${nextMatch.id} — skipping to prevent overwrite`
    );
    return;
  }

  const updateFields: {
    opponent1_id?: number;
    opponent2_id?: number;
    status?: number;
  } = {};
  if (targetSlot === 'opponent1') {
    updateFields.opponent1_id = Number(winnerId);
  } else {
    updateFields.opponent2_id = Number(winnerId);
  }

  const otherSlotFilled =
    targetSlot === 'opponent1' ? !!nextMatch.opponent2_id : !!nextMatch.opponent1_id;

  if (nextMatch.status <= 1) {
    updateFields.status = otherSlotFilled ? 2 : nextMatch.status;
  }

  const { error: propagateError } = await supabase
    .from('match')
    .update(updateFields)
    .eq('id', nextMatch.id);

  if (propagateError) {
    errorLog(`Failed to propagate winner ${winnerId} to match ${nextMatch.id}:`, propagateError);
    throw new BusinessLogicError(
      `Failed to propagate BYE winner: ${propagateError.message}`,
      propagateError
    );
  }

  bracketLog(`✅ Winner ${winnerId} placed in ${targetSlot} of match ${nextMatch.id}`);
}
