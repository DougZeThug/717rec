import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import type { StorageMatch, StorageRound } from '../../types/BracketServiceTypes';
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

  const placedInMatchId = await placeWinnerDownstream(deps, match, winnerParticipantId);

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

/**
 * Place the winner into the next round's matching slot, if that slot is
 * still empty. Round mapping mirrors bracket topology: same match count in
 * the next round → same match number (1:1), halved → ceil(number / 2).
 */
async function placeWinnerDownstream(
  deps: BracketAdminDeps,
  match: StorageMatch,
  winnerParticipantId: number
): Promise<number | null> {
  const rounds = await deps.storage.select('round', { group_id: match.group_id });
  const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
  const currentRound = roundsArray.find((r) => r.id === match.round_id);
  if (!currentRound) return null;

  const nextRound = roundsArray.find((r) => r.number === currentRound.number + 1);
  if (!nextRound) {
    bracketLog(`No round after ${currentRound.number} — match ${match.id} was a final`);
    return null;
  }

  const currentRoundMatches = await deps.storage.select('match', { round_id: currentRound.id });
  const nextRoundMatches = await deps.storage.select('match', { round_id: nextRound.id });
  const currentCount = (
    Array.isArray(currentRoundMatches) ? currentRoundMatches : [currentRoundMatches]
  ).length;
  const nextArray = (
    Array.isArray(nextRoundMatches) ? nextRoundMatches : [nextRoundMatches]
  ) as StorageMatch[];

  const isOneToOne = nextArray.length === currentCount;
  const nextMatchNumber = isOneToOne ? match.number : Math.ceil(match.number / 2);
  const nextMatch = nextArray.find((m) => m.number === nextMatchNumber);
  if (!nextMatch) return null;

  if (
    nextMatch.opponent1?.id === winnerParticipantId ||
    nextMatch.opponent2?.id === winnerParticipantId
  ) {
    bracketLog(`Winner ${winnerParticipantId} already in match ${nextMatch.id}`);
    return null;
  }

  const emptySlot =
    nextMatch.opponent1 !== null && nextMatch.opponent1?.id == null
      ? 'opponent1'
      : nextMatch.opponent2 !== null && nextMatch.opponent2?.id == null
        ? 'opponent2'
        : null;
  if (!emptySlot) {
    throw new BusinessLogicError(
      `Cannot advance the team: both slots of the next match (${nextMatch.id}) are occupied.`
    );
  }

  const otherSlotFilled =
    emptySlot === 'opponent1' ? nextMatch.opponent2?.id != null : nextMatch.opponent1?.id != null;

  const placementFields: { opponent1_id?: number; opponent2_id?: number; status?: number } = {};
  if (emptySlot === 'opponent1') {
    placementFields.opponent1_id = winnerParticipantId;
  } else {
    placementFields.opponent2_id = winnerParticipantId;
  }
  if (nextMatch.status <= 1 && otherSlotFilled) {
    placementFields.status = 2;
  }

  const { error: placeError } = await supabase
    .from('match')
    .update(placementFields)
    .eq('id', nextMatch.id);
  if (placeError) {
    handleDatabaseError(placeError, `Failed to advance the team to match ${nextMatch.id}`);
  }

  bracketLog(`✅ Winner ${winnerParticipantId} placed in ${emptySlot} of match ${nextMatch.id}`);
  return nextMatch.id;
}
