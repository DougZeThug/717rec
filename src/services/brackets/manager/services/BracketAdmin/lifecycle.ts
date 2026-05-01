import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import { isLosersByeMatch } from './eligibility';
import { collectDownstreamChain } from './queries';
import type { BracketAdminDeps, ToggleByeReadyResult } from './types';

export async function adminToggleByeReady(
  deps: BracketAdminDeps,
  matchId: number,
  makeReady: boolean,
  clearDownstream: boolean = false
): Promise<ToggleByeReadyResult> {
  bracketLog(`Admin BYE toggle requested for match ${matchId}`, { makeReady, clearDownstream });

  try {
    const check = await isLosersByeMatch(deps, matchId);
    const isCompletedMatch = check.meta?.status === 4;

    if (isCompletedMatch && !makeReady) {
      if (!clearDownstream) {
        const downstream = await collectDownstreamChain(deps, matchId);
        if (downstream.length > 0) {
          throw new BusinessLogicError('Cannot reopen completed match: downstream matches have been populated. Use "Reopen + Clear Downstream" option to cascade clear downstream matches.');
        }
      }

      if (clearDownstream) {
        const downstream = await collectDownstreamChain(deps, matchId);
        for (const downstreamMatch of downstream) {
          await supabase.from('match').update({ status: 1, opponent1_id: null, opponent2_id: null, opponent1_result: null, opponent2_result: null, opponent1_score: null, opponent2_score: null }).eq('id', downstreamMatch.id);
        }

        bracketLog('Cleared downstream matches (full cascade)', { matchId, clearedCount: downstream.length, clearedIds: downstream.map((m: any) => m.id) });
      }

      await supabase.from('match').update({ opponent1_result: null, opponent2_result: null, opponent1_score: null, opponent2_score: null, status: 2 }).eq('id', matchId);
      successLog(`Reopened completed BYE match ${matchId} to Ready`);

      return { matchId, status: 2, statusName: 'Ready', message: clearDownstream ? 'Match reopened and downstream matches cleared' : 'Match reopened to Ready status' };
    }

    if (makeReady) {
      if (!check.ok) {
        throw new BusinessLogicError(`Cannot set to Ready: ${check.reason}. Match must be a Losers Bracket BYE match in Locked/Waiting status.`);
      }

      await supabase.from('match').update({ status: 2 }).eq('id', matchId);
      successLog(`Admin unlocked BYE match ${matchId} to Ready`);
      return { matchId, status: 2, statusName: 'Ready', message: 'Match unlocked to Ready status. You can now enter scores and advance the bracket.' };
    }

    if (!check.meta) throw new BusinessLogicError('Cannot revert: Match data unavailable');
    if (check.meta.status >= 4) {
      throw new BusinessLogicError(`Cannot revert: Match is ${check.meta.currentStatusName}. Only Ready (2) or Running (3) matches can be reverted.`);
    }

    await supabase.from('match').update({ status: 1 }).eq('id', matchId);
    successLog(`Admin reverted BYE match ${matchId} to Waiting`);

    return { matchId, status: 1, statusName: 'Waiting', message: 'Match reverted to Waiting status. Status toggle is available again.' };
  } catch (error) {
    failureLog('Admin BYE toggle failed', error);
    throw new BusinessLogicError(`Failed to toggle BYE match status: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
  }
}
