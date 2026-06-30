import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

import type { StorageMatch, StorageStage } from '../../types/BracketServiceTypes';
import type { BracketUpdateContext } from './types';

/**
 * Check whether every playable match in the tournament is finished and, if so,
 * flip brackets.state to 'completed'. The .neq guard prevents redundant UPDATEs
 * (and the resulting duplicate realtime events). Errors are logged, never thrown.
 *
 * "Playable" = both opponents present. Reset matches in double-elimination that
 * were not needed (WB champion won the championship) never get a second opponent
 * and are correctly skipped by this filter.
 */
export async function markBracketCompleteIfDone(
  ctx: BracketUpdateContext,
  tournamentId: string
): Promise<void> {
  const { storage } = ctx;

  try {
    const stages = await storage.select('stage', { tournament_id: tournamentId });
    if (!stages) return;
    const stagesArray = (Array.isArray(stages) ? stages : [stages]) as StorageStage[];

    const matchResults = await Promise.all(
      stagesArray.map((s) => storage.select('match', { stage_id: s.id }))
    );
    const allMatches: StorageMatch[] = matchResults.flatMap((m) =>
      !m ? [] : ((Array.isArray(m) ? m : [m]) as StorageMatch[])
    );

    if (allMatches.length === 0) return;

    const playable = allMatches.filter((m) => Boolean(m.opponent1?.id) && Boolean(m.opponent2?.id));
    if (playable.length === 0) return;

    // brackets-manager status: 4 = Completed, 5 = Archived (also done)
    const allDone = playable.every((m) => m.status === 4 || m.status === 5);
    if (!allDone) return;

    const { error } = await supabase
      .from('brackets')
      .update({ state: 'completed' })
      .eq('id', tournamentId)
      .neq('state', 'completed');

    if (error) {
      errorLog('Failed to mark bracket as completed', error);
      return;
    }

    bracketLog(`🏁 Bracket ${tournamentId} marked as completed`);
  } catch (err) {
    errorLog('markBracketCompleteIfDone failed', err);
  }
}
