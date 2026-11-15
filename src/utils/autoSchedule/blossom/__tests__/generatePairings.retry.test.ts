import { describe, expect, it, vi } from 'vitest';

import type { TeamPairing } from '@/types/autoSchedule';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { scheduleLog, warnLog } from '@/utils/logger';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { generatePairingsWithBlossom } from '../generatePairings';
import { splitsIntoTwoSlots, usesOnlyAllowedEdges } from '../validation';

// Real Blossom. Only the network and the logger are faked. The config is the one
// standardPairing.ts builds for each block.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

/** One block of teams, in list order. A team is "A6" (no division) or "A4:Cuspers". */
type Block = { teams: string[]; history: string[] };

const buildTeams = (entries: string[]) =>
  entries.map((entry) => {
    const [id, division] = entry.split(':');
    return createMockTeam({ id, name: id, division, divisionName: division });
  });

/** Generate one block the way standardPairing.ts does, with the block's history as played pairs. */
const generate = (block: Block, getCompatibilityScoreFn = calculateDivisionOnlyCompatibility) =>
  generatePairingsWithBlossom(buildTeams(block.teams), {
    avoidRematches: true,
    fetchSeasonHistoryFn: vi.fn().mockResolvedValue([]),
    getCompatibilityScoreFn,
    playedPairsSet: new Set(block.history.map((pair) => pair.split('-').sort().join('-'))),
  });

/** Each pair as team1-team2|score|rematch flag, in the order the generator returned them. */
const describePairs = (pairings: TeamPairing[]) =>
  pairings.map(
    (pairing) =>
      `${pairing.team1.id}-${pairing.team2.id}|${pairing.compatibilityScore}|${pairing.hasPlayedBefore}`
  );

/** How many matches each team of the block plays, in the block's list order. */
const matchesPerTeam = (block: Block, pairings: TeamPairing[]) =>
  block.teams.map(
    (entry) =>
      pairings.filter(({ team1, team2 }) => [team1.id, team2.id].includes(entry.split(':')[0]))
        .length
  );

/** The pairs as sorted keys, so A-B and B-A are the same pair. */
const pairKeys = (pairings: TeamPairing[]) =>
  new Set(pairings.map(({ team1, team2 }) => [team1.id, team2.id].sort().join('-')));

/**
 * A local copy of Apply's rule (usePairingOperations.ts): 2 slots, list order, each pair goes
 * into the first slot where neither team is booked yet. No free slot means it cannot be split.
 */
const firstFitSplits = (pairings: TeamPairing[]): boolean => {
  const slots = [new Set<string>(), new Set<string>()];
  return pairings.every(({ team1, team2 }) => {
    const slot = slots.find((booked) => !booked.has(team1.id) && !booked.has(team2.id));
    slot?.add(team1.id).add(team2.id);
    return slot !== undefined;
  });
};

/** How many times the generator started a run for a block of this size. */
const runsStarted = (teamCount: number) =>
  vi
    .mocked(scheduleLog)
    .mock.calls.filter(
      ([message]) => message === `Starting Blossom algorithm for ${teamCount} teams`
    ).length;

/** What the generator says when it replaces a list Apply cannot split, or keeps it. */
const replacedNote = (teamCount: number) =>
  `Block of ${teamCount} teams: replaced a list that cannot be split into 2 slots`;
const keptNote = (teamCount: number) =>
  `Block of ${teamCount} teams: pairings cannot be split into 2 slots and no rule-following alternative was found`;

/** One pairing between two teams written as "A1:Competitive". */
const pair = (first: string, second: string, hasPlayedBefore = false): TeamPairing => {
  const [team1, team2] = buildTeams([first, second]);
  return { team1, team2, compatibilityScore: 5, hasPlayedBefore };
};

