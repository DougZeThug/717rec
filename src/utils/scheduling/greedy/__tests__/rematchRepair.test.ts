import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { pairKey } from '../pairKey';
import { rematchRepairPass } from '../rematchRepair';
import { ScheduledMatch } from '../types';

function makeTeam(id: string, tier: number): Team {
  const divisionName = tier === 1 ? 'Competitive' : tier === 2 ? 'Intermediate' : 'Recreational';
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${tier}`,
    divisionName,
    logo_url: null,
    image_url: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    seed: null,
    created_at: new Date().toISOString(),
    challonge_participant_id: null,
    spotify_url: null,
  } as Team;
}

function makeMatch(slot: string, a: Team, b: Team): ScheduledMatch {
  const getTierNum = (t: Team) => {
    const d = (t.divisionName || '').toLowerCase();
    if (d.includes('competitive')) return 1;
    if (d.includes('intermediate')) return 2;
    return 3;
  };
  return {
    slot,
    teamAId: a.id,
    teamBId: b.id,
    teamAName: a.name,
    teamBName: b.name,
    divisionA: a.divisionName || 'Unknown',
    divisionB: b.divisionName || 'Unknown',
    tierA: getTierNum(a),
    tierB: getTierNum(b),
  };
}

describe('rematchRepairPass', () => {
  // 4 teams, all same tier. Match1 is A-B (rematch), Match2 is C-D (fresh).
  // Swap should produce A-C + B-D or A-D + B-C if fresh.
  const teamA = makeTeam('a', 1);
  const teamB = makeTeam('b', 1);
  const teamC = makeTeam('c', 1);
  const teamD = makeTeam('d', 1);
  const allTeams = [teamA, teamB, teamC, teamD];
  const slotName = '8:30';

  it('swaps a rematch pair when a valid 2-swap exists', () => {
    const playedSet = new Set([pairKey('a', 'b')]); // A-B is a season rematch
    const tonightPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const newPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const matches: ScheduledMatch[] = [
      makeMatch(slotName, teamA, teamB),
      makeMatch(slotName, teamC, teamD),
    ];

    const repaired = rematchRepairPass(
      matches,
      slotName,
      allTeams,
      playedSet,
      tonightPairs,
      newPairs,
      1
    );

    expect(repaired).toBe(1);
    // The A-B rematch should no longer exist
    const hasRematch = matches.some((m) => pairKey(m.teamAId, m.teamBId) === pairKey('a', 'b'));
    expect(hasRematch).toBe(false);
  });

  it('returns 0 when no rematches exist', () => {
    const playedSet = new Set<string>();
    const tonightPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const newPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const matches: ScheduledMatch[] = [
      makeMatch(slotName, teamA, teamB),
      makeMatch(slotName, teamC, teamD),
    ];

    const repaired = rematchRepairPass(
      matches,
      slotName,
      allTeams,
      playedSet,
      tonightPairs,
      newPairs,
      1
    );
    expect(repaired).toBe(0);
  });

  it('does not swap if replacement would violate session constraint', () => {
    // A-B is rematch. A-C is already in tonightPairs (from another slot).
    // A-D is already in tonightPairs too. So no valid swap exists.
    const playedSet = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set([
      pairKey('a', 'b'),
      pairKey('c', 'd'),
      pairKey('a', 'c'),
      pairKey('a', 'd'),
      pairKey('b', 'c'),
      pairKey('b', 'd'),
    ]);
    const newPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const matches: ScheduledMatch[] = [
      makeMatch(slotName, teamA, teamB),
      makeMatch(slotName, teamC, teamD),
    ];

    const repaired = rematchRepairPass(
      matches,
      slotName,
      allTeams,
      playedSet,
      tonightPairs,
      newPairs,
      1
    );
    expect(repaired).toBe(0);
  });

  it('does not swap if replacement would violate tier gap', () => {
    // A (tier 1) and D (tier 3) — gap of 2 > maxTierGap of 1
    const teamD3 = makeTeam('d', 3);
    const teamsWithGap = [teamA, teamB, teamC, teamD3];
    // A-B is rematch. C is tier 1, D3 is tier 3.
    // Rearrangement A-C + B-D3: B(1) vs D3(3) = gap 2 → blocked
    // Rearrangement A-D3 + B-C: A(1) vs D3(3) = gap 2 → blocked
    const playedSet = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const newPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const matches: ScheduledMatch[] = [
      makeMatch(slotName, teamA, teamB),
      makeMatch(slotName, teamC, teamD3),
    ];

    const repaired = rematchRepairPass(
      matches,
      slotName,
      teamsWithGap,
      playedSet,
      tonightPairs,
      newPairs,
      1
    );
    expect(repaired).toBe(0);
  });

  it('updates tonightPairs and newPairs after swap', () => {
    const playedSet = new Set([pairKey('a', 'b')]);
    const tonightPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const newPairs = new Set([pairKey('a', 'b'), pairKey('c', 'd')]);
    const matches: ScheduledMatch[] = [
      makeMatch(slotName, teamA, teamB),
      makeMatch(slotName, teamC, teamD),
    ];

    rematchRepairPass(matches, slotName, allTeams, playedSet, tonightPairs, newPairs, 1);

    // Old pairs should be removed from tonightPairs
    expect(tonightPairs.has(pairKey('a', 'b'))).toBe(false);
    expect(tonightPairs.has(pairKey('c', 'd'))).toBe(false);
    // New pairs should be present
    expect(tonightPairs.size).toBe(2);
  });
});
