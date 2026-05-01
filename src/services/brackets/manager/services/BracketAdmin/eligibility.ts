import { errorLog } from '@/utils/logger';

import type { BracketAdminDeps, ByeEligibilityResult } from './types';

export async function isLosersByeMatch(
  deps: BracketAdminDeps,
  matchId: number
): Promise<ByeEligibilityResult> {
  try {
    const matchData = await deps.storage.select('match', matchId);
    if (!matchData) return { ok: false, reason: 'Match not found' };

    const round = await deps.storage.select('round', matchData.round_id);
    if (!round) return { ok: false, reason: 'Round not found' };

    const group = await deps.storage.select('group', round.group_id);
    if (!group) return { ok: false, reason: 'Group not found' };

    const isLosers = group.number === 2;
    let opponent1Name: string | null = null;
    let opponent2Name: string | null = null;

    if (matchData.opponent1?.id) {
      const p1 = await deps.storage.select('participant', matchData.opponent1.id);
      opponent1Name = p1?.name || null;
    }
    if (matchData.opponent2?.id) {
      const p2 = await deps.storage.select('participant', matchData.opponent2.id);
      opponent2Name = p2?.name || null;
    }

    const o1Real = !!matchData.opponent1?.id && opponent1Name !== null;
    const o2Real = !!matchData.opponent2?.id && opponent2Name !== null;
    const exactlyOneReal = (o1Real ? 1 : 0) + (o2Real ? 1 : 0) === 1;

    const isByeSide =
      !matchData.opponent1?.id ||
      opponent1Name === null ||
      !matchData.opponent2?.id ||
      opponent2Name === null;

    const lockedOrWaiting = matchData.status === 0 || matchData.status === 1;
    const statusNames: Record<number, string> = { 0: 'Locked', 1: 'Waiting', 2: 'Ready', 3: 'Running', 4: 'Completed', 5: 'Archived' };

    const meta = { isLosers, exactlyOneReal, isByeSide, status: matchData.status, currentStatusName: statusNames[matchData.status] || 'Unknown', opponent1Name, opponent2Name };

    const isCompletedMatch = matchData.status === 4;
    const isEligible = isLosers && exactlyOneReal && isByeSide && (lockedOrWaiting || isCompletedMatch);

    if (!isEligible) {
      let reason = 'Not eligible: ';
      if (!isLosers) reason += 'Not in Losers Bracket. ';
      if (!exactlyOneReal) reason += 'Must have exactly one real team. ';
      if (!isByeSide) reason += 'No BYE detected. ';
      if (!lockedOrWaiting && !isCompletedMatch) reason += `Status is ${meta.currentStatusName} (must be Locked, Waiting, or Completed).`;
      return { ok: false, reason: reason.trim(), meta };
    }

    return { ok: true, meta };
  } catch (error) {
    errorLog('Error checking BYE match eligibility:', error);
    return { ok: false, reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