// Scenarios come from the QA grids (seeded, saved). "clean" = Competitive, Intermediate and
// Recreational only. "mixed" = those plus no division, Cuspers and Recreational High.
const qaSixTeams: Block = {
  teams: [
    'A6',
    'A4:Cuspers',
    'A2:Intermediate',
    'A1:Competitive',
    'A3:Recreational',
    'A5:Recreational High',
  ],
  history: ['A1-A2', 'A3-A4'],
};
const cleanN6x15: Block = {
  teams: [
    'A6:Intermediate',
    'A1:Recreational',
    'A4:Intermediate',
    'A5:Recreational',
    'A2:Intermediate',
    'A3:Intermediate',
  ],
  history: [],
};
const cleanN6x14: Block = {
  teams: [
    'A2:Recreational',
    'A3:Intermediate',
    'A5:Competitive',
    'A1:Intermediate',
    'A4:Intermediate',
    'A6:Competitive',
  ],
  history: [],
};
const cleanN6x177: Block = {
  teams: [
    'A2:Intermediate',
    'A1:Recreational',
    'A4:Intermediate',
    'A6:Competitive',
    'A3:Competitive',
    'A5:Intermediate',
  ],
  history: [],
};
// No schedule that follows the rules exists for these three blocks. n6-424 needs a rematch
// between two Competitive teams. n6-426 needs a Competitive team to play a Recreational team.
// For n6-424 and n6-426 the second run returns a list that breaks one of those rules, and the
// generator must not use it. For n6-394 the second run throws as well.
const mixedN6x424: Block = {
  teams: [
    'A6:Competitive',
    'A2:Recreational',
    'A5:Recreational',
    'A3:Cuspers',
    'A4:Competitive',
    'A1:Cuspers',
  ],
  history: ['A6-A4'],
};
const mixedN6x426: Block = {
  teams: [
    'A2:Competitive',
    'A3:Recreational',
    'A5:Recreational',
    'A1:Recreational',
    'A4:Intermediate',
    'A6:Recreational',
  ],
  history: ['A1-A3'],
};
const mixedN6x394: Block = {
  teams: [
    'A1:Competitive',
    'A2:Competitive',
    'A6:Competitive',
    'A5:Recreational',
    'A4:Intermediate',
    'A3:Recreational High',
  ],
  history: ['A5-A6', 'A1-A6', 'A5-A1', 'A1-A3'],
};
// A night that works today (6 teams, mixed divisions, two rematches to avoid).
const mixedN6x4: Block = {
  teams: [
    'A6:Intermediate',
    'A2',
    'A3:Recreational High',
    'A5:Recreational',
    'A4:Cuspers',
    'A1:Recreational',
  ],
  history: ['A4-A2', 'A2-A6'],
};
// Lists that work today but Apply cannot split into the block's 2 slots.
const mixedN6x3: Block = {
  teams: [
    'A3',
    'A2:Competitive',
    'A4:Cuspers',
    'A5:Recreational',
    'A6:Recreational High',
    'A1:Recreational',
  ],
  history: ['A2-A5', 'A1-A3', 'A1-A6', 'A6-A3'],
};
const mixedN6x1: Block = {
  teams: ['A2:Competitive', 'A1', 'A6', 'A5:Competitive', 'A4:Cuspers', 'A3:Recreational High'],
  history: ['A5-A3', 'A1-A2'],
};

