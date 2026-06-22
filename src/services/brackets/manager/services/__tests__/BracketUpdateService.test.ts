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

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketUpdateService } from '../BracketUpdateService';

describe('BracketUpdateService', () => {
  let service: BracketUpdateService;
  let mockStorage: SupabaseSqlStorage;
  let mockManager: { update: { match: ReturnType<typeof vi.fn> } };
  let mockNormalizationService: {
    normalizeLosersR1: ReturnType<typeof vi.fn>;
    normalizeGrandFinalPopulation: ReturnType<typeof vi.fn>;
    propagateCompletedMatches: ReturnType<typeof vi.fn>;
    isWbFinalRound: ReturnType<typeof vi.fn>;
    isLbFinalRound: ReturnType<typeof vi.fn>;
    repairGrandFinalWithRetries: ReturnType<typeof vi.fn>;
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
      isWbFinalRound: vi.fn().mockResolvedValue(false),
      isLbFinalRound: vi.fn().mockResolvedValue(false),
      repairGrandFinalWithRetries: vi.fn().mockResolvedValue(undefined),
    };

    service = new BracketUpdateService(
      mockStorage,
      mockManager as unknown as import('brackets-manager').BracketsManager,
      mockNormalizationService as unknown as import('../BracketNormalizationService').BracketNormalizationService
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
      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation(
        (table: string, query?: unknown) => {
          if (table === 'match') {
            // Initial match fetch by ID (number) vs later filter by criteria (object)
            if (typeof query === 'number' || typeof query === 'string') {
              return Promise.resolve(byeMatch);
            }
            // Filter queries (e.g., { stage_id, group_id }) → return empty array
            return Promise.resolve([]);
          }
          if (table === 'stage') return Promise.resolve(stage);
          if (table === 'round') return Promise.resolve([round]);
          return Promise.resolve(null);
        }
      );

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

      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation(
        (table: string, _query?: unknown) => {
          if (table === 'match') return Promise.resolve(byeMatch);
          if (table === 'stage') return Promise.resolve(stage);
          if (table === 'round') return Promise.resolve([round, nextRound]);
          return Promise.resolve(null);
        }
      );

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

  describe('GF auto-repair trigger', () => {
    const stage = {
      id: 10,
      tournament_id: 'tourney-1',
      name: 'Stage',
      type: 'double_elimination',
      number: 1,
      settings: {},
    };

    const setupNormalMatch = (overrides: { status: number; round_id: number }) => {
      const match = {
        id: 42,
        stage_id: 10,
        group_id: 1,
        round_id: overrides.round_id,
        number: 1,
        status: overrides.status,
        opponent1: { id: 11, position: 1 },
        opponent2: { id: 12, position: 2 },
      };

      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation(
        (table: string, query?: unknown) => {
          if (table === 'match') {
            if (typeof query === 'number' || typeof query === 'string')
              return Promise.resolve(match);
            return Promise.resolve([]);
          }
          if (table === 'stage') return Promise.resolve(stage);
          return Promise.resolve(null);
        }
      );

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table !== 'match') return {};
        return {
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      });
    };

    it('runs repairGrandFinalWithRetries when WB Final completes', async () => {
      setupNormalMatch({ status: 4, round_id: 500 });
      mockManager.update.match.mockResolvedValue(undefined);
      mockNormalizationService.isWbFinalRound.mockResolvedValue(true);

      await service.updateMatch({
        matchId: 42,
        scores: {
          opponent1: { score: 21, result: 'win' },
          opponent2: { score: 19, result: 'loss' },
        },
      });

      expect(mockNormalizationService.isWbFinalRound).toHaveBeenCalledWith(500, 10);
      expect(mockNormalizationService.repairGrandFinalWithRetries).toHaveBeenCalledWith(10);
    });

    it('runs repairGrandFinalWithRetries when LB Final completes', async () => {
      setupNormalMatch({ status: 4, round_id: 700 });
      mockManager.update.match.mockResolvedValue(undefined);
      mockNormalizationService.isWbFinalRound.mockResolvedValue(false);
      mockNormalizationService.isLbFinalRound.mockResolvedValue(true);

      await service.updateMatch({
        matchId: 42,
        scores: {
          opponent1: { score: 12, result: 'loss' },
          opponent2: { score: 21, result: 'win' },
        },
      });

      expect(mockNormalizationService.isLbFinalRound).toHaveBeenCalledWith(700, 10);
      expect(mockNormalizationService.repairGrandFinalWithRetries).toHaveBeenCalledWith(10);
    });

    it('does not run GF repair for unrelated rounds', async () => {
      setupNormalMatch({ status: 4, round_id: 300 });
      mockManager.update.match.mockResolvedValue(undefined);
      mockNormalizationService.isWbFinalRound.mockResolvedValue(false);
      mockNormalizationService.isLbFinalRound.mockResolvedValue(false);

      await service.updateMatch({
        matchId: 42,
        scores: {
          opponent1: { score: 21, result: 'win' },
          opponent2: { score: 12, result: 'loss' },
        },
      });

      expect(mockNormalizationService.repairGrandFinalWithRetries).not.toHaveBeenCalled();
    });
  });
});
