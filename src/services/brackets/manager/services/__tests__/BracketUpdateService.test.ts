import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, ValidationError } from '@/types/errors';

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
      normalizeLosersR1: vi.fn().mockImplementation(() => Promise.resolve()),
      normalizeGrandFinalPopulation: vi.fn().mockImplementation(() => Promise.resolve()),
      propagateCompletedMatches: vi.fn().mockImplementation(() => Promise.resolve()),
      isWbFinalRound: vi.fn().mockResolvedValue(false),
      isLbFinalRound: vi.fn().mockResolvedValue(false),
      repairGrandFinalWithRetries: vi.fn().mockImplementation(() => Promise.resolve()),
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
      mockManager.update.match.mockImplementation(() => Promise.resolve());
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
      mockManager.update.match.mockImplementation(() => Promise.resolve());
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
      mockManager.update.match.mockImplementation(() => Promise.resolve());
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

  describe('score validation', () => {
    const setupNormalMatchSuccess = () => {
      const match = {
        id: 42,
        stage_id: 10,
        group_id: 1,
        round_id: 300,
        number: 1,
        status: 4,
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
          if (table === 'stage')
            return Promise.resolve({
              id: 10,
              tournament_id: 'tourney-1',
              name: 'Stage',
              type: 'double_elimination',
              number: 1,
              settings: {},
            });
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

      mockManager.update.match.mockImplementation(() => Promise.resolve());
      mockNormalizationService.isWbFinalRound.mockResolvedValue(false);
      mockNormalizationService.isLbFinalRound.mockResolvedValue(false);
    };

    it('throws ValidationError when opponent1 score is negative', async () => {
      setupNormalMatchSuccess();

      await expect(
        service.updateMatch({
          matchId: 42,
          scores: {
            opponent1: { score: -1, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.updateMatch({
          matchId: 42,
          scores: {
            opponent1: { score: -1, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        })
      ).rejects.toThrow(/Opponent 1 score must be a non-negative number/);
    });

    it('throws ValidationError when opponent2 score is negative', async () => {
      setupNormalMatchSuccess();

      await expect(
        service.updateMatch({
          matchId: 42,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: -5, result: 'loss' },
          },
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.updateMatch({
          matchId: 42,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: -5, result: 'loss' },
          },
        })
      ).rejects.toThrow(/Opponent 2 score must be a non-negative number/);
    });

    it('allows omitted scores to pass validation', async () => {
      setupNormalMatchSuccess();

      await expect(
        service.updateMatch({
          matchId: 42,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { result: 'loss' },
          },
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('single-elimination advancement contracts', () => {
    type MutableMatch = {
      id: number;
      stage_id: number;
      group_id: number;
      round_id: number;
      number: number;
      status: number;
      opponent1: {
        id: number | null;
        position?: number;
        score?: number | null;
        result?: string | null;
      } | null;
      opponent2: {
        id: number | null;
        position?: number;
        score?: number | null;
        result?: string | null;
      } | null;
    };

    const stage = {
      id: 10,
      tournament_id: 'single-elim-tourney',
      name: 'Single Elimination',
      type: 'single_elimination',
      number: 1,
      settings: {},
    };

    const installDirectSqlNoops = () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'brackets') {
          return {
            update: () => ({ eq: () => ({ neq: () => Promise.resolve({ error: null }) }) }),
          };
        }
        if (table !== 'match') return {};
        return {
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      });
    };

    const setupInMemorySingleElim = (bracketSize: 4 | 8) => {
      const firstRoundId = 100;
      const secondRoundId = 101;
      const finalRoundId = 102;
      const rows: MutableMatch[] =
        bracketSize === 4
          ? [
              {
                id: 1,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 1,
                status: 2,
                opponent1: { id: 1, position: 1 },
                opponent2: { id: 4, position: 4 },
              },
              {
                id: 2,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 2,
                status: 2,
                opponent1: { id: 2, position: 2 },
                opponent2: { id: 3, position: 3 },
              },
              {
                id: 3,
                stage_id: 10,
                group_id: 1,
                round_id: secondRoundId,
                number: 1,
                status: 1,
                opponent1: null,
                opponent2: null,
              },
            ]
          : [
              {
                id: 1,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 1,
                status: 2,
                opponent1: { id: 1, position: 1 },
                opponent2: { id: 8, position: 8 },
              },
              {
                id: 2,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 2,
                status: 2,
                opponent1: { id: 4, position: 4 },
                opponent2: { id: 5, position: 5 },
              },
              {
                id: 3,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 3,
                status: 2,
                opponent1: { id: 2, position: 2 },
                opponent2: { id: 7, position: 7 },
              },
              {
                id: 4,
                stage_id: 10,
                group_id: 1,
                round_id: firstRoundId,
                number: 4,
                status: 2,
                opponent1: { id: 3, position: 3 },
                opponent2: { id: 6, position: 6 },
              },
              {
                id: 5,
                stage_id: 10,
                group_id: 1,
                round_id: secondRoundId,
                number: 1,
                status: 1,
                opponent1: null,
                opponent2: null,
              },
              {
                id: 6,
                stage_id: 10,
                group_id: 1,
                round_id: secondRoundId,
                number: 2,
                status: 1,
                opponent1: null,
                opponent2: null,
              },
              {
                id: 7,
                stage_id: 10,
                group_id: 1,
                round_id: finalRoundId,
                number: 1,
                status: 1,
                opponent1: null,
                opponent2: null,
              },
            ];
      const roundOrder = [firstRoundId, secondRoundId, finalRoundId];

      (mockStorage.select as ReturnType<typeof vi.fn>).mockImplementation(
        (table: string, query?: unknown) => {
          if (table === 'stage') return Promise.resolve(stage);
          if (table === 'match') {
            if (typeof query === 'number')
              return Promise.resolve(rows.find((m) => m.id === query) ?? null);
            if (query && typeof query === 'object') {
              return Promise.resolve(
                rows.filter((m) =>
                  Object.entries(query as Record<string, unknown>).every(
                    ([k, v]) => (m as unknown as Record<string, unknown>)[k] === v
                  )
                )
              );
            }
          }
          return Promise.resolve([]);
        }
      );

      mockManager.update.match.mockImplementation(
        (payload: {
          id: number;
          opponent1?: { score?: number; result?: string };
          opponent2?: { score?: number; result?: string };
        }) => {
          const match = rows.find((m) => m.id === payload.id);
          if (!match?.opponent1?.id || !match.opponent2?.id)
            throw new Error('The match is locked.');
          match.opponent1 = {
            ...match.opponent1,
            score: payload.opponent1?.score,
            result: payload.opponent1?.result,
          };
          match.opponent2 = {
            ...match.opponent2,
            score: payload.opponent2?.score,
            result: payload.opponent2?.result,
          };
          match.status = 4;
          const winner =
            match.opponent1.result === 'win'
              ? match.opponent1
              : match.opponent2.result === 'win'
                ? match.opponent2
                : null;
          if (!winner) return;
          const nextRoundId = roundOrder[roundOrder.indexOf(match.round_id) + 1];
          const next = rows.find(
            (m) => m.round_id === nextRoundId && m.number === Math.ceil(match.number / 2)
          );
          if (!next) return;
          const slot = match.number % 2 === 1 ? 'opponent1' : 'opponent2';
          next[slot] = { id: winner.id, position: winner.position, score: null, result: null };
          if (next.opponent1?.id && next.opponent2?.id) next.status = 2;
        }
      );

      installDirectSqlNoops();
      return rows;
    };

    it('advances the correct winner into the final for a 4-team bracket', async () => {
      const rows = setupInMemorySingleElim(4);

      await service.updateMatch({
        matchId: 1,
        scores: {
          opponent1: { score: 21, result: 'win' },
          opponent2: { score: 12, result: 'loss' },
        },
      });

      expect(rows.find((m) => m.id === 3)?.opponent1?.id).toBe(1);
      expect(rows.find((m) => m.id === 3)?.opponent2).toBeNull();
    });

    it('advances quarterfinal winners into the correct semifinal slots for an 8-team bracket', async () => {
      const rows = setupInMemorySingleElim(8);

      await service.updateMatch({
        matchId: 1,
        scores: {
          opponent1: { score: 21, result: 'win' },
          opponent2: { score: 10, result: 'loss' },
        },
      });
      await service.updateMatch({
        matchId: 2,
        scores: {
          opponent1: { score: 18, result: 'loss' },
          opponent2: { score: 21, result: 'win' },
        },
      });

      const semifinal = rows.find((m) => m.id === 5);
      expect(semifinal?.opponent1?.id).toBe(1);
      expect(semifinal?.opponent2?.id).toBe(5);
      expect(semifinal?.status).toBe(2);
    });

    it('supports a lower seed winning and score correction on an already-scored match', async () => {
      const rows = setupInMemorySingleElim(4);

      await service.updateMatch({
        matchId: 1,
        scores: {
          opponent1: { score: 19, result: 'loss' },
          opponent2: { score: 21, result: 'win' },
        },
      });
      expect(rows.find((m) => m.id === 3)?.opponent1?.id).toBe(4);

      await service.updateMatch({
        matchId: 1,
        scores: {
          opponent1: { score: 21, result: 'win' },
          opponent2: { score: 19, result: 'loss' },
        },
      });

      expect(rows.find((m) => m.id === 1)?.opponent1?.result).toBe('win');
      expect(rows.find((m) => m.id === 3)?.opponent1?.id).toBe(1);
    });

    it.fails(
      'documents current gap: scoring a partially populated match is treated as BYE instead of controlled failure',
      async () => {
        const rows = setupInMemorySingleElim(4);
        rows[2].opponent1 = { id: 1, position: 1 };
        rows[2].opponent2 = null;

        await expect(
          service.updateMatch({
            matchId: 3,
            scores: {
              opponent1: { score: 21, result: 'win' },
              opponent2: { score: 0, result: 'loss' },
            },
          })
        ).rejects.toThrow(BusinessLogicError);
      }
    );
  });
});