// More lists that Apply cannot split. The second run fixes n8-17 and n10-2. For n6-1030,
// n6-1124 and n6-1286 the second run follows the rules but gives the same list (a 6-cycle
// in the wrong order). For n6-781 it splits but puts a Competitive team against a Recreational
// team. For n6-52 it splits but needs a rematch between a Competitive and a Cuspers team.
const mixedN8x17: Block = {
  teams: [
    'A3:Competitive',
    'A2',
    'A7',
    'A4:Cuspers',
    'A6:Cuspers',
    'A5',
    'A8:Recreational High',
    'A1:Competitive',
  ],
  history: [],
};
const mixedN10x2: Block = {
  teams: [
    'A10:Recreational',
    'A6',
    'A8:Recreational High',
    'A3',
    'A2',
    'A1:Recreational High',
    'A7:Recreational High',
    'A9:Intermediate',
    'A4:Intermediate',
    'A5:Recreational High',
  ],
  history: [],
};
const mixedN6x1030: Block = {
  teams: [
    'A6:Competitive',
    'A4:Recreational',
    'A1:Cuspers',
    'A3:Competitive',
    'A5',
    'A2:Recreational High',
  ],
  history: [],
};
const mixedN6x1124: Block = {
  teams: [
    'A6:Recreational High',
    'A2:Competitive',
    'A4:Competitive',
    'A3',
    'A5:Cuspers',
    'A1:Recreational',
  ],
  history: [],
};
const mixedN6x1286: Block = {
  teams: ['A3:Recreational', 'A2', 'A4', 'A6:Competitive', 'A1:Recreational', 'A5:Competitive'],
  history: [],
};
const mixedN6x781: Block = {
  teams: [
    'A6:Intermediate',
    'A3:Competitive',
    'A1:Recreational',
    'A4:Recreational',
    'A2:Recreational High',
    'A5:Recreational',
  ],
  history: [],
};
const mixedN6x52: Block = {
  teams: [
    'A5:Intermediate',
    'A3:Recreational',
    'A2:Competitive',
    'A6:Recreational',
    'A4:Cuspers',
    'A1:Recreational',
  ],
  history: ['A4-A2'],
};

describe('generatePairingsWithBlossom: blocks that threw before the fix', () => {
  it.each([
    {
      name: 'the 6-team case from QA (A1-A2 and A3-A4 played)',
      block: qaSixTeams,
      pairs: [
        'A6-A1|0|false',
        'A4-A2|5|false',
        'A3-A5|10|false',
        'A6-A3|10|false',
        'A4-A1|0|false',
        'A2-A5|5|false',
      ],
    },
    {
      name: 'n6-15, no history',
      block: cleanN6x15,
      pairs: [
        'A6-A3|10|false',
        'A1-A5|10|false',
        'A4-A2|10|false',
        'A6-A2|10|false',
        'A1-A4|5|false',
        'A5-A3|5|false',
      ],
    },
    {
      name: 'n6-14, no history',
      block: cleanN6x14,
      pairs: [
        'A2-A3|5|false',
        'A5-A6|10|false',
        'A1-A4|10|false',
        'A2-A1|5|false',
        'A3-A5|5|false',
        'A4-A6|5|false',
      ],
    },
    {
      name: 'n6-177, no history',
      block: cleanN6x177,
      pairs: [
        'A2-A1|5|false',
        'A4-A5|10|false',
        'A6-A3|10|false',
        'A2-A6|5|false',
        'A1-A4|5|false',
        'A3-A5|5|false',
      ],
    },
  ])('now returns a rule-following list for $name', async ({ block, pairs }) => {
    const pairings = await generate(block);

    expect(describePairs(pairings)).toEqual(pairs);
    expect(matchesPerTeam(block, pairings)).toEqual(block.teams.map(() => 2));
    expect(pairKeys(pairings).size).toBe(pairings.length);
    expect(usesOnlyAllowedEdges(pairings)).toBe(true);
    expect(firstFitSplits(pairings)).toBe(true);
  });

  it.each([
    {
      name: 'n6-424 (only a rematch between two Competitive teams would work)',
      block: mixedN6x424,
      message:
        "2 teams don't have 2 matches. Details: A2 (T3): 1/2 matches. Available opponents: 3, blocked by tier: 2, blocked by rematch: 0; A5 (T3): 1/2 matches. Available opponents: 3, blocked by tier: 2, blocked by rematch: 0",
    },
    {
      name: 'n6-426 (only a Competitive team against a Recreational team would work)',
      block: mixedN6x426,
      message:
        "2 teams don't have 2 matches. Details: A2 (T1): 1/2 matches. Available opponents: 1, blocked by tier: 4, blocked by rematch: 0; A4 (T2): 1/2 matches. Available opponents: 5, blocked by tier: 0, blocked by rematch: 0",
    },
    {
      name: 'n6-394 (no rule-following list, and the second run fails too)',
      block: mixedN6x394,
      message:
        "2 teams don't have 2 matches. Details: A5 (T3): 1/2 matches. Available opponents: 2, blocked by tier: 3, blocked by rematch: 0; A3 (T3): 1/2 matches. Available opponents: 2, blocked by tier: 3, blocked by rematch: 0",
    },
  ])('still rejects with the first error for $name', async ({ block, message }) => {
    await expect(generate(block)).rejects.toThrowError(new Error(message));
  });
});

