import { beforeEach, describe, expect, it, vi } from 'vitest';

import { compareSeedOrder } from '@/utils/rankingUtils/seedOrder';

// The Create Bracket form lists teams with compareSeedOrder. The saved bracket
// orders the same teams inline in createBracket. If the two ever disagree, the
// admin sees one order and the bracket uses another. These tests run the same
// teams through both and compare the order.

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

const mockManagerCreate = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock('@/services/brackets/manager', () => ({
  bracketManagerService: {
    createBracket: (...args: unknown[]) => mockManagerCreate(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  warnLog: vi.fn(),
}));

// Import after mocks
import { createBracket } from '../bracket-creator';

type TeamDetailRow = {
  team_id: string;
  name: string;
  power_score: number | null;
  win_percentage: number;
  divisionname?: string;
};

function installSupabase(fullTeamData: TeamDetailRow[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'v_team_details') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: fullTeamData, error: null }),
        }),
      };
    }
    if (table === 'brackets') {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'bracket-1', created_at: '2026-05-01T00:00:00Z', format: 'x' },
                error: null,
              }),
          }),
        }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    }
    return {};
  });
}

/** The order the saved bracket gives the teams, best seed first. */
const savedBracketOrder = async (rows: TeamDetailRow[]): Promise<string[]> => {
  installSupabase(rows);
  // Hand the teams over in reverse, so the input order cannot decide the result.
  await createBracket({
    name: 'Parity Playoffs',
    format: 'singleElim',
    divisionId: 'div-1',
    teams: [...rows].reverse().map((row) => ({ id: row.team_id, name: row.name })),
  });
  const call = mockManagerCreate.mock.calls[0][0] as { teams: Array<{ id: string }> };
  return call.teams.map((entry) => entry.id);
};

/** The order the Create Bracket form lists the same teams. */
const formOrder = (rows: TeamDetailRow[]): string[] =>
  [...rows]
    .sort((a, b) =>
      compareSeedOrder(
        {
          powerScore: a.power_score,
          divisionName: a.divisionname,
          winPercentage: a.win_percentage,
          name: a.name,
        },
        {
          powerScore: b.power_score,
          divisionName: b.divisionname,
          winPercentage: b.win_percentage,
          name: b.name,
        }
      )
    )
    .map((row) => row.team_id);

// The fixtures come from bracket-creator.test.ts ("seeding order"), plus the
// expected order each one is known to give. A team with no score against a real
// 0 is left out on purpose: the form list reads a missing score as 0 (the team
// service does `?? 0`), the saved bracket reads it as no score.
const fixtures: Array<{ title: string; rows: TeamDetailRow[]; expected: string[] }> = [
  {
    title: 'power score, highest first',
    rows: [
      { team_id: 'a', name: 'A', power_score: 50, win_percentage: 0.5 },
      { team_id: 'b', name: 'B', power_score: 90, win_percentage: 0.5 },
      { team_id: 'c', name: 'C', power_score: 70, win_percentage: 0.5 },
    ],
    expected: ['b', 'c', 'a'],
  },
  {
    title: 'no power score sinks to the end',
    rows: [
      { team_id: 'a', name: 'A', power_score: null, win_percentage: 0.9 },
      { team_id: 'b', name: 'B', power_score: 80, win_percentage: 0.5 },
    ],
    expected: ['b', 'a'],
  },
  {
    title: 'equal power scores: win percentage decides',
    rows: [
      { team_id: 'a', name: 'A', power_score: 50, win_percentage: 0.8 },
      { team_id: 'b', name: 'B', power_score: 50, win_percentage: 0.5 },
    ],
    expected: ['a', 'b'],
  },
  {
    title: 'a displayed tie: the better division beats the better win %',
    rows: [
      {
        team_id: 'rec',
        name: 'Rec Stars',
        power_score: 55,
        win_percentage: 0.9,
        divisionname: 'Recreational',
      },
      {
        team_id: 'comp',
        name: 'Comp Crew',
        power_score: 55,
        win_percentage: 0.4,
        divisionname: 'Competitive',
      },
    ],
    expected: ['comp', 'rec'],
  },
  {
    title: '41.65 and 41.6 print the same, so win % decides',
    rows: [
      {
        team_id: 'high',
        name: 'High Raw',
        power_score: 41.65,
        win_percentage: 0.4,
        divisionname: 'Intermediate',
      },
      {
        team_id: 'low',
        name: 'Low Raw',
        power_score: 41.6,
        win_percentage: 0.7,
        divisionname: 'Intermediate',
      },
    ],
    expected: ['low', 'high'],
  },
  {
    title: 'a power score of zero stays above a negative one',
    rows: [
      { team_id: 'zero', name: 'Zero', power_score: 0, win_percentage: 0 },
      { team_id: 'minus', name: 'Minus', power_score: -5, win_percentage: 0 },
    ],
    expected: ['zero', 'minus'],
  },
  {
    title: 'a full tie: team name, A to Z',
    rows: [
      { team_id: 'z', name: 'Zeta', power_score: 50, win_percentage: 0.5 },
      { team_id: 'al', name: 'Alpha', power_score: 50, win_percentage: 0.5 },
    ],
    expected: ['al', 'z'],
  },
];

describe('Create Bracket form order matches the saved bracket order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(fixtures)('$title', async ({ rows, expected }) => {
    expect(formOrder(rows)).toEqual(expected);
    expect(await savedBracketOrder(rows)).toEqual(expected);
  });
});
