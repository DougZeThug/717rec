import type { BracketsManager } from 'brackets-manager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketStandingsService } from '../BracketStandingsService';

// Shared mock for the supabase client. Since PR-06 the service:
//   1. Pre-checks the final stage's matches via from('match') (matchEqMock).
//   2. Finalizes standings via the admin-only finalize_bracket_standings RPC
//      (server-side). It NEVER upserts playoff_team_records from the browser,
//      so upsertMock must stay untouched on every path.
// vi.hoisted keeps these initialised before the hoisted vi.mock factory runs.
const { upsertMock, rpcMock, matchEqMock, stageMatchesResult } = vi.hoisted(() => ({
  upsertMock: vi.fn().mockResolvedValue({ error: null }),
  rpcMock: vi.fn(),
  matchEqMock: vi.fn(),
  stageMatchesResult: { data: [] as unknown, error: null as unknown },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'match') {
        return {
          select: vi.fn().mockReturnValue({
            eq: matchEqMock,
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
    matchEqMock.mockClear();
    stageMatchesResult.data = [];
    stageMatchesResult.error = null;
    matchEqMock.mockResolvedValue(stageMatchesResult);
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: 1, error: null });
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
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-1');

    expect(result).toEqual({ written: false, reason: 'incomplete-matches' });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('returns calculation-error when the finalize RPC reports an error', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'P0001' } });
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-2');

    expect(result).toEqual({ written: false, reason: 'calculation-error' });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('finalizes via the server RPC and returns written=true on the happy path', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    rpcMock.mockResolvedValue({ data: 1, error: null });
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-3');

    expect(result).toEqual({ written: true });
    expect(rpcMock).toHaveBeenCalledWith('finalize_bracket_standings', {
      p_bracket_id: 'bracket-3',
    });
    // Standings are written server-side; the browser must never upsert directly.
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('uses the highest-numbered stage for the completion pre-check', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    const service = makeService({
      stages: [
        { id: 10, number: 1 },
        { id: 20, number: 2 },
      ],
    });

    await service.calculateFinalStandings('bracket-4');

    expect(matchEqMock).toHaveBeenCalledWith('stage_id', 20);
  });

  it('returns no-records when the finalize RPC writes zero rows', async () => {
    stageMatchesResult.data = [
      { id: 1, number: 1, group_id: 1, round_id: 1, status: 5, opponent1_id: 1, opponent2_id: 2 },
    ];
    rpcMock.mockResolvedValue({ data: 0, error: null });
    const service = makeService({});

    const result = await service.calculateFinalStandings('bracket-none');

    expect(result).toEqual({ written: false, reason: 'no-records' });
    expect(upsertMock).not.toHaveBeenCalled();
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
