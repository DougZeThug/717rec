import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const { mockFrom, mockSelect } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
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
  toViewerOpponent: vi.fn((id: number | null, score: number | null, result: unknown, position?: number) =>
    id
      ? { id, score: score ?? undefined, result: result ?? undefined, position }
      : null
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

const pgError = () => ({
  message: 'query failed',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

type QueryResult = { data: unknown; error: unknown | null };

const setupSupabaseForTransform = (
  overrides: Partial<Record<string, QueryResult>> = {}
) => {
  const responses = {
    stage: { data: [{ id: 11, name: 'Playoffs', type: 'single_elimination', tournament_id: 'b1', number: 1, settings: {} }], error: null },
    match: { data: [{ id: 100, stage_id: 11, group_id: 1, round_id: 1, number: 1, child_count: 0, opponent1_id: 1, opponent1_score: 2, opponent1_result: 'win', opponent2_id: 2, opponent2_score: 1, opponent2_result: 'loss', status: 4 }], error: null },
    match_game: { data: [{ id: 1, number: 1, match_id: 100, status: 4, opponent1_score: 21, opponent2_score: 15 }], error: null },
    participant: { data: [{ id: 1, name: 'Aces', tournament_id: 'b1', position: 1 }, { id: 2, name: 'Birds', tournament_id: 'b1', position: 2 }], error: null },
    group: { data: [{ id: 1, number: 1, stage_id: 11 }], error: null },
    round: { data: [{ id: 1, group_id: 1, number: 1 }], error: null },
    teams: { data: [{ name: 'Aces', logo_url: 'logo.png', image_url: null }], error: null },
    ...overrides,
  };

  mockFrom.mockImplementation((table: string) => ({
    select: (columns: string) => {
      mockSelect(table, columns);
      if (table === 'teams') {
        return { in: vi.fn().mockResolvedValue(responses.teams) };
      }
      if (table === 'round') {
        return Promise.resolve(responses.round);
      }
      return { eq: vi.fn().mockResolvedValue(responses[table as keyof typeof responses]) };
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
      'id, stage_id, group_id, round_id, number, child_count, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result, status'
    );
    expect(result.data.stages).toHaveLength(1);
    expect(result.data.matches).toHaveLength(1);
    expect(result.getPlayoffMatchId(100)).toBe('100');
  });

  it('throws DatabaseError when stage query fails', async () => {
    setupSupabaseForTransform({ stage: { data: null, error: pgError() } });
    await expect(BracketsViewerAdapter.transformFromSql('b1')).rejects.toThrow(DatabaseError);
  });

  it('handles null optional datasets as valid empty results', async () => {
    setupSupabaseForTransform({ match: { data: null, error: null }, participant: { data: null, error: null }, teams: { data: null, error: null } });

    const result = await BracketsViewerAdapter.transformFromSql('b1');

    expect(result.data.matches).toEqual([]);
    expect(result.data.participants).toEqual([]);
  });
});