describe('generatePairingsWithBlossom: lists Apply could not split before the fix', () => {
  it.each([
    {
      name: 'n6-3 (two triangles A3-A2-A4 and A5-A6-A1)',
      block: mixedN6x3,
      pairs: [
        'A3-A2|0|false',
        'A4-A1|10|false',
        'A5-A6|10|false',
        'A3-A5|10|false',
        'A2-A4|0|false',
        'A6-A1|10|true',
      ],
    },
    {
      name: 'n6-1 (the right pairs in an order Apply cannot split)',
      block: mixedN6x1,
      pairs: [
        'A2-A5|10|false',
        'A1-A3|10|false',
        'A6-A4|10|false',
        'A2-A6|0|false',
        'A1-A5|0|false',
        'A4-A3|10|false',
      ],
    },
    {
      name: 'n8-17 (8 teams)',
      block: mixedN8x17,
      pairs: [
        'A3-A1|10|false',
        'A2-A8|10|false',
        'A7-A5|10|false',
        'A4-A6|10|false',
        'A3-A2|0|false',
        'A7-A4|10|false',
        'A6-A8|10|false',
        'A5-A1|0|false',
      ],
    },
    {
      name: 'n10-2 (10 teams)',
      block: mixedN10x2,
      pairs: [
        'A10-A5|10|false',
        'A6-A7|10|false',
        'A8-A1|10|false',
        'A3-A2|10|false',
        'A9-A4|10|false',
        'A10-A7|10|false',
        'A6-A9|5|false',
        'A8-A2|10|false',
        'A3-A1|10|false',
        'A4-A5|5|false',
      ],
    },
  ])('now returns a list Apply can split for $name', async ({ block, pairs }) => {
    const pairings = await generate(block);

    expect(describePairs(pairings)).toEqual(pairs);
    expect(matchesPerTeam(block, pairings)).toEqual(block.teams.map(() => 2));
    expect(pairKeys(pairings).size).toBe(pairings.length);
    expect(usesOnlyAllowedEdges(pairings)).toBe(true);
    expect(firstFitSplits(pairings)).toBe(true);
    expect(splitsIntoTwoSlots(pairings)).toBe(true);
    expect(runsStarted(block.teams.length)).toBe(2);
    expect(warnLog).toHaveBeenCalledWith(replacedNote(block.teams.length));
    expect(warnLog).not.toHaveBeenCalledWith(keptNote(block.teams.length));
  });

  it.each([
    {
      name: 'n6-1030 (a 6-cycle in the wrong order; the second run gives the same list)',
      block: mixedN6x1030,
      pairs: [
        'A6-A3|10|false',
        'A6-A1|0|false',
        'A4-A2|10|false',
        'A4-A1|10|false',
        'A3-A5|0|false',
        'A5-A2|10|false',
      ],
    },
    {
      name: 'n6-1124 (a 6-cycle in the wrong order; the second run gives the same list)',
      block: mixedN6x1124,
      pairs: [
        'A6-A1|10|false',
        'A6-A3|10|false',
        'A2-A4|10|false',
        'A2-A3|0|false',
        'A4-A5|0|false',
        'A5-A1|10|false',
      ],
    },
    {
      name: 'n6-1286 (a 6-cycle in the wrong order; the second run gives the same list)',
      block: mixedN6x1286,
      pairs: [
        'A3-A1|10|false',
        'A3-A2|10|false',
        'A6-A5|10|false',
        'A2-A6|0|false',
        'A4-A1|10|false',
        'A4-A5|0|false',
      ],
    },
    {
      name: 'n6-781 (the second list splits but puts a Competitive team against a Recreational team)',
      block: mixedN6x781,
      pairs: [
        'A6-A3|5|false',
        'A1-A4|10|false',
        'A1-A2|10|false',
        'A4-A2|10|false',
        'A6-A5|5|false',
        'A3-A5|0|false',
      ],
    },
    {
      name: 'n6-52 (the second list splits but needs a rematch between a Competitive and a Cuspers team)',
      block: mixedN6x52,
      pairs: [
        'A5-A2|5|false',
        'A3-A6|10|false',
        'A3-A4|10|false',
        'A6-A4|10|false',
        'A5-A1|5|false',
        'A2-A1|0|false',
      ],
    },
  ])('keeps the first list, unchanged, for $name', async ({ block, pairs }) => {
    const pairings = await generate(block);

    expect(describePairs(pairings)).toEqual(pairs);
    expect(firstFitSplits(pairings)).toBe(false);
    expect(runsStarted(block.teams.length)).toBe(2);
    expect(warnLog).toHaveBeenCalledWith(keptNote(block.teams.length));
    expect(warnLog).not.toHaveBeenCalledWith(replacedNote(block.teams.length));
  });
});

