import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const { mockFrom, mockSelect, mockFilter } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockFilter: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  debugLog: vi.fn(),
  errorLog: vi.fn(),
}));

vi.mock('../bracketViewerUtils', () => ({
  mapStatusToString: vi.fn(() => 'completed'),
}));

vi.mock('../SourceNodeCalculator', () => ({
  calculateSourceNodeIds: vi.fn((matches) => matches),
  toViewerOpponent: vi.fn(
    (id: number | null, score: number | null, result: unknown, position?: number) =>
      id ? { id, score: score ?? undefined, result: result ?? undefined, position } : null
  ),
}));

vi.mock('../ParticipantTransformer', () => ({
  transformParticipants: vi.fn(),
  transformStoredParticipants: vi.fn((participants) => participants),
}));

vi.mock('../MatchTransformer', () => ({
  transformBracket: vi.fn(),
  transformGames: vi.fn(),
  transformMatches: vi.fn(),
}));

import { BracketsViewerAdapter } from '../BracketsViewerAdapter';
import { transformBracket, transformGames, transformMatches } from '../MatchTransformer';
import { transformParticipants, transformStoredParticipants } from '../ParticipantTransformer';
import { calculateSourceNodeIds } from '../SourceNodeCalculator';

const pgError = () => ({
  message: 'query failed',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

type QueryResult = { data: unknown; error: unknown | null };

const setupSupabaseForTransform = (overrides: Partial<Record<string, QueryResult>> = {}) => {
  const responses = {
    stage: {
      data: [
        {
          id: 11,
          name: 'Playoffs',
          type: 'single_elimination',
          tournament_id: 'b1',
          number: 1,
          settings: {},
        },
      ],
      error: null,
    },
    match: {
      data: [
        {
          id: 100,
          stage_id: 11,
          group_id: 1,
          round_id: 1,
          number: 1,
          child_count: 0,
          opponent1_id: 1,
          opponent1_score: 2,
          opponent1_result: 'win',
          opponent2_id: 2,
          opponent2_score: 1,
          opponent2_result: 'loss',
          status: 4,
        },
      ],
      error: null,
    },
    match_game: {
      data: [
        { id: 1, number: 1, match_id: 100, status: 4, opponent1_score: 21, opponent2_score: 15 },
      ],
      error: null,
    },
    participant: {
      data: [
        { id: 1, name: 'Aces', tournament_id: 'b1', position: 1 },
        { id: 2, name: 'Birds', tournament_id: 'b1', position: 2 },
      ],
      error: null,
    },
    group: { data: [{ id: 1, number: 1, stage_id: 11 }], error: null },
    round: { data: [{ id: 1, group_id: 1, number: 1 }], error: null },
    teams: { data: [{ name: 'Aces', logo_url: 'logo.png', image_url: null }], error: null },
    ...overrides,
  };

  mockFrom.mockImplementation((table: string) => ({
    select: (columns: string) => {
      mockSelect(table, columns);
      const result = responses[table as keyof typeof responses];
      const record = (column: string, value: unknown) => {
        mockFilter(table, column, value);
        return Promise.resolve(result);
      };
      // teams and match_game are scoped with .in(); everything else with .eq().
      if (table === 'teams' || table === 'match_game') return { in: record };
      return { eq: record };
    },
  }));
};

describe('BracketsViewerAdapter.transformFromSql', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns viewer data shape and uses explicit selected columns', async () => {
    setupSupabaseForTransform();

    const result = await BracketsViewerAdapter.transformFromSql('b1');

    expect(mockFrom).toHaveBeenCalledWith('stage');
    expect(mockSelect).toHaveBeenCalledWith(
      'stage',
      'id, name, type, tournament_id, number, settings'
    );
    expect(mockSelect).toHaveBeenCalledWith(
      'match',
      'id, stage_id, group_id, round_id, number, child_count, opponent1_id, opponent1_score, opponent1_result, opponent1_position, opponent2_id, opponent2_score, opponent2_result, opponent2_position, status'
    );
    expect(result.data.stages).toHaveLength(1);
    expect(result.data.matches).toHaveLength(1);
    expect(result.getPlayoffMatchId(100)).toBe('100');
  });

  it('throws DatabaseError when stage query fails', async () => {
    setupSupabaseForTransform({ stage: { data: null, error: pgError() } });
    await expect(BracketsViewerAdapter.transformFromSql('b1')).rejects.toThrow(DatabaseError);
  });

  it('scopes every fetch to this bracket so none can be silently truncated', async () => {
    // An unscoped read returns the whole table and is cut off at PostgREST's
    // default row cap once that table outgrows it — dropping the newest rows,
    // which are the ones the bracket being viewed actually needs.
    setupSupabaseForTransform();

    await BracketsViewerAdapter.transformFromSql('b1');

    expect(mockFilter).toHaveBeenCalledWith('match', 'stage_id', 11);
    expect(mockFilter).toHaveBeenCalledWith('group', 'stage_id', 11);
    expect(mockFilter).toHaveBeenCalledWith('round', 'stage_id', 11);
    expect(mockFilter).toHaveBeenCalledWith('participant', 'tournament_id', 'b1');
    expect(mockFilter).toHaveBeenCalledWith('match_game', 'match_id', [100]);
  });

  it('orders the final group by round so the grand final precedes the reset match', async () => {
    // Regression: Postgres returns unordered rows in physical storage order,
    // which shifts when a row is updated. Once grand final round 1 receives its
    // finalists it can come back AFTER the never-touched round-2 reset match —
    // and brackets-viewer reads the FIRST final-group entry to decide how many
    // grand final columns to draw, so it then renders only the empty reset match.
    setupSupabaseForTransform({
      match: {
        data: [
          // Reset match (group 3, round 2) listed first, both slots still empty.
          {
            id: 2954,
            stage_id: 11,
            group_id: 3,
            round_id: 1296,
            number: 1,
            child_count: 0,
            opponent1_id: null,
            opponent1_score: null,
            opponent1_result: null,
            opponent2_id: null,
            opponent2_score: null,
            opponent2_result: null,
            status: 0,
          },
          // The real grand final (group 3, round 1) with both finalists.
          {
            id: 2953,
            stage_id: 11,
            group_id: 3,
            round_id: 1295,
            number: 1,
            child_count: 0,
            opponent1_id: 1,
            opponent1_score: null,
            opponent1_result: null,
            opponent2_id: 2,
            opponent2_score: null,
            opponent2_result: null,
            status: 2,
          },
        ],
        error: null,
      },
    });

    const result = await BracketsViewerAdapter.transformFromSql('b1');

    expect(result.data.matches.map((match) => match.id)).toEqual([2953, 2954]);
    expect(result.data.matches[0].opponent1).toMatchObject({ id: 1 });
    expect(result.data.matches[0].opponent2).toMatchObject({ id: 2 });
  });

  it('skips the match-game query entirely when the stage has no matches', async () => {
    // A bracket mid-creation can have participants but no matches yet. That is a
    // supported empty dataset — it must not turn into `.in('match_id', [])`.
    setupSupabaseForTransform({ match: { data: [], error: null } });

    const result = await BracketsViewerAdapter.transformFromSql('b1');

    expect(mockFrom).not.toHaveBeenCalledWith('match_game');
    expect(mockFilter).not.toHaveBeenCalledWith('match_game', 'match_id', []);
    expect(result.data.matches).toEqual([]);
    expect(result.data.matchGames).toEqual([]);
    expect(result.data.participants).toHaveLength(2);
  });

  it('handles null optional datasets as valid empty results', async () => {
    setupSupabaseForTransform({
      match: { data: null, error: null },
      participant: { data: null, error: null },
      teams: { data: null, error: null },
    });

    const result = await BracketsViewerAdapter.transformFromSql('b1');

    expect(result.data.matches).toEqual([]);
    expect(result.data.participants).toEqual([]);
  });
});

