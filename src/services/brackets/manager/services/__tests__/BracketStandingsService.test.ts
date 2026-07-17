import type { BracketsManager } from 'brackets-manager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketStandingsService } from '../BracketStandingsService';

// Shared mock for the supabase client used by the service for the stage-matches
// pre-check and the playoff_team_records upsert.
const upsertMock = vi.fn().mockResolvedValue({ error: null });
const rpcMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: 1, error: null }));
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
    rpc: rpcMock,
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
    select: vi.fn().mockImplementation((table: string) => {
      if (table === 'stage') return Promise.resolve(opts.stages ?? [{ id: 10, number: 1 }]);
      if (table === 'participant') {
        return Promise.resolve(opts.participants ?? [{ id: 101, team_id: 'team-a' }]);
      }
      return Promise.resolve([]);
    }),
  };
  const manager = {
    get: {
      finalStandings:
        opts.finalStandings ?? vi.fn().mockResolvedValue([{ id: 101, name: 'Team A', rank: 1 }]),
    },
  };
  return new BracketStandingsService(
    storage as unknown as SupabaseSqlStorage,
    manager as unknown as BracketsManager
  );
}

describe('BracketStandingsService.calculateFinalStandings', () => {
  beforeEach(() => {
    upsertMock.mockClear();
    rpcMock.mockClear();
    rpcMock.mockResolvedValue({ data: 1, error: null });
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

  it('uses server-side finalize RPC instead of brackets-manager final standings', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const finalStandings = vi.fn().mockRejectedValue(new Error('Participant not found.'));
    const service = makeService({ finalStandings });

    const result = await service.calculateFinalStandings('bracket-2');

    expect(result).toEqual({ written: true });
    expect(finalStandings).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith('finalize_bracket_standings', {
      p_bracket_id: 'bracket-2',
    });
  });

  it('writes records and returns written=true on the happy path', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-3');

    expect(result).toEqual({ written: true });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('finalize_bracket_standings', {
      p_bracket_id: 'bracket-3',
    });
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

    const result = await service.calculateFinalStandings('bracket-4');

    expect(result).toEqual({ written: true });
    expect(finalStandings).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith('finalize_bracket_standings', {
      p_bracket_id: 'bracket-4',
    });
  });

  it('returns calculation-error when the finalize RPC fails', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied', code: '42501', details: '', hint: '' },
    });
    const service = makeService({});

    await expect(service.calculateFinalStandings('bracket-err')).resolves.toEqual({
      written: false,
      reason: 'calculation-error',
    });
  });

  it('wraps unexpected non-service errors in a typed DatabaseError', async () => {
    const storage = {
      select: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const manager = { get: { finalStandings: vi.fn() } };
    const service = new BracketStandingsService(
      storage as unknown as SupabaseSqlStorage,
      manager as unknown as BracketsManager
    );

    await expect(service.calculateFinalStandings('bracket-x')).rejects.toBeInstanceOf(
      DatabaseError
    );
    await expect(service.calculateFinalStandings('bracket-x')).rejects.toThrow(
      /Final standings calculation failed: boom/
    );
  });
});
