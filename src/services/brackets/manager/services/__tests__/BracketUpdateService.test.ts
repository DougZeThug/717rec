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
  /** Raw `match` rows the snapshot/rollback path reads via supabase.select. */
  let stageRows: Record<string, unknown>[];

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
    // Default: the stage holds only match 7, unchanged by the update. A test
    // that wants a rollback reassigns this to model a partially-written stage.
    stageRows = [{ id: 7, child_count: 0, status: 2 }];

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
        // Snapshot / rollback re-read of the stage's raw match rows.
        select: () => ({
          eq: () => Promise.resolve({ data: stageRows, error: null }),
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

    it('restores Archived status when the library update fails', async () => {
      wireStorage({
        match: { ...REAL_MATCH, status: 5 },
        stageMatches: [{ ...REAL_MATCH, status: 4 }],
      });
      // Snapshot sees Archived; after the unlock the row reads back as Completed.
      stageRows = [{ id: 7, child_count: 0, status: 5 }];
      manager.update.match.mockImplementation(() => {
        stageRows = [{ id: 7, child_count: 0, status: 4 }];
        return Promise.reject(new Error('storage write failed'));
      });

      // The unlock is already committed by this point. Without the rollback the
      // match is stranded at Completed (4), which re-enables admin actions that
      // are deliberately barred for Archived matches.
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Match update failed: storage write failed/
      );

      expect(directUpdates).toEqual([
        { table: 'match', payload: { status: 4 }, id: 7 },
        { table: 'match', payload: { status: 5 }, id: 7 },
      ]);
    });

    it('restores a score the library wrote before it failed mid-propagation', async () => {
      wireStorage({ match: REAL_MATCH, stageMatches: [{ ...REAL_MATCH, status: 4 }] });
      // The library writes the match itself before propagating, so a failure
      // during propagation leaves the new score saved on a NON-archived match.
      stageRows = [
        { id: 7, child_count: 0, status: 2, opponent1_score: null, opponent1_result: null },
      ];
      manager.update.match.mockImplementation(() => {
        stageRows = [
          { id: 7, child_count: 0, status: 4, opponent1_score: 2, opponent1_result: 'win' },
        ];
        return Promise.reject(new Error('propagation failed'));
      });

      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Match update failed: propagation failed/
      );

      // Every column the library touched goes back, not just status.
      expect(directUpdates).toEqual([
        {
          table: 'match',
          payload: { status: 2, opponent1_score: null, opponent1_result: null },
          id: 7,
        },
      ]);
    });

    it('rolls back downstream matches the propagation already rewrote', async () => {
      wireStorage({ match: REAL_MATCH, stageMatches: [{ ...REAL_MATCH, status: 4 }] });
      stageRows = [
        { id: 7, child_count: 0, status: 2 },
        { id: 8, child_count: 0, status: 1, opponent1_id: null },
        { id: 9, child_count: 0, status: 1, opponent1_id: null },
      ];
      manager.update.match.mockImplementation(() => {
        stageRows = [
          { id: 7, child_count: 0, status: 4 },
          { id: 8, child_count: 0, status: 2, opponent1_id: 10 },
          // Match 9 was never reached, so it must NOT be written.
          { id: 9, child_count: 0, status: 1, opponent1_id: null },
        ];
        return Promise.reject(new Error('propagation failed'));
      });

      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(BusinessLogicError);

      expect(directUpdates).toEqual([
        { table: 'match', payload: { status: 2 }, id: 7 },
        { table: 'match', payload: { status: 1, opponent1_id: null }, id: 8 },
      ]);
    });

    it('writes nothing back when the failure changed no rows', async () => {
      wireStorage({ match: REAL_MATCH });
      // The library refused the update outright — nothing was persisted.
      manager.update.match.mockRejectedValue(new Error('The match is locked.'));

      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(BusinessLogicError);

      expect(directUpdates).toEqual([]);
    });

    it('reports the original failure even when the restore itself fails', async () => {
      wireStorage({
        match: { ...REAL_MATCH, status: 5 },
        stageMatches: [{ ...REAL_MATCH, status: 4 }],
      });
      stageRows = [{ id: 7, child_count: 0, status: 5 }];

      // The unlock succeeds; the rollback write that follows it does not.
      let writes = 0;
      mockFrom.mockImplementation((table: string) => ({
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: unknown) => {
            writes += 1;
            directUpdates.push({ table, payload, id });
            return Promise.resolve(
              writes === 1 ? { error: null } : { error: { message: 'restore denied' } }
            );
          },
        }),
        select: () => ({ eq: () => Promise.resolve({ data: stageRows, error: null }) }),
      }));

      manager.update.match.mockImplementation(() => {
        stageRows = [{ id: 7, child_count: 0, status: 4 }];
        return Promise.reject(new Error('storage write failed'));
      });

      // A best-effort restore must never overwrite the real reason for the failure.
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Match update failed: storage write failed/
      );

      expect(directUpdates).toEqual([
        { table: 'match', payload: { status: 4 }, id: 7 },
        { table: 'match', payload: { status: 5 }, id: 7 },
      ]);
    });

    it('fails the update when the safety snapshot cannot be taken', async () => {
      wireStorage({ match: REAL_MATCH });
      mockFrom.mockImplementation(() => ({
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
        }),
      }));

      // Nothing has been written yet, so refusing is free — and safer than
      // proceeding with no way back.
      await expect(service.updateMatch({ matchId: 7, scores })).rejects.toThrow(
        /Failed to snapshot stage 1/
      );
      expect(manager.update.match).not.toHaveBeenCalled();
    });

    describe('archived winner flips', () => {
      const ARCHIVED_WITH_WINNER = {
        ...REAL_MATCH,
        status: 5,
        opponent1: { id: 10, score: 2, result: 'win' as const },
        opponent2: { id: 20, score: 0, result: 'loss' as const },
      };

      /** Round 2 match the archived winner (10) already advanced into and won. */
      const DOWNSTREAM_PLAYED = {
        id: 8,
        stage_id: 1,
        group_id: 1,
        round_id: 2,
        number: 1,
        status: 4,
        opponent1: { id: 10, score: 3, result: 'win' as const },
        opponent2: { id: 30, score: 1, result: 'loss' as const },
      };

      /**
       * collectDownstreamChain reads round-by-id and round-by-filter differently,
       * which the shared wireStorage router flattens, so wire storage directly.
       */
      const wireDownstream = (
        downstream: Record<string, unknown>[],
        source: Record<string, unknown> = ARCHIVED_WITH_WINNER
      ) => {
        storage.select.mockImplementation((table: string, filter: unknown) => {
          if (table === 'match' && typeof filter === 'number') {
            return Promise.resolve(source);
          }
          if (table === 'stage') return Promise.resolve(STAGE);
          if (table === 'group') {
            // WB / LB / GF. Round numbers restart in each, so the chain has to
            // order by group first.
            return Promise.resolve([
              { id: 1, number: 1 },
              { id: 2, number: 2 },
              { id: 3, number: 3 },
            ]);
          }
          if (table === 'round' && typeof filter === 'number') {
            return Promise.resolve({ id: 1, stage_id: 1, group_id: 1, number: 1 });
          }
          if (table === 'round') {
            return Promise.resolve([
              { id: 1, number: 1 },
              { id: 2, number: 2 },
              // Losers-bracket round 1 — a LOWER number than the WB round the
              // flip starts from, which is exactly why round numbers alone are
              // not enough to order the chain.
              { id: 3, number: 1 },
            ]);
          }
          if (table === 'match') return Promise.resolve([source, ...downstream]);
          return Promise.resolve(null);
        });
      };

      const flip = {
        opponent1: { score: 0, result: 'loss' as const },
        opponent2: { score: 2, result: 'win' as const },
      };

      it('refuses the flip and leaves the match archived when a later match was played', async () => {
        wireDownstream([DOWNSTREAM_PLAYED]);

        await expect(service.updateMatch({ matchId: 7, scores: flip })).rejects.toThrow(
          /Cannot change the winner of this match/
        );

        // Refused before the 5 → 4 unlock, so no write and no propagation.
        expect(directUpdates).toEqual([]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('refuses a tied payload on a match that already has a winner', async () => {
        // A non-decisive payload skipped the guard entirely and went to the
        // library, which would try to un-decide a match whose winner has already
        // advanced. Both UI callers send decisive results, so this is a backstop.
        wireDownstream([DOWNSTREAM_PLAYED]);

        await expect(
          service.updateMatch({
            matchId: 7,
            scores: {
              opponent1: { score: 1, result: 'loss' },
              opponent2: { score: 1, result: 'loss' },
            },
          })
        ).rejects.toThrow(/already has a winner/);

        expect(directUpdates).toEqual([]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('refuses the flip on a COMPLETED match too, not just an archived one', async () => {
        // A Completed match needs no unlock, so it used to reach the library with
        // no guard at all — the same propagation, the same corruption, silently.
        wireDownstream([DOWNSTREAM_PLAYED], { ...ARCHIVED_WITH_WINNER, status: 4 });

        await expect(service.updateMatch({ matchId: 7, scores: flip })).rejects.toThrow(
          /Cannot change the winner of this match/
        );

        expect(directUpdates).toEqual([]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('allows a score-only correction even when later matches were played', async () => {
        wireDownstream([DOWNSTREAM_PLAYED]);

        await service.updateMatch({
          matchId: 7,
          scores: {
            opponent1: { score: 5, result: 'win' },
            opponent2: { score: 1, result: 'loss' },
          },
        });

        // Written straight to the score/result columns. The match is NOT unlocked
        // to 4 and the library is never invoked: re-propagating a winner who is
        // already downstream only lets setNextOpponent wipe the scores recorded
        // there.
        expect(directUpdates).toEqual([
          {
            table: 'match',
            payload: {
              opponent1_score: 5,
              opponent1_result: 'win',
              opponent2_score: 1,
              opponent2_result: 'loss',
            },
            id: 7,
          },
        ]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('refuses the flip when only the LOSER has played on, in the losers bracket', async () => {
        // Double elimination sends the loser (20) into the losers bracket. That
        // match can be played while the winner's next match is not, so following
        // the winner alone would miss it and let the flip corrupt it.
        wireDownstream([
          {
            id: 9,
            stage_id: 1,
            group_id: 2, // losers bracket
            round_id: 2,
            number: 1,
            status: 4,
            opponent1: { id: 20, score: 2, result: 'win' as const },
            opponent2: { id: 40, score: 0, result: 'loss' as const },
          },
        ]);

        await expect(service.updateMatch({ matchId: 7, scores: flip })).rejects.toThrow(
          /Cannot change the winner of this match/
        );
        expect(directUpdates).toEqual([]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('refuses the flip when the loser played a LOSERS ROUND 1 match', async () => {
        // The realistic shape: a WB round-1 loser drops into LB round 1, whose
        // round NUMBER is 1 — not greater than the WB round the flip starts from.
        // Comparing round numbers across the whole stage dropped this match out of
        // the chain entirely, so the flip sailed past the guard.
        wireDownstream([
          {
            id: 9,
            stage_id: 1,
            group_id: 2, // losers bracket
            round_id: 3, // LB round 1
            number: 1,
            status: 4,
            opponent1: { id: 20, score: 2, result: 'win' as const },
            opponent2: { id: 40, score: 0, result: 'loss' as const },
          },
        ]);

        await expect(service.updateMatch({ matchId: 7, scores: flip })).rejects.toThrow(
          /Cannot change the winner of this match/
        );
        expect(directUpdates).toEqual([]);
        expect(manager.update.match).not.toHaveBeenCalled();
      });

      it('allows the flip when the downstream chain has no results yet', async () => {
        wireDownstream([
          { ...DOWNSTREAM_PLAYED, status: 2, opponent1: { id: 10 }, opponent2: null },
        ]);

        await service.updateMatch({ matchId: 7, scores: flip });

        expect(directUpdates).toEqual([{ table: 'match', payload: { status: 4 }, id: 7 }]);
        expect(manager.update.match).toHaveBeenCalled();
      });
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
          select: () => ({ eq: () => Promise.resolve({ data: stageRows, error: null }) }),
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