describe('BracketsViewerAdapter.transformFromJsonb', () => {
  it('passes brackets-manager position markers to the source-node calculator', () => {
    const bracketData = {
      stage: [{ id: 1 }],
      group: [{ id: 1, stage_id: 1, number: 1 }],
      round: [{ id: 1, stage_id: 1, group_id: 1, number: 1 }],
      match: [
        { id: 10, opponent1: { id: 1, position: 3 }, opponent2: { id: 2, position: 4 } },
        { id: 11, opponent1: { id: 3 }, opponent2: { id: 4 } },
      ],
      match_game: [{ id: 1 }],
      participant: [{ id: 1, name: 'Aces' }],
    };

    const result = BracketsViewerAdapter.transformFromJsonb(bracketData as never, 'b1');

    const [matchesArg, groupsArg, roundsArg, slotPositions] =
      vi.mocked(calculateSourceNodeIds).mock.calls[0];
    expect(matchesArg).toHaveLength(2);
    expect(groupsArg).toEqual(bracketData.group);
    expect(roundsArg).toEqual(bracketData.round);
    // Only the match with a marker is recorded; ids are keyed as strings.
    expect(slotPositions?.get('10')).toEqual({ opponent1: 3, opponent2: 4 });
    expect(slotPositions?.has('11')).toBe(false);
    expect(result.data.stages).toEqual(bracketData.stage);
    expect(result.data.groups).toEqual(bracketData.group);
    expect(result.data.rounds).toEqual(bracketData.round);
    expect(result.data.matchGames).toEqual(bracketData.match_game);
    expect(result.data.participants).toEqual(bracketData.participant);
    expect(result.getPlayoffMatchId(10)).toBeUndefined();
  });

  it('returns empty datasets when the bracket data is empty', () => {
    const result = BracketsViewerAdapter.transformFromJsonb({} as never, 'b1');

    expect(result.data).toEqual({
      stages: [],
      groups: [],
      rounds: [],
      matches: [],
      matchGames: [],
      participants: [],
    });
  });
});

