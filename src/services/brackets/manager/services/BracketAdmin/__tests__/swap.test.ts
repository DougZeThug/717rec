import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseSqlStorage } from '../../../SupabaseSqlStorage';

/** Every update the code under test issues, captured for exact-payload assertions. */
const updateCalls: { table: string; fields: Record<string, unknown>; id: number }[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      update: (fields: Record<string, unknown>) => ({
        eq: (_column: string, id: number) => {
          updateCalls.push({ table, fields, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

vi.mock('../../BracketUpdate/completion', () => ({
  markBracketCompleteIfDone: vi.fn(() => Promise.resolve()),
}));

import { markBracketCompleteIfDone } from '../../BracketUpdate/completion';
import { adminSwapLoserBracketSlots, checkLoserSwapEligibility } from '../swap';

/**
 * Synthetic losers-bracket round pair mirroring the real-world shape the tool
 * exists for: a 9-team double elimination where LB round 2 holds one real
 * pairing (201) and three walkovers (202-204), feeding LB round 3.
 *
 * Group numbers follow the storage convention: 1 = winners, 2 = losers, 3 = GF.
 */
const STAGE = {
  id: 1,
  tournament_id: 'bracket-1',
  name: 'S',
  type: 'double_elimination',
  number: 1,
  settings: {},
};

const GROUPS = [
  { id: 1, stage_id: 1, number: 1 },
  { id: 2, stage_id: 1, number: 2 },
  { id: 3, stage_id: 1, number: 3 },
];

const ROUNDS = [
  { id: 11, stage_id: 1, group_id: 1, number: 1 }, // WB R1
  { id: 21, stage_id: 1, group_id: 2, number: 2 }, // LB R2 (minor round)
  { id: 22, stage_id: 1, group_id: 2, number: 3 }, // LB R3
];

const PARTICIPANTS = [5, 6, 7, 8, 9, 12].map((n) => ({
  id: n,
  tournament_id: 'bracket-1',
  name: `T${n}`,
  team_id: `uuid-${n}`,
}));

type Slot = { id: number | null; position?: number; score?: number; result?: string } | null;
type FixtureMatch = {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1: Slot;
  opponent2: Slot;
};

function baseMatches(): FixtureMatch[] {
  return [
    // WB match, for the wrong-group refusal.
    {
      id: 101,
      stage_id: 1,
      group_id: 1,
      round_id: 11,
      number: 1,
      status: 2,
      opponent1: { id: 5 },
      opponent2: { id: 9 },
    },
    // LB R2: one real pairing, three walkovers (library form: Locked + 'win').
    {
      id: 201,
      stage_id: 1,
      group_id: 2,
      round_id: 21,
      number: 1,
      status: 2,
      opponent1: { id: 5, position: 2 },
      opponent2: { id: 9 },
    },
    {
      id: 202,
      stage_id: 1,
      group_id: 2,
      round_id: 21,
      number: 2,
      status: 0,
      opponent1: { id: 8, position: 1, result: 'win' },
      opponent2: null,
    },
    {
      id: 203,
      stage_id: 1,
      group_id: 2,
      round_id: 21,
      number: 3,
      status: 0,
      opponent1: { id: 6, position: 4, result: 'win' },
      opponent2: null,
    },
    {
      id: 204,
      stage_id: 1,
      group_id: 2,
      round_id: 21,
      number: 4,
      status: 0,
      opponent1: { id: 7, position: 3, result: 'win' },
      opponent2: null,
    },
    // LB R3, fed by LB R2 (halved: 4 matches → 2).
    {
      id: 301,
      stage_id: 1,
      group_id: 2,
      round_id: 22,
      number: 1,
      status: 1,
      opponent1: { id: null },
      opponent2: { id: 8 },
    },
    {
      id: 302,
      stage_id: 1,
      group_id: 2,
      round_id: 22,
      number: 2,
      status: 2,
      opponent1: { id: 6 },
      opponent2: { id: 7 },
    },
  ];
}

let storage: { select: ReturnType<typeof vi.fn> };

function wire(
  overrides: Partial<Record<number, Partial<FixtureMatch>>> = {},
  stage: Record<string, unknown> = STAGE
): void {
  const matches = baseMatches().map((match) =>
    overrides[match.id] ? { ...match, ...overrides[match.id] } : match
  );
  storage.select.mockImplementation((table: string, filter: unknown) => {
    if (table === 'match' && typeof filter === 'number') {
      return Promise.resolve(matches.find((m) => m.id === filter) ?? null);
    }
    if (table === 'match' && filter && typeof filter === 'object' && 'round_id' in filter) {
      return Promise.resolve(
        matches.filter((m) => m.round_id === (filter as { round_id: number }).round_id)
      );
    }
    if (table === 'round' && typeof filter === 'number') {
      return Promise.resolve(ROUNDS.find((r) => r.id === filter) ?? null);
    }
    if (table === 'round' && filter && typeof filter === 'object' && 'group_id' in filter) {
      return Promise.resolve(
        ROUNDS.filter((r) => r.group_id === (filter as { group_id: number }).group_id)
      );
    }
    if (table === 'group' && typeof filter === 'number') {
      return Promise.resolve(GROUPS.find((g) => g.id === filter) ?? null);
    }
    if (table === 'stage') return Promise.resolve(stage);
    if (table === 'participant') return Promise.resolve(PARTICIPANTS);
    return Promise.resolve(null);
  });
}

const deps = () => ({ storage: storage as unknown as SupabaseSqlStorage });

const swap = (
  sourceMatchId: number,
  sourceSide: 'opponent1' | 'opponent2',
  targetMatchId: number,
  targetSide: 'opponent1' | 'opponent2'
) => adminSwapLoserBracketSlots(deps(), { sourceMatchId, sourceSide, targetMatchId, targetSide });

beforeEach(() => {
  storage = { select: vi.fn() };
  updateCalls.length = 0;
  vi.mocked(markBracketCompleteIfDone).mockClear();
});

describe('adminSwapLoserBracketSlots — validation (all refusals happen before any write)', () => {
  it('refuses to swap a match with itself', async () => {
    wire();
    await expect(swap(201, 'opponent1', 201, 'opponent2')).rejects.toThrow(/two different matches/);
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses single-elimination stages', async () => {
    wire({}, { ...STAGE, type: 'single_elimination' });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(/double-elimination/);
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses matches outside the losers bracket', async () => {
    wire();
    await expect(swap(101, 'opponent1', 201, 'opponent1')).rejects.toThrow(
      /losers-bracket matches/
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses cross-round swaps', async () => {
    wire();
    await expect(swap(201, 'opponent1', 302, 'opponent1')).rejects.toThrow(
      /same losers-bracket round/
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses when a slot is still TBD (its feeding match has not finished)', async () => {
    wire({ 204: { status: 1, opponent1: { id: 7, position: 3 }, opponent2: { id: null } } });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(
      /waiting on a team from an earlier match/
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses a match that is currently being played', async () => {
    wire({
      204: {
        status: 3,
        opponent1: { id: 7, position: 3, score: 1 },
        opponent2: { id: 12, score: 0 },
      },
    });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(
      /currently being played/
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses a genuinely played match (two real teams, completed)', async () => {
    wire({
      204: {
        status: 4,
        opponent1: { id: 7, position: 3, score: 2, result: 'win' },
        opponent2: { id: 12, score: 0, result: 'loss' },
      },
    });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(/already been played/);
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses an archived match', async () => {
    wire({ 204: { status: 5 } });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(/archived/);
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses a BYE-for-BYE swap (a no-op)', async () => {
    wire();
    await expect(swap(202, 'opponent2', 203, 'opponent2')).rejects.toThrow(
      /both selected spots are BYEs/
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses a swap that would leave a match with two BYEs', async () => {
    // Moving 204's only team out in exchange for a BYE would make 204 BYE-vs-BYE,
    // changing the number of real matches in the round.
    wire();
    await expect(swap(204, 'opponent1', 202, 'opponent2')).rejects.toThrow(/two BYEs and no teams/);
    expect(updateCalls).toHaveLength(0);
  });

  it('refuses to undo a walkover whose downstream match has been played', async () => {
    // T7 walked over in 204 and its LB R3 match (302) has since been played —
    // pulling T7 back would orphan a real result.
    wire({
      302: {
        status: 4,
        opponent1: { id: 6, score: 2, result: 'win' },
        opponent2: { id: 7, score: 0, result: 'loss' },
      },
    });
    await expect(swap(201, 'opponent1', 204, 'opponent1')).rejects.toThrow(
      /already advanced to a match that has already been played/
    );
    expect(updateCalls).toHaveLength(0);
  });
});

describe('adminSwapLoserBracketSlots — column semantics (team-for-team, no walkover change)', () => {
  it('moves id + feeder position together, clears results/scores, and leaves both matches Ready', async () => {
    // 204 becomes a real pairing so neither match changes walkover state: the
    // swap is exactly two row updates and the completion re-check.
    wire({
      204: { status: 2, opponent1: { id: 7, position: 3 }, opponent2: { id: 12 } },
    });

    const result = await swap(201, 'opponent1', 204, 'opponent1');

    expect(updateCalls).toEqual([
      {
        table: 'match',
        id: 201,
        fields: {
          opponent1_id: 7,
          opponent1_position: 3,
          opponent1_score: null,
          opponent1_result: null,
          opponent2_result: null,
          opponent2_score: null,
          status: 2,
        },
      },
      {
        table: 'match',
        id: 204,
        fields: {
          opponent1_id: 5,
          opponent1_position: 2,
          opponent1_score: null,
          opponent1_result: null,
          opponent2_result: null,
          opponent2_score: null,
          status: 2,
        },
      },
    ]);
    expect(result).toMatchObject({
      sourceMatchId: 201,
      targetMatchId: 204,
      walkoverCompletedMatchIds: [],
      downstreamClearedMatchIds: [],
    });
    expect(result.message).toContain('Swapped T5 and T7.');
    expect(markBracketCompleteIfDone).toHaveBeenCalledTimes(1);
  });
});

describe('checkLoserSwapEligibility', () => {
  it('rejects matches outside the losers bracket', async () => {
    wire();
    const result = await checkLoserSwapEligibility(deps(), 101);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/losers-bracket matches/);
  });

  it('rejects single-elimination stages', async () => {
    wire({}, { ...STAGE, type: 'single_elimination' });
    const result = await checkLoserSwapEligibility(deps(), 201);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/double-elimination/);
  });

  it('rejects a match still waiting on an earlier result', async () => {
    wire();
    const result = await checkLoserSwapEligibility(deps(), 301);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/waiting on a team/);
  });

  it('lists the movable teams and every sibling slot, flagging BYE spots', async () => {
    wire();
    const result = await checkLoserSwapEligibility(deps(), 201);

    expect(result.ok).toBe(true);
    expect(result.roundNumber).toBe(2);
    expect(result.slots).toEqual([
      expect.objectContaining({
        matchId: 201,
        side: 'opponent1',
        participantName: 'T5',
        isBye: false,
      }),
      expect.objectContaining({
        matchId: 201,
        side: 'opponent2',
        participantName: 'T9',
        isBye: false,
      }),
    ]);
    // Three walkover siblings, two slots each: the team and its BYE spot.
    expect(result.candidates).toHaveLength(6);
    expect(result.candidates).toContainEqual(
      expect.objectContaining({
        matchId: 204,
        side: 'opponent1',
        participantName: 'T7',
        partnerIsBye: true,
      })
    );
    expect(result.candidates).toContainEqual(
      expect.objectContaining({
        matchId: 204,
        side: 'opponent2',
        isBye: true,
        participantName: null,
      })
    );
  });

  it('skips siblings that cannot swap (played) and BYE-vs-BYE siblings', async () => {
    wire({
      202: {
        status: 4,
        opponent1: { id: 8, position: 1, score: 2, result: 'win' },
        opponent2: { id: 12, score: 0, result: 'loss' },
      },
      203: { status: 0, opponent1: null, opponent2: null },
    });
    const result = await checkLoserSwapEligibility(deps(), 201);

    expect(result.ok).toBe(true);
    // Only 204's two slots remain.
    expect(result.candidates?.map((c) => c.matchId)).toEqual([204, 204]);
  });
});
