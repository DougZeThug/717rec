import { errorLog } from '@/utils/logger';

import type { StorageMatch } from '../../types/BracketServiceTypes';
import type { BracketAdminDeps, ByeEligibilityResult, MatchEligibilityContext } from './types';

const STATUS_NAMES: Record<number, string> = {
  0: 'Locked',
  1: 'Waiting',
  2: 'Ready',
  3: 'Running',
  4: 'Completed',
  5: 'Archived',
};

async function loadEligibilityContext(
  deps: BracketAdminDeps,
  matchId: number
): Promise<{ context?: MatchEligibilityContext; reason?: string }> {
  const matchData = (await deps.storage.select('match', matchId)) as StorageMatch | null;
  if (!matchData) return { reason: 'Match not found' };

  const round = (await deps.storage.select('round', matchData.round_id)) as unknown as StorageRound | null;
  if (!round) return { reason: 'Round not found' };

  const group = (await deps.storage.select('group', round.group_id)) as unknown as StorageGroup | null;
  if (!group) return { reason: 'Group not found' };

  const opponent1Name = matchData.opponent1?.id
    ? ((await deps.storage.select('participant', matchData.opponent1.id))?.name ?? null)
    : null;
  const opponent2Name = matchData.opponent2?.id
    ? ((await deps.storage.select('participant', matchData.opponent2.id))?.name ?? null)
    : null;

  return { context: { matchData, round, group, opponent1Name, opponent2Name } };
}

function buildEligibility(context: MatchEligibilityContext): ByeEligibilityResult {
  const { matchData, group, opponent1Name, opponent2Name } = context;
  const isLosers = group.number === 2;
  const o1Real = Boolean(matchData.opponent1?.id) && opponent1Name !== null;
  const o2Real = Boolean(matchData.opponent2?.id) && opponent2Name !== null;
  const exactlyOneReal = (o1Real ? 1 : 0) + (o2Real ? 1 : 0) === 1;

  const isByeSide =
    !matchData.opponent1?.id ||
    opponent1Name === null ||
    !matchData.opponent2?.id ||
    opponent2Name === null;

  const lockedOrWaiting = matchData.status === 0 || matchData.status === 1;
  const isCompletedMatch = matchData.status === 4;

  const meta = {
    isLosers,
    exactlyOneReal,
    isByeSide,
    status: matchData.status,
    currentStatusName: STATUS_NAMES[matchData.status] || 'Unknown',
    opponent1Name,
    opponent2Name,
  };

  const isEligible = isLosers && exactlyOneReal && isByeSide && (lockedOrWaiting || isCompletedMatch);
  if (isEligible) return { ok: true, meta };

  const reasons: string[] = [];
  if (!isLosers) reasons.push('Not in Losers Bracket.');
  if (!exactlyOneReal) reasons.push('Must have exactly one real team.');
  if (!isByeSide) reasons.push('No BYE detected.');
  if (!lockedOrWaiting && !isCompletedMatch) {
    reasons.push(`Status is ${meta.currentStatusName} (must be Locked, Waiting, or Completed).`);
  }

  return { ok: false, reason: `Not eligible: ${reasons.join(' ')}`.trim(), meta };
}

export async function isLosersByeMatch(
  deps: BracketAdminDeps,
  matchId: number
): Promise<ByeEligibilityResult> {
  try {
    const { context, reason } = await loadEligibilityContext(deps, matchId);
    if (!context) return { ok: false, reason };
    return buildEligibility(context);
  } catch (error) {
    errorLog('Error checking BYE match eligibility:', error);
    return {
      ok: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
