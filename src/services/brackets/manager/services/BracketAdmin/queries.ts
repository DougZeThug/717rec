import type { BracketAdminDeps } from './types';

export async function collectDownstreamChain(deps: BracketAdminDeps, matchId: number): Promise<any[]> {
  const currentMatch = await deps.storage.select('match', matchId);
  if (!currentMatch) return [];

  const currentRound = await deps.storage.select('round', currentMatch.round_id);
  if (!currentRound) return [];

  const allRounds = await deps.storage.select('round', { stage_id: currentMatch.stage_id });
  const roundNumberById = new Map<number | string, number>();
  if (Array.isArray(allRounds)) {
    for (const r of allRounds) roundNumberById.set(r.id, r.number);
  }

  const allMatches = (await deps.storage.select('match', { stage_id: currentMatch.stage_id })).filter((m: any) => {
    if (m.id === matchId) return false;
    const rn = roundNumberById.get(m.round_id);
    return rn !== undefined && rn > currentRound.number;
  });

  allMatches.sort((a: any, b: any) => {
    const ra = roundNumberById.get(a.round_id) ?? 0;
    const rb = roundNumberById.get(b.round_id) ?? 0;
    return ra - rb;
  });

  const trackedIds = new Set<number | string>();
  const winnerId = currentMatch.opponent1?.id || currentMatch.opponent2?.id;
  if (winnerId) trackedIds.add(winnerId);
  if (trackedIds.size === 0) return [];

  const result: any[] = [];
  for (const m of allMatches) {
    const o1 = m.opponent1?.id;
    const o2 = m.opponent2?.id;
    const hasTracked = (o1 && trackedIds.has(o1)) || (o2 && trackedIds.has(o2));

    if (hasTracked) {
      result.push(m);
      if (o1 && !trackedIds.has(o1)) trackedIds.add(o1);
      if (o2 && !trackedIds.has(o2)) trackedIds.add(o2);
    }
  }

  return result;
}
