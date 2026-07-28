import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, failureLog, successLog } from '@/utils/logger';

import type { StorageMatch } from '../../types/BracketServiceTypes';
import { isLosersByeMatch } from './eligibility';
import { collectDownstreamChain } from './queries';
import type { BracketAdminDeps, ToggleByeReadyResult } from './types';

/**
 * Which of a match's two "result" columns may be blanked when we clear it.
 *
 * A side that is a structural BYE — no team can ever play there — is recorded
 * by storing the word 'bye' in that side's result column. That column is the
 * ONLY place the BYE is written down: blank it and the slot silently becomes
 * an ordinary "team to be decided", and nothing ever puts the BYE back.
 *
 * Storage hands such a side back to us as exactly `null`, so `=== null` is the
 * test. For those sides we leave the field OUT of the returned payload —
 * Supabase writes only the fields we name, so the stored 'bye' survives
 * untouched. adminCompleteByeMatch protects the same marker the same way.
 */
function resultFieldsToClear(match: StorageMatch): {
  opponent1_result?: null;
  opponent2_result?: null;
} {
  const fields: { opponent1_result?: null; opponent2_result?: null } = {};
  if (match.opponent1 !== null) fields.opponent1_result = null;
  if (match.opponent2 !== null) fields.opponent2_result = null;
  return fields;
}

export async function adminToggleByeReady(
  deps: BracketAdminDeps,
  matchId: number,
  makeReady: boolean,
  clearDownstream = false
): Promise<ToggleByeReadyResult> {
  bracketLog(`Admin BYE toggle requested for match ${matchId}`, { makeReady, clearDownstream });

  try {
    const check = await isLosersByeMatch(deps, matchId);
    const isCompletedMatch = check.ok && check.meta?.status === 4;

    if (isCompletedMatch && !makeReady) {
      // Read the match up front, before anything destructive runs. This read is
      // the only prerequisite the reopen path adds, and failing it after the
      // cascade below had already blanked the downstream chain would leave the
      // bracket half-cleared. Hoisting costs nothing: collectDownstreamChain
      // excludes this match, so the cascade cannot change what we read here.
      const currentMatch = (await deps.storage.select('match', matchId)) as StorageMatch | null;
      if (!currentMatch) throw new BusinessLogicError('Cannot reopen: Match data unavailable');

      if (!clearDownstream) {
        const downstream = await collectDownstreamChain(deps, matchId);
        if (downstream.length > 0) {
          throw new BusinessLogicError(
            'Cannot reopen completed match: downstream matches have been populated. Use "Reopen + Clear Downstream" option to cascade clear downstream matches.'
          );
        }
      }

      if (clearDownstream) {
        const downstream = await collectDownstreamChain(deps, matchId);
        for (const downstreamMatch of downstream) {
          const { error } = await supabase
            .from('match')
            .update({
              status: 1,
              opponent1_id: null,
              opponent2_id: null,
              ...resultFieldsToClear(downstreamMatch),
              opponent1_score: null,
              opponent2_score: null,
            })
            .eq('id', downstreamMatch.id);
          if (error) {
            handleDatabaseError(error, `Failed to clear downstream match ${downstreamMatch.id}`);
          }
        }

        bracketLog('Cleared downstream matches (full cascade)', {
          matchId,
          clearedCount: downstream.length,
          clearedIds: downstream.map((match) => match.id),
        });
      }

      const { error: reopenError } = await supabase
        .from('match')
        .update({
          ...resultFieldsToClear(currentMatch),
          opponent1_score: null,
          opponent2_score: null,
          status: 2,
        })
        .eq('id', matchId);
      if (reopenError) {
        handleDatabaseError(reopenError, `Failed to reopen match ${matchId}`);
      }
      successLog(`Reopened completed BYE match ${matchId} to Ready`);

      return {
        matchId,
        status: 2,
        statusName: 'Ready',
        message: clearDownstream
          ? 'Match reopened and downstream matches cleared'
          : 'Match reopened to Ready status',
      };
    }

    if (makeReady) {
      if (!check.ok) {
        throw new BusinessLogicError(
          `Cannot set to Ready: ${check.reason}. Match must be a Losers Bracket BYE match that is not Archived.`
        );
      }

      const { error: readyError } = await supabase
        .from('match')
        .update({ status: 2 })
        .eq('id', matchId);
      if (readyError) {
        handleDatabaseError(readyError, `Failed to set match ${matchId} to Ready`);
      }
      successLog(`Admin unlocked BYE match ${matchId} to Ready`);
      return {
        matchId,
        status: 2,
        statusName: 'Ready',
        message:
          'Match unlocked to Ready status. You can now enter scores and advance the bracket.',
      };
    }

    if (!check.meta) throw new BusinessLogicError('Cannot revert: Match data unavailable');
    if (check.meta.status >= 4) {
      throw new BusinessLogicError(
        `Cannot revert: Match is ${check.meta.currentStatusName}. Only Ready (2) or Running (3) matches can be reverted.`
      );
    }

    const { error: waitingError } = await supabase
      .from('match')
      .update({ status: 1 })
      .eq('id', matchId);
    if (waitingError) {
      handleDatabaseError(waitingError, `Failed to set match ${matchId} to Waiting`);
    }
    successLog(`Admin reverted BYE match ${matchId} to Waiting`);

    return {
      matchId,
      status: 1,
      statusName: 'Waiting',
      message: 'Match reverted to Waiting status. Status toggle is available again.',
    };
  } catch (error) {
    failureLog('Admin BYE toggle failed', error);
    throw new BusinessLogicError(
      `Failed to toggle BYE match status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}
