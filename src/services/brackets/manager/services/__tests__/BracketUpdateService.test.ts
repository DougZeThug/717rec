import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
}));

vi.mock('../../MatchUpdateQueue', () => ({
  matchUpdateQueue: {
    enqueue: (fn: () => Promise<void>) => fn(),
  },
}));

// ─── Import service under test (after mocks) ────────────────────────────────

import { BracketUpdateService } from '../BracketUpdateService';
import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';

describe('BracketUpdateService', () => {
  let service: BracketUpdateService;
  let mockStorage: SupabaseSqlStorage;
  let mockManager: { update: { match: ReturnType<typeof vi.fn> } };
  let mockNormalizationService: {
    normalizeLosersR1: ReturnType<typeof vi.fn>;
    normalizeGrandFinalPopulation: ReturnType<typeof vi.fn>;
    propagateCompletedMatches: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReset();

    mockStorage = {
      select: vi.fn(),
      update: vi.fn(),
      loadParticipantsForTournament: vi.fn(),
      clearParticipantCache: vi.fn(),
    } as unknown as SupabaseSqlStorage;

    mockManager = {
      update: {
        match: vi.fn(),
      },
    };

    mockNormalizationService = {
      normalizeLosersR1: vi.fn().mockResolvedValue(undefined),
      normalizeGrandFinalPopulation: vi.fn().mockResolvedValue(undefined),
      propagateCompletedMatches: vi.fn().mockResolvedValue(undefined),
    };

    service = new BracketUpdateService(
      mockStorage,
      mockManager as unknown as import('brackets-manager').BracketsManager,
      mockNormalizationService as unknown as import('./BracketNormalizationService').BracketNormalizationService
    );
  });

  describe('BYE match path', () => {
    const byeMatch = {
      id: 1,
      stage_id: 10,
      group_id: 1,
      round_id: 100,
      number: 1,
      status: 2,
      opponent1: { id: 42, position: 1 },
      opponent2: null,
    };

    const stage = {
      id: 10,
      tournament_id: 'tourney-1',
      name: 'WB',
      type: 'single_elimination',
      number: 1,
      settings: {},
    };

    const round = {
      id: 100,
      stage_id: 10,
      group_id: 1,
      number: 1,
    };

    const setupByeSuccess = () => {
      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'match') return Promise.resolve(byeMatch);
        if (table === 'stage') return Promise.resolve(stage);
        if (table === 'round') return Promise.resolve([round]);
        return Promise.resolve(null);
      });

      // No next round → propagation skipped
    };

    it('throws BusinessLogicError when BYE match completion update fails', async () => {
      setupByeSuccess();

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== 'match') return {};
        return {
          update: () => ({
            eq: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Database connection timeout', code: '08000' },
              }),
          }),
        };
      });

      await expect(
        service.updateMatch({
          matchId: 1,
          scores: {
            opponent1: { score: 21, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(BusinessLogicError);

      await expect(
        service.updateMatch({
          matchId: 1,
          scores: {
            opponent1: { score: 21, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(/Database connection timeout/);
    });

    it('throws BusinessLogicError when BYE winner propagation update fails', async () => {
      const nextRound = { id: 101, stage_id: 10, group_id: 1, number: 2 };

      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation((table: string, _query?: unknown) => {
        if (table === 'match') return Promise.resolve(byeMatch);
        if (table === 'stage') return Promise.resolve(stage);
        if (table === 'round') return Promise.resolve([round, nextRound]);
        return Promise.resolve(null);
      });

      let supabaseUpdateCallCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== 'match') return {};
        return {
          update: () => ({
            eq: () => {
              supabaseUpdateCallCount++;
              // 1st call: BYE match completion → success
              if (supabaseUpdateCallCount === 1) {
                return Promise.resolve({ data: null, error: null });
              }
              // Any other update call → fail (propagation update)
              return Promise.resolve({
                data: null,
                error: { message: 'propagation write failed', code: '23505' },
              });
            },
          }),
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 2,
                      status: 1,
                      opponent1_id: null,
                      opponent2_id: null,
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      });

      await expect(
        service.updateMatch({
          matchId: 1,
          scores: {
            opponent1: { score: 21, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(BusinessLogicError);

      await expect(
        service.updateMatch({
          matchId: 1,
          scores: {
            opponent1: { score: 21, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(/propagation write failed/);
    });

    it('completes successfully when BYE path database calls succeed', async () => {
      setupByeSuccess();

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== 'match') return {};
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        };
      });

      await expect(
        service.updateMatch({
          matchId: 1,
          scores: {
            opponent1: { score: 21, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).resolves.toBeUndefined();
    });
  });
});
