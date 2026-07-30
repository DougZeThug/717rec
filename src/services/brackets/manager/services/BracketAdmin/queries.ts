import type { StorageGroup, StorageMatch, StorageRound } from '../../types/BracketServiceTypes';
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

  // Round numbers restart per group: losers-bracket rounds begin at 1 and the
  // grand final's are 1-2. Comparing raw round numbers across the whole stage
  // therefore drops LB round 1 and both GF matches out of the chain — the very
  // matches "what would this edit disturb?" most needs to see. Order by
  // (group number, round number) instead.
  const groups = (await deps.storage.select('group', {
    stage_id: currentMatch.stage_id,
  })) as StorageGroup[] | StorageGroup | null;
  const groupsArray = groups ? (Array.isArray(groups) ? groups : [groups]) : [];
  const groupNumberById = new Map<number | string, number>();
  for (const group of groupsArray) groupNumberById.set(group.id, group.number);

  const currentGroupNumber = groupNumberById.get(currentMatch.group_id);

  // Without group data, fall back to the round-number-only comparison so a stage
  // that cannot report its groups behaves exactly as it did before.
  const positionOf = (match: StorageMatch): { group: number; round: number } | null => {
    const round = roundNumberById.get(match.round_id);
    if (round === undefined) return null;
    return { group: groupNumberById.get(match.group_id) ?? 0, round };
  };

  const stageMatches = (await deps.storage.select('match', {
    stage_id: currentMatch.stage_id,
  })) as StorageMatch[];
  const allMatches = stageMatches.filter((match) => {
    if (match.id === matchId) return false;
    const position = positionOf(match);
    if (!position) return false;
    if (currentGroupNumber === undefined) return position.round > currentRound.number;
    return position.group !== currentGroupNumber
      ? position.group > currentGroupNumber
      : position.round > currentRound.number;
  });

  allMatches.sort((matchA, matchB) => {
    const a = positionOf(matchA);
    const b = positionOf(matchB);
    return (a?.group ?? 0) - (b?.group ?? 0) || (a?.round ?? 0) - (b?.round ?? 0);
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
