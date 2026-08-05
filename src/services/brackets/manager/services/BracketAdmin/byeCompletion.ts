import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import type { StorageMatch, StorageStage } from '../../types/BracketServiceTypes';
import { markBracketCompleteIfDone } from '../BracketUpdate/completion';
import { applyWinnerPlacement, resolveWinnerPlacement } from './placement';
import type { BracketAdminDeps } from './types';

export interface CompleteByeMatchResult {
  matchId: number;
  winnerParticipantId: number;
  placedInMatchId: number | null;
  message: string;
}

/**
 * Admin-only: complete a one-sided (BYE-side) match by advancing its sole
 * real participant.
 *
 * New brackets never need this — the library resolves BYE matches itself at
 * creation and during propagation. This exists for LEGACY brackets created
 * before the storage adapter faithfully round-tripped BYE slots, where such
 * matches sit half-populated waiting for an admin to walk them through
 * (typically after adminToggleByeReady). All writes are loud.
 */
export async function adminCompleteByeMatch(
  deps: BracketAdminDeps,
  matchId: number,
  score = 0
): Promise<CompleteByeMatchResult> {
  bracketLog(`Admin BYE completion requested for match ${matchId}`, { score });

  const match = (await deps.storage.select('match', matchId)) as StorageMatch | null;
  if (!match) throw new ValidationError(`Match ${matchId} not found`);
  if (match.status === 5) {
    throw new BusinessLogicError(
      'Cannot complete an archived match. Reopen it first if a correction is needed.'
    );
  }

  const opponent1Real = match.opponent1?.id != null;
  const opponent2Real = match.opponent2?.id != null;
  if (opponent1Real && opponent2Real) {
    throw new ValidationError(
      'Both teams are present — score this match through the normal editor.'
    );
  }
  if (!opponent1Real && !opponent2Real) {
    throw new ValidationError('This match has no team to advance yet.');
  }

  const winnerSide = opponent1Real ? 'opponent1' : 'opponent2';
  const winnerParticipantId = (opponent1Real ? match.opponent1?.id : match.opponent2?.id) as number;

  // Resolve the destination BEFORE completing anything. If the winner has nowhere
  // to go this throws having written nothing, instead of leaving the match marked
  // Completed with its winner stranded in the previous round.
  //
  // Not a transaction: if the completion write lands and the placement write then
  // fails on a database error, the match is complete and the winner is not advanced.
  // That is unavoidable without transactions here, it fails loudly, and it is
  // recoverable — this tool is safely re-runnable on a Completed match, since the
  // "winner already downstream" check short-circuits a second placement.
  const placement = await resolveWinnerPlacement(deps, match, winnerParticipantId);

  // Complete the match: winner side gets the score and a win result; the
  // empty side is left untouched (preserving a stored BYE sentinel).
  const completionFields: {
    status: number;
    opponent1_score?: number;
    opponent1_result?: string;
    opponent2_score?: number;
    opponent2_result?: string;
  } =
    winnerSide === 'opponent1'
      ? { status: 4, opponent1_score: score, opponent1_result: 'win' }
      : { status: 4, opponent2_score: score, opponent2_result: 'win' };

  const { error: completeError } = await supabase
    .from('match')
    .update(completionFields)
    .eq('id', matchId);
  if (completeError) {
    handleDatabaseError(completeError, `Failed to complete BYE match ${matchId}`);
  }

  bracketLog(`✅ BYE match ${matchId} completed. Winner participant: ${winnerParticipantId}`);

  const placedInMatchId = placement
    ? await applyWinnerPlacement(placement, winnerParticipantId)
    : null;

  // If this was the last outstanding real match, the bracket must flip to
  // 'completed' exactly as a normal score save would (which also fires the
  // standings finalization downstream).
  const stage = (await deps.storage.select('stage', match.stage_id)) as StorageStage | null;
  if (stage) {
    await markBracketCompleteIfDone({ storage: deps.storage }, String(stage.tournament_id));
  }

  successLog(
    `Admin completed BYE match ${matchId}`,
    placedInMatchId ? `winner advanced to match ${placedInMatchId}` : 'winner already advanced'
  );

  return {
    matchId,
    winnerParticipantId,
    placedInMatchId,
    message: placedInMatchId
      ? 'Match completed; the team advanced to the next round.'
      : 'Match completed; the team was already in the next round.',
  };
}

// Slot classification and winner-placement logic live in ./placement.ts, shared
// with the losers-bracket swap tool (swap.ts).