describe('generatePairingsWithBlossom: nights that work today', () => {
  it.each([
    {
      name: '4 teams, same division, one rematch to avoid',
      block: {
        teams: ['A2:Cuspers', 'A1:Cuspers', 'A4:Cuspers', 'A3:Cuspers'],
        history: ['A3-A2'],
      },
      pairs: ['A2-A4|10|false', 'A1-A3|10|false', 'A2-A1|10|false', 'A4-A3|10|false'],
    },
    {
      name: '4 teams, mixed divisions, one rematch to avoid',
      block: {
        teams: ['A2:Recreational', 'A1:Cuspers', 'A3:Intermediate', 'A4:Recreational High'],
        history: ['A3-A1'],
      },
      pairs: ['A2-A3|5|false', 'A1-A4|10|false', 'A2-A1|10|false', 'A3-A4|5|false'],
    },
    {
      name: '6 teams, no division, no history',
      block: { teams: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], history: [] },
      pairs: [
        'A1-A6|10|false',
        'A2-A5|10|false',
        'A3-A4|10|false',
        'A1-A5|10|false',
        'A2-A3|10|false',
        'A4-A6|10|false',
      ],
    },
    {
      name: '6 teams, mixed divisions, two rematches to avoid',
      block: {
        teams: [
          'A6:Intermediate',
          'A2',
          'A3:Recreational High',
          'A5:Recreational',
          'A4:Cuspers',
          'A1:Recreational',
        ],
        history: ['A4-A2', 'A2-A6'],
      },
      pairs: [
        'A6-A3|5|false',
        'A2-A1|10|false',
        'A5-A4|10|false',
        'A6-A5|5|false',
        'A2-A3|10|false',
        'A4-A1|10|false',
      ],
    },
    {
      name: '8 teams, mixed divisions, four rematches to avoid',
      block: {
        teams: [
          'A5:Intermediate',
          'A1:Cuspers',
          'A4:Intermediate',
          'A2:Intermediate',
          'A7:Competitive',
          'A8',
          'A3:Recreational',
          'A6:Intermediate',
        ],
        history: ['A7-A5', 'A6-A8', 'A7-A4', 'A5-A4'],
      },
      pairs: [
        'A5-A6|10|false',
        'A1-A3|10|false',
        'A4-A2|10|false',
        'A7-A8|0|false',
        'A5-A2|10|false',
        'A1-A7|0|false',
        'A4-A6|10|false',
        'A8-A3|10|false',
      ],
    },
    {
      name: '8 teams, mixed divisions, no history',
      block: {
        teams: [
          'A1:Cuspers',
          'A6:Cuspers',
          'A2:Cuspers',
          'A3:Competitive',
          'A4:Recreational High',
          'A7:Recreational',
          'A5:Intermediate',
          'A8:Cuspers',
        ],
        history: [],
      },
      pairs: [
        'A3-A5|5|false',
        'A1-A3|0|false',
        'A1-A4|10|false',
        'A6-A4|10|false',
        'A6-A7|10|false',
        'A2-A7|10|false',
        'A2-A8|10|false',
        'A5-A8|5|false',
      ],
    },
  ])('returns the same list for $name', async ({ block, pairs }) => {
    const pairings = await generate(block);

    expect(describePairs(pairings)).toEqual(pairs);
    expect(firstFitSplits(pairings)).toBe(true);
  });
});

