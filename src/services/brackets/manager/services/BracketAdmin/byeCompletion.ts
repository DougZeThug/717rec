import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import type { StorageMatch, StorageRound, StorageStage } from '../../types/BracketServiceTypes';
import { markBracketCompleteIfDone } from '../BracketUpdate/completion';
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

/**
 * How a downstream slot can be occupied, for reporting purposes.
 *
 * A strictly-null slot is a stored BYE — no team can ever play there, and it must
 * NOT receive a winner (matchTransforms.ts flattens it to the 'bye' sentinel;
 * MatchPropagationRepairService and lifecycle.ts protect the same marker). It is
 * unavailable for the same reason a taken slot is, but for a different cause, and
 * saying "occupied" for both leaves an admin hunting for a team that isn't there.
 *
 * `undefined` classifies as 'empty', exactly as the previous inline check did.
 */
type SlotState = 'bye' | 'empty' | 'taken';

const slotState = (slot: StorageMatch['opponent1']): SlotState =>
  slot === null ? 'bye' : slot?.id == null ? 'empty' : 'taken';

const describeSlot = (state: SlotState): string =>
  state === 'bye' ? 'a BYE (no team can ever play there)' : 'already taken';

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

  const [currentRoundMatches, nextRoundMatches] = await Promise.all([
    deps.storage.select('match', { round_id: currentRound.id }),
    deps.storage.select('match', { round_id: nextRound.id }),
  ]);
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

  const slot1 = slotState(nextMatch.opponent1);
  const slot2 = slotState(nextMatch.opponent2);

  // Under the halving mapping, matches 2k-1 and 2k both feed next match k, and
  // topology fixes which slot each owns: odd feeder → opponent1, even → opponent2
  // (SourceNodeCalculator.ts, "match N gets winners from matches (2N-1) and (2N)").
  // Taking whichever slot happened to be empty transposed the pair whenever the
  // even feeder was completed first.
  //
  // Not applied to the 1:1 mapping: that is a losers-bracket minor round, where one
  // slot takes the LB progression winner and the other a winners-bracket drop-in.
  // The feeder's number says nothing about which, so parity there would be a guess.
  const preferredSlot = isOneToOne ? null : match.number % 2 === 1 ? 'opponent1' : 'opponent2';
  const preferredState = preferredSlot === 'opponent1' ? slot1 : preferredSlot ? slot2 : null;

  if (preferredSlot && preferredState !== 'empty') {
    // Legacy brackets are already inconsistent by the time this tool is reached;
    // fall back rather than refuse, but leave a trace of the mismatch.
    bracketLog(
      `Feeder parity wanted ${preferredSlot} of match ${nextMatch.id} for match ` +
        `${match.number}, but it is ${preferredState} — falling back to first empty slot`
    );
  }

  const emptySlot =
    preferredSlot && preferredState === 'empty'
      ? preferredSlot
      : slot1 === 'empty'
        ? 'opponent1'
        : slot2 === 'empty'
          ? 'opponent2'
          : null;
  if (!emptySlot) {
    throw new BusinessLogicError(
      `Cannot advance the team to match ${nextMatch.id}: opponent1 is ` +
        `${describeSlot(slot1)} and opponent2 is ${describeSlot(slot2)}.`
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