describe('BracketsViewerAdapter.transform', () => {
  const roundMatches = [
    { id: 1, round_id: 1, group_id: 1 },
    { id: 2, round_id: 1, group_id: 1 },
    { id: 3, round_id: 2, group_id: 2 },
  ];

  const setupTransformers = () => {
    vi.mocked(transformBracket).mockReturnValue({ id: 1, name: 'Playoffs' } as never);
    vi.mocked(transformGames).mockReturnValue([{ id: 5 }] as never);
    vi.mocked(transformParticipants).mockReturnValue([{ id: 7, name: 'Aces' }] as never);
    vi.mocked(transformMatches).mockImplementation(((
      _matches: unknown,
      _matchIdMap: Map<string, number>,
      reverseMatchIdMap: Map<number, string>
    ) => {
      reverseMatchIdMap.set(1, 'match-uuid-1');
      return roundMatches;
    }) as never);
  };

  const bracket = (format: string) =>
    ({ id: 'b1', format, state: 'in_progress', matches: [{ id: 'm1' }] }) as never;

  it('builds one winners group and one round per round id for single elimination', () => {
    setupTransformers();

    const result = BracketsViewerAdapter.transform(bracket('Single Elimination'), [
      { id: 't1', name: 'Aces' },
    ]);

    const [, groupsArg, roundsArg] = vi.mocked(calculateSourceNodeIds).mock.calls[0];
    expect(groupsArg).toEqual([{ id: 1, stage_id: 1, number: 1 }]);
    expect(roundsArg).toEqual([
      { id: 1, stage_id: 1, group_id: 1, number: 1 },
      { id: 2, stage_id: 1, group_id: 2, number: 2 },
    ]);
    expect(result.data.stages).toEqual([{ id: 1, name: 'Playoffs' }]);
    expect(result.data.groups).toEqual(groupsArg);
    expect(result.data.rounds).toEqual(roundsArg);
    expect(result.data.matches).toEqual(roundMatches);
    expect(result.data.matchGames).toEqual([{ id: 5 }]);
    expect(result.data.participants).toEqual([{ id: 7, name: 'Aces' }]);
    expect(transformParticipants).toHaveBeenCalled();
    expect(transformStoredParticipants).not.toHaveBeenCalled();
  });

  it('adds a losers group for double elimination', () => {
    setupTransformers();

    BracketsViewerAdapter.transform(bracket('Double Elimination'), []);

    const [, groupsArg] = vi.mocked(calculateSourceNodeIds).mock.calls[0];
    expect(groupsArg).toEqual([
      { id: 1, stage_id: 1, number: 1 },
      { id: 2, stage_id: 1, number: 2 },
    ]);
  });

  it('uses the stored participants when there are any', () => {
    setupTransformers();
    const stored = [{ position: 1, team_id: 't1', name: 'Aces' }];

    BracketsViewerAdapter.transform(bracket('Single Elimination'), [], stored);

    expect(transformStoredParticipants).toHaveBeenCalledWith(stored, expect.any(Map));
    expect(transformParticipants).not.toHaveBeenCalled();
  });

  it('falls back to the teams when the stored participants are empty', () => {
    setupTransformers();

    BracketsViewerAdapter.transform(bracket('Single Elimination'), [], []);

    expect(transformParticipants).toHaveBeenCalled();
    expect(transformStoredParticipants).not.toHaveBeenCalled();
  });

  it('maps a viewer match id back to the playoff match id', () => {
    setupTransformers();

    const result = BracketsViewerAdapter.transform(bracket('Single Elimination'), []);

    expect(result.getPlayoffMatchId(1)).toBe('match-uuid-1');
    expect(result.getPlayoffMatchId(99)).toBeUndefined();
  });

  it('handles a bracket with no matches', () => {
    vi.mocked(transformBracket).mockReturnValue({ id: 1 } as never);
    vi.mocked(transformGames).mockReturnValue([] as never);
    vi.mocked(transformParticipants).mockReturnValue([] as never);
    vi.mocked(transformMatches).mockReturnValue([] as never);

    const result = BracketsViewerAdapter.transform(
      { id: 'b1', format: 'Single Elimination', state: 'pending' } as never,
      []
    );

    expect(transformMatches).toHaveBeenCalledWith(
      [],
      expect.any(Map),
      expect.any(Map),
      expect.any(Map)
    );
    expect(result.data.rounds).toEqual([]);
    expect(result.data.matches).toEqual([]);
  });
});