describe('generatePairingsWithBlossom: blocks of 0, 1, 2, 3 and 5 teams today', () => {
  it('returns an empty list for 0 or 1 team', async () => {
    expect(await generate({ teams: [], history: [] })).toEqual([]);
    expect(await generate({ teams: ['A1'], history: [] })).toEqual([]);
  });

  it('gives 2 teams one match', async () => {
    expect(describePairs(await generate({ teams: ['A1', 'A2'], history: [] }))).toEqual([
      'A1-A2|10|false',
    ]);
  });

  it('gives 3 teams a triangle', async () => {
    expect(describePairs(await generate({ teams: ['A1', 'A2', 'A3'], history: [] }))).toEqual([
      'A1-A3|10|false',
      'A2-A3|10|false',
      'A1-A2|10|false',
    ]);
  });

  it.each([
    {
      name: '5 teams',
      block: { teams: ['A1', 'A2', 'A3', 'A4', 'A5'], history: [] },
      message:
        "2 teams don't have 2 matches. Details: A4 (T2): 1/2 matches. Available opponents: 4, blocked by tier: 0, blocked by rematch: 0; A5 (T2): 1/2 matches. Available opponents: 4, blocked by tier: 0, blocked by rematch: 0",
    },
    {
      name: '5 teams with one rematch to avoid',
      block: { teams: ['A1', 'A2', 'A3', 'A4', 'A5'], history: ['A1-A2'] },
      message:
        "1 teams don't have 2 matches. Details: A5 (T2): 0/2 matches. Available opponents: 4, blocked by tier: 0, blocked by rematch: 0",
    },
  ])('rejects for $name', async ({ block, message }) => {
    await expect(generate(block)).rejects.toThrowError(new Error(message));
  });
});

describe('generatePairingsWithBlossom: when the second run happens', () => {
  const retryNote = 'Block of 6 teams: used perfect matchings after the first run failed';

  it('runs once on a night that works, and says nothing about a second run', async () => {
    await generate(mixedN6x4);

    expect(runsStarted(6)).toBe(1);
    expect(warnLog).not.toHaveBeenCalledWith(retryNote);
    expect(warnLog).not.toHaveBeenCalledWith(replacedNote(6));
    expect(warnLog).not.toHaveBeenCalledWith(keptNote(6));
  });

  it('runs twice when the first run throws and the second list follows the rules', async () => {
    await generate(qaSixTeams);

    expect(runsStarted(6)).toBe(2);
    expect(warnLog).toHaveBeenCalledWith(retryNote);
  });

  it('runs twice when the second list breaks a rule, and does not use it', async () => {
    await expect(generate(mixedN6x424)).rejects.toThrowError();

    expect(runsStarted(6)).toBe(2);
    expect(warnLog).not.toHaveBeenCalledWith(retryNote);
  });

  it('throws the first error when the second run throws a different error', async () => {
    const failsOnSecondRun: typeof calculateDivisionOnlyCompatibility = (first, second) => {
      if (runsStarted(6) > 1) throw new Error('the second run failed');
      return calculateDivisionOnlyCompatibility(first, second);
    };

    await expect(generate(qaSixTeams, failsOnSecondRun)).rejects.toThrowError(
      new Error(
        "1 teams don't have 2 matches. Details: A2 (T2): 0/2 matches. Available opponents: 4, blocked by tier: 0, blocked by rematch: 1"
      )
    );
    expect(runsStarted(6)).toBe(2);
  });

  it('runs once on an odd block that throws', async () => {
    await expect(
      generate({ teams: ['A1', 'A2', 'A3', 'A4', 'A5'], history: [] })
    ).rejects.toThrowError();

    expect(runsStarted(5)).toBe(1);
  });

  it.each([2, 3])('runs once on a block of %i teams', async (teamCount) => {
    await generate({ teams: ['A1', 'A2', 'A3'].slice(0, teamCount), history: [] });

    expect(runsStarted(teamCount)).toBe(1);
  });
});

