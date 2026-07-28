import type { StorageMatch, StorageRound } from '../../types/BracketServiceTypes';
import type { BracketAdminDeps } from './types';

/**
 * Matches fed by this one, found by following participants forward.
 *
 * By default it seeds from the winner alone, which is what the reopen cascade
 * wants: clearing a match un-advances the team it sent onward.
 *
 * `includeLoser` also seeds from the losing side. Double elimination sends the
 * loser into the losers bracket, so anything asking "would changing this result
 * disturb matches already played?" has to look down both continuations — the
 * loser's LB match can be played while the winner's next match is not.
 */
export async function collectDownstreamChain(
  deps: BracketAdminDeps,
  matchId: number,
  options: { includeLoser?: boolean } = {}
): Promise<StorageMatch[]> {
  const currentMatch = (await deps.storage.select('match', matchId)) as StorageMatch | null;
  if (!currentMatch) return [];

  const currentRound = (await deps.storage.select(
    'round',
    currentMatch.round_id
  )) as StorageRound | null;
  if (!currentRound) return [];

  const allRounds = (await deps.storage.select('round', {
    stage_id: currentMatch.stage_id,
  })) as StorageRound[];
  const roundNumberById = new Map<number | string, number>();
  for (const round of allRounds) roundNumberById.set(round.id, round.number);

  const stageMatches = (await deps.storage.select('match', {
    stage_id: currentMatch.stage_id,
  })) as StorageMatch[];
  const allMatches = stageMatches.filter((match) => {
    if (match.id === matchId) return false;
    const roundNumber = roundNumberById.get(match.round_id);
    return roundNumber !== undefined && roundNumber > currentRound.number;
  });

  allMatches.sort((matchA, matchB) => {
    const roundA = roundNumberById.get(matchA.round_id) ?? 0;
    const roundB = roundNumberById.get(matchB.round_id) ?? 0;
    return roundA - roundB;
  });

  const trackedIds = new Set<number | string>();
  const winnerIsOpponent1 = currentMatch.opponent1?.result === 'win';
  const winnerIsOpponent2 = currentMatch.opponent2?.result === 'win';
  const winnerId = winnerIsOpponent1
    ? currentMatch.opponent1?.id
    : winnerIsOpponent2
      ? currentMatch.opponent2?.id
      : null;
  if (winnerId) trackedIds.add(winnerId);

  if (options.includeLoser && (winnerIsOpponent1 || winnerIsOpponent2)) {
    const loserId = winnerIsOpponent1 ? currentMatch.opponent2?.id : currentMatch.opponent1?.id;
    if (loserId) trackedIds.add(loserId);
  }

  if (trackedIds.size === 0) return [];

  const result: StorageMatch[] = [];
  for (const match of allMatches) {
    const o1 = match.opponent1?.id;
    const o2 = match.opponent2?.id;
    const hasTracked = (o1 && trackedIds.has(o1)) || (o2 && trackedIds.has(o2));

    if (hasTracked) {
      result.push(match);
      if (o1 && !trackedIds.has(o1)) trackedIds.add(o1);
      if (o2 && !trackedIds.has(o2)) trackedIds.add(o2);
    }
  }

  return result;
}
