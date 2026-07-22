import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  failureLog: vi.fn(),
  successLog: vi.fn(),
  log: vi.fn(),
  warnLog: vi.fn(),
  debugLog: vi.fn(),
}));

import { BusinessLogicError, ValidationError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { BracketNormalizationService } from '../BracketNormalizationService';
import { BracketUpdateService } from '../BracketUpdateService';

/**
 * Unit contract of the pure-library update path: guards, the archived-match
 * unlock, loud library errors, completion propagation, and the double-grand-
 * final ghost-reset archival. End-to-end behavior (real library + storage)
 * lives in tests/bracketServiceCharacterization.test.ts.
 */
describe('BracketUpdateService', () => {
  const BRACKET_ID = 'bracket-1';

  let storage: {
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let manager: { update: { match: ReturnType<typeof vi.fn> } };
  let service: BracketUpdateService;
  let directUpdates: { table: string; payload: Record<string, unknown>; id: unknown }[];
  let bracketsUpdates: Record<string, unknown>[];

  const REAL_MATCH = {
    id: 7,
    stage_id: 1,
    group_id: 1,
    round_id: 1,
    number: 1,
    status: 2,
    opponent1: { id: 10 },
    opponent2: { id: 20 },
  };

  const STAGE = {
    id: 1,
    tournament_id: BRACKET_ID,
    name: 'Stage',
    type: 'double_elimination',
    number: 1,
    settings: { grandFinal: 'none' },
  };

  const scores = {
    opponent1: { score: 2, result: 'win' as const },
    opponent2: { score: 0, result: 'loss' as const },
  };

  /** storage.select router: match by id, stage by id, lists by filter. */
  const wireStorage = (opts: {
    match?: Record<string, unknown> | null;
    stage?: Record<string, unknown> | null;
    stageMatches?: (Record<string, unknown> | null)[];
    groups?: Record<string, unknown>[];
    rounds?: Record<string, unknown>[];
    matchAfterUpdate?: Record<string, unknown>;
    matchesByRound?: Record<number, Record<string, unknown>[]>;
  }) => {
    let matchReads = 0;
    storage.select.mockImplementation((table: string, filter: unknown) => {
      if (table === 'match' && typeof filter === 'number') {
        matchReads += 1;
        // First read = the pre-update state; later reads = post-update state.
        return Promise.resolve(
          matchReads === 1 ? (opts.match ?? null) : (opts.matchAfterUpdate ?? opts.match ?? null)
        );
      }
      if (table === 'stage') return Promise.resolve(opts.stage ?? STAGE);
      if (table === 'group') return Promise.resolve(opts.groups ?? [{ id: 1, number: 1 }]);
      if (table === 'round') return Promise.resolve(opts.rounds ?? [{ id: 1, number: 1 }]);
      if (table === 'match' && filter && typeof filter === 'object') {
        const roundId = (filter as { round_id?: number }).round_id;
        if (roundId !== undefined) {
          return Promise.resolve(opts.matchesByRound?.[roundId] ?? []);
        }
        return Promise.resolve(opts.stageMatches ?? [opts.matchAfterUpdate ?? opts.match]);
      }
      return Promise.resolve(null);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    directUpdates = [];
    bracketsUpdates = [];

    storage = { select: vi.fn(), update: vi.fn() };
    manager = { update: { match: vi.fn().mockResolvedValue(undefined) } };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'brackets') {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              neq: () => {
                bracketsUpdates.push(payload);
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }
      return {
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: unknown) => {
            directUpdates.push({ table, payload, id });
            return Promise.resolve({ error: null });
          },
        }),
      };
    });

    service = new BracketUpdateService(
      storage as unknown as SupabaseSqlStorage,
      manager as unknown as import('brackets-manager').BracketsManager,
      {} as unknown as BracketNormalizationService
    );
  });

  describe('input guards', () => {
    it('rejects negative scores before any read or write', async () => {
      await expect(
        service.updateMatch({
          matchId: 7,
          scores: { opponent1: { score: -1 }, opponent2: { score: 0 } },
        })
      ).rejects.toThrow();
      expect(storage.select).not.toHaveBeenCalled();
      expect(manager.update.match).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the match does not exist', async () => {
      wireStorage({ match: null });
      await expect(service.updateMatch({ matchId: 99, scores })).rejects.toThrow(ValidationError);
      expect(manager.update.match).not.toHaveBeenCalled();
    });

    it('refuses BYE matches (strict-null opponent) with an actionable message', async () => {
      wireStorage({ match: { ...REAL_MATCH, opponent2: null, status: 0 } });
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        'This match has a BYE and resolves automatically'
      );
      expect(manager.update.match).not.toHaveBeenCalled();
    });

    it('refuses TBD matches ({ id: null } opponent) with an actionable message', async () => {
      wireStorage({ match: { ...REAL_MATCH, opponent2: { id: null }, status: 1 } });
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        'This match is still waiting on earlier results'
      );
      expect(manager.update.match).not.toHaveBeenCalled();
    });
  });

  describe('the pure-library path', () => {
    it('delegates the score write to manager.update.match and re-checks completion', async () => {
      wireStorage({
        match: REAL_MATCH,
        stageMatches: [{ ...REAL_MATCH, status: 4 }],
      });

      await service.updateMatch({ matchId: 7, scores });

      expect(manager.update.match).toHaveBeenCalledWith({
        id: 7,
        opponent1: { score: 2, result: 'win' },
        opponent2: { score: 0, result: 'loss' },
      });
      // All matches settled → the bracket is marked completed.
      expect(bracketsUpdates).toEqual([{ state: 'completed' }]);
    });

    it('does not pre-unlock Ready matches', async () => {
      wireStorage({ match: REAL_MATCH, stageMatches: [{ ...REAL_MATCH, status: 4 }] });
      await service.updateMatch({ matchId: 7, scores });
      expect(directUpdates).toEqual([]);
    });

    it('unlocks Archived matches to Completed for admin corrections', async () => {
      wireStorage({
        match: { ...REAL_MATCH, status: 5 },
        stageMatches: [{ ...REAL_MATCH, status: 4 }],
      });

      await service.updateMatch({ matchId: 7, scores });

      expect(directUpdates).toEqual([{ table: 'match', payload: { status: 4 }, id: 7 }]);
      expect(manager.update.match).toHaveBeenCalled();
    });

    it('propagates library errors loudly as BusinessLogicError', async () => {
      wireStorage({ match: REAL_MATCH });
      manager.update.match.mockRejectedValue(new Error('The match is locked.'));

      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(BusinessLogicError);
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Match update failed: The match is locked\./
      );
    });

    it('propagates completion-check failures instead of swallowing them', async () => {
      wireStorage({ match: REAL_MATCH, stageMatches: [{ ...REAL_MATCH, status: 4 }] });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'brackets') {
          return {
            update: () => ({
              eq: () => ({
                neq: () => Promise.resolve({ error: { message: 'permission denied' } }),
              }),
            }),
          };
        }
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      });

      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Match update failed:.*permission denied/
      );
    });

    it('does not mark the bracket completed while a TBD match remains', async () => {
      wireStorage({
        match: REAL_MATCH,
        stageMatches: [
          { ...REAL_MATCH, status: 4 },
          {
            id: 8,
            status: 0,
            opponent1: { id: null },
            opponent2: { id: null },
          },
        ],
      });

      await service.updateMatch({ matchId: 7, scores });

      expect(bracketsUpdates).toEqual([]);
    });
  });

  describe('double grand final decisive semantics', () => {
    const GF_STAGE = { ...STAGE, settings: { grandFinal: 'double' } };
    const GF1 = {
      id: 14,
      stage_id: 1,
      group_id: 3,
      round_id: 8,
      number: 1,
      status: 2,
      opponent1: { id: 10 },
      opponent2: { id: 20 },
    };

    const wireGrandFinal = (afterUpdate: Record<string, unknown>, gf2Status = 2) => {
      wireStorage({
        match: GF1,
        stage: GF_STAGE,
        matchAfterUpdate: afterUpdate,
        groups: [
          { id: 1, number: 1 },
          { id: 2, number: 2 },
          { id: 3, number: 3 },
        ],
        rounds: [
          { id: 8, number: 1 },
          { id: 9, number: 2 },
        ],
        matchesByRound: {
          9: [{ id: 15, status: gf2Status, opponent1: { id: 10 }, opponent2: { id: 20 } }],
        },
        stageMatches: [afterUpdate, { id: 15, status: 5 }],
      });
    };

    it('archives the ghost reset match when the WB champion decisively wins GF1', async () => {
      wireGrandFinal({ ...GF1, status: 4, opponent1: { id: 10, result: 'win' } });

      await service.updateMatch({ matchId: 14, scores });

      expect(directUpdates).toContainEqual({ table: 'match', payload: { status: 5 }, id: 15 });
    });

    it('leaves the reset match alone when the LB champion wins GF1 (a real reset follows)', async () => {
      wireGrandFinal({
        ...GF1,
        status: 4,
        opponent1: { id: 10, result: 'loss' },
        opponent2: { id: 20, result: 'win' },
      });

      await service.updateMatch({
        matchId: 14,
        scores: {
          opponent1: { score: 0, result: 'loss' },
          opponent2: { score: 2, result: 'win' },
        },
      });

      expect(directUpdates).not.toContainEqual({ table: 'match', payload: { status: 5 }, id: 15 });
    });
  });
});
