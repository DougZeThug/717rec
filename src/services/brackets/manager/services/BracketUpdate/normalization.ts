import { bracketLog, errorLog } from '@/utils/logger';

import type { StorageMatch } from '../../types/BracketServiceTypes';
import type { BracketUpdateContext } from './types';

type NormalizeAfterUpdateOptions = {
  matchId: number;
  currentMatch: StorageMatch;
};

export async function normalizeAfterMatchUpdate(
  ctx: BracketUpdateContext,
  options: NormalizeAfterUpdateOptions
): Promise<StorageMatch> {
  const { storage, normalizationService } = ctx;
  const { matchId, currentMatch } = options;

  // ⭐ Normalize LB R1 to fix same-side-twice issues
  const stageId =
    typeof currentMatch.stage_id === 'string'
      ? parseInt(currentMatch.stage_id)
      : currentMatch.stage_id;

  // Run normalization multiple times to catch timing issues
  for (let i = 0; i < 3; i++) {
    await normalizationService.normalizeLosersR1(stageId);
    // Small delay to let propagation complete
    if (i < 2) await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // ⭐ Normalize Grand Final population after every update (defensive)
  await normalizationService.normalizeGrandFinalPopulation(stageId);

  // ⭐ Propagate any completed matches whose winners didn't advance (safety net)
  await normalizationService.propagateCompletedMatches(stageId);

  // ⭐ Fetch and log next matches to see propagation results
  const updatedMatch = (await storage.select('match', matchId)) as unknown as StorageMatch;
  bracketLog(`UPDATED MATCH STATE - Match ${matchId}:`, {
    opponent1: updatedMatch.opponent1,
    opponent2: updatedMatch.opponent2,
  });

  // ⭐ If this update completed the WB Final or LB Final, immediately
  // run a retrying GF repair so the Grand Final populates without
  // requiring an admin to click "Recalculate Standings". Idempotent.
  try {
    if (updatedMatch.status === 4 && updatedMatch.round_id != null) {
      const isWbFinal = await normalizationService.isWbFinalRound(
        Number(updatedMatch.round_id),
        stageId
      );
      const isLbFinal = isWbFinal
        ? false
        : await normalizationService.isLbFinalRound(Number(updatedMatch.round_id), stageId);
      if (isWbFinal || isLbFinal) {
        bracketLog(
          `🏁 ${isWbFinal ? 'WB' : 'LB'} Final completed (Match ${matchId}) — running GF repair`
        );
        await normalizationService.repairGrandFinalWithRetries(stageId);
      }
    }
  } catch (gfRepairError) {
    errorLog('Post-final GF repair failed (non-fatal):', gfRepairError);
  }

  return updatedMatch;
}
