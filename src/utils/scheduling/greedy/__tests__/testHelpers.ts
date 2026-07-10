import { expect } from 'vitest';

import { Team } from '@/types';

import { pairKey } from '../pairKey';
import { GreedySchedulerResult, ScheduledMatch } from '../types';

export function makeTeam(id: string, divisionName = 'Competitive'): Team {
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${id}`,
    divisionName,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    created_at: new Date().toISOString(),
  } as Team;
}

export function makeDiagnostics(): GreedySchedulerResult['diagnostics'] {
  return {
    relaxationApplied: 0,
    constraintsRelaxed: [],
    repairAttempted: false,
    rematchesRepaired: 0,
    perTeamRematchAllowances: [],
  };
}

export function makeMatch(slot: string, teamA: Team, teamB: Team): ScheduledMatch {
  return {
    slot,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAName: teamA.name,
    teamBName: teamB.name,
    divisionA: teamA.divisionName || 'Unknown',
    divisionB: teamB.divisionName || 'Unknown',
    tierA: teamA.divisionName?.toLowerCase().includes('competitive')
      ? 1
      : teamA.divisionName?.toLowerCase().includes('recreational')
        ? 3
        : 2,
    tierB: teamB.divisionName?.toLowerCase().includes('competitive')
      ? 1
      : teamB.divisionName?.toLowerCase().includes('recreational')
        ? 3
        : 2,
  };
}

export function expectEveryTeamPlaysExactly(
  matches: ScheduledMatch[],
  teamIds: string[],
  expectedCount: number
): void {
  const counts = new Map(teamIds.map((id) => [id, 0]));
  for (const match of matches) {
    counts.set(match.teamAId, (counts.get(match.teamAId) || 0) + 1);
    counts.set(match.teamBId, (counts.get(match.teamBId) || 0) + 1);
  }

  for (const teamId of teamIds) {
    expect(counts.get(teamId)).toBe(expectedCount);
  }
}

export function expectEveryTeamAppears(matches: ScheduledMatch[], teamIds: string[]): void {
  const playedIds = new Set(matches.flatMap((match) => [match.teamAId, match.teamBId]));
  for (const teamId of teamIds) {
    expect(playedIds.has(teamId)).toBe(true);
  }
}

export function expectNoTeamDoubleBookedPerSlot(matches: ScheduledMatch[], slots?: string[]): void {
  const slotsToCheck = slots ?? [...new Set(matches.map((match) => match.slot))];
  for (const slot of slotsToCheck) {
    const slotIds = matches
      .filter((match) => match.slot === slot)
      .flatMap((match) => [match.teamAId, match.teamBId]);
    expect(new Set(slotIds).size).toBe(slotIds.length);
  }
}

export function expectNoDuplicatePairs(matches: ScheduledMatch[]): void {
  const pairs = matches.map((match) => pairKey(match.teamAId, match.teamBId));
  expect(new Set(pairs).size).toBe(pairs.length);
}

export function expectForbiddenPairsAbsent(
  matches: ScheduledMatch[],
  forbiddenPairs: Set<string>
): void {
  for (const match of matches) {
    expect(forbiddenPairs.has(pairKey(match.teamAId, match.teamBId))).toBe(false);
  }
}