describe('usesOnlyAllowedEdges', () => {
  it('accepts a list with no rematch and no Competitive-vs-Recreational pair', () => {
    expect(
      usesOnlyAllowedEdges([
        pair('A1:Competitive', 'A2:Intermediate'),
        pair('A3:Recreational', 'A4:Intermediate'),
      ])
    ).toBe(true);
  });

  it('accepts a rematch between two Recreational teams', () => {
    expect(usesOnlyAllowedEdges([pair('A1:Recreational', 'A2:Recreational High', true)])).toBe(
      true
    );
  });

  it('rejects a Competitive team against a Recreational team', () => {
    expect(usesOnlyAllowedEdges([pair('A1:Competitive', 'A2:Recreational')])).toBe(false);
  });

  it('rejects a rematch that is not between two Recreational teams', () => {
    expect(usesOnlyAllowedEdges([pair('A1:Competitive', 'A2:Competitive', true)])).toBe(false);
    expect(usesOnlyAllowedEdges([pair('A1:Intermediate', 'A2:Recreational', true)])).toBe(false);
  });

  it('rejects the list when one pair in it breaks a rule', () => {
    expect(
      usesOnlyAllowedEdges([
        pair('A1:Competitive', 'A2:Intermediate'),
        pair('A3:Competitive', 'A4:Recreational'),
      ])
    ).toBe(false);
  });
});

describe('splitsIntoTwoSlots', () => {
  const list = (...pairs: string[]) =>
    pairs.map((text) => pair(...(text.split('-') as [string, string])));

  it('accepts an empty list and a single pair', () => {
    expect(splitsIntoTwoSlots([])).toBe(true);
    expect(splitsIntoTwoSlots(list('A-B'))).toBe(true);
  });

  it('accepts one full round followed by a second round (6 teams)', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'C-D', 'E-F', 'B-C', 'D-E', 'F-A'))).toBe(true);
  });

  it('accepts the same pairs in a different order when each pair still finds a free slot', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'B-C', 'C-D', 'D-E', 'E-F', 'F-A'))).toBe(true);
  });

  it('rejects the right pairs in a bad order (a 6-cycle: A-B, D-E, B-C, E-F, C-D, F-A)', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'D-E', 'B-C', 'E-F', 'C-D', 'F-A'))).toBe(false);
  });

  it('rejects two triangles', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'B-C', 'A-C', 'D-E', 'E-F', 'D-F'))).toBe(false);
  });

  it('accepts a pair twice but rejects it a third time', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'A-B'))).toBe(true);
    expect(splitsIntoTwoSlots(list('A-B', 'A-B', 'A-B'))).toBe(false);
  });

  it('rejects a pair that finds one of its teams booked in each slot', () => {
    // A-B takes slot 1, A-C takes slot 2 (A is booked in slot 1), so B-C has B in slot 1 and C in slot 2.
    expect(splitsIntoTwoSlots(list('A-B', 'A-C', 'B-C'))).toBe(false);
  });

  it('accepts a pair that has exactly one free slot left', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'A-C', 'B-D'))).toBe(true);
  });

  it('rejects a third match for one team', () => {
    expect(splitsIntoTwoSlots(list('A-B', 'A-C', 'A-D'))).toBe(false);
  });
});
