import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BracketsManager } from 'brackets-manager';

import { BracketStandingsService } from '../BracketStandingsService';
import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';

// Shared mock for the supabase client used by the service for the stage-matches
// pre-check and the playoff_team_records upsert.
const upsertMock = vi.fn().mockResolvedValue({ error: null });
const stageMatchesResult: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'match') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(stageMatchesResult),
          }),
        };
      }
      if (table === 'playoff_team_records') {
        return { upsert: upsertMock };
      }
      return {};
    }),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  warnLog: vi.fn(),
}));

function makeService(opts: {
  stages?: unknown;
  participants?: unknown;
  finalStandings?: () => Promise<unknown>;
}) {
  const storage = {
    select: vi.fn().mockImplementation(async (table: string) => {
      if (table === 'stage') return opts.stages ?? [{ id: 10, number: 1 }];
      if (table === 'participant') return opts.participants ?? [{ id: 101, team_id: 'team-a' }];
      return [];
    }),
  };
  const manager = {
    get: {
      finalStandings:
        opts.finalStandings ?? vi.fn().mockResolvedValue([{ id: 101, name: 'Team A', rank: 1 }]),
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BracketStandingsService(storage as any, manager as any);
}

describe('BracketStandingsService.calculateFinalStandings', () => {
  beforeEach(() => {
    upsertMock.mockClear();
    stageMatchesResult.data = [];
    stageMatchesResult.error = null;
  });

  it('returns incomplete-matches without throwing or writing when matches are unresolved', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
      {
        id: 2,
        number: 2,
        group_id: 2,
        round_id: 1,
        status: 2,
        opponent1_id: 1,
        opponent2_id: null,
      },
    ];
    const finalStandings = vi.fn();
    const service = makeService({ finalStandings: finalStandings as never });

    const result = await service.calculateFinalStandings('bracket-1');

    expect(result).toEqual({ written: false, reason: 'incomplete-matches' });
    expect(finalStandings).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('swallows brackets-manager "Participant not found" errors and returns calculation-error', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const finalStandings = vi.fn().mockRejectedValue(new Error('Participant not found.'));
    const service = makeService({ finalStandings });

    const result = await service.calculateFinalStandings('bracket-2');

    expect(result).toEqual({ written: false, reason: 'calculation-error' });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('writes records and returns written=true on the happy path', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-3');

    expect(result).toEqual({ written: true });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      [{ team_id: 'team-a', bracket_id: 'bracket-3', placement: 1 }],
      { onConflict: 'team_id,bracket_id' }
    );
  });

  it('picks the highest-numbered stage for standings', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const finalStandings = vi.fn().mockResolvedValue([{ id: 101, name: 'Team A', rank: 1 }]);
    const service = makeService({
      stages: [
        { id: 10, number: 1 },
        { id: 20, number: 2 },
      ],
      finalStandings,
    });

    await service.calculateFinalStandings('bracket-4');

    expect(finalStandings).toHaveBeenCalledWith(20);
  });
});
