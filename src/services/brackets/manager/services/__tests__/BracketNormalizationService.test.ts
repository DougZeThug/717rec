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
  successLog: vi.fn(),
}));

import { DatabaseError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketNormalizationService } from '../BracketNormalizationService';

type StorageDouble = {
  clearParticipantCache: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const createStorageDouble = (): StorageDouble => ({
  clearParticipantCache: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
});

const mockSupabaseDirectUpdate = (result: { error: unknown }) => {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn(() => ({ eq }));

  mockFrom.mockReturnValue({ update });

  return { update, eq };
};

// These passes run ONLY via the explicit admin Repair Bracket action; they
// run once and throw loudly instead of retrying/swallowing.
describe('BracketNormalizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeGrandFinalPopulation', () => {
    it('is a no-op when GF group is missing', async () => {
      const storage = createStorageDouble();
      storage.select.mockResolvedValueOnce([{ id: 1, number: 1 }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeGrandFinalPopulation(101)).resolves.toBeUndefined();
      expect(storage.update).not.toHaveBeenCalled();
    });

    it('is a no-op when GF round is missing', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 31, number: 2 }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeGrandFinalPopulation(101)).resolves.toBeUndefined();
      expect(storage.update).not.toHaveBeenCalled();
    });

    it('is a no-op when GF match is missing', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeGrandFinalPopulation(101)).resolves.toBeUndefined();
      expect(storage.update).not.toHaveBeenCalled();
    });

    it('does not update when GF opponent2 is already set', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 1, opponent1: { id: 5 }, opponent2: { id: 8 } }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('never backfills strict-null (BYE) slots — only legacy TBD slots', async () => {
      // Strict null means BYE in brackets-manager's model; a repair must not
      // stuff a participant into it. (Healthy grand finals only ever have
      // TBD slots, but a guard beats an assumption.)
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('updates GF opponent2 when LB final is complete', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([
          { id: 70, status: 2, opponent1: { id: 5 }, opponent2: { id: null } },
        ])
        .mockResolvedValueOnce([{ id: 10, number: 2 }])
        .mockResolvedValueOnce([
          { id: 110, number: 1 },
          { id: 120, number: 4 },
        ])
        .mockResolvedValueOnce([
          {
            id: 200,
            status: 4,
            opponent1: { id: 12, result: 'loss' },
            opponent2: { id: 17, result: 'win' },
          },
        ]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent2: { id: 17, position: undefined },
          status: 2,
        }
      );
    });

    it('propagates storage failures loudly', async () => {
      const storage = createStorageDouble();
      storage.select.mockRejectedValueOnce(new Error('unexpected storage failure'));

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeGrandFinalPopulation(101)).rejects.toThrow(
        'unexpected storage failure'
      );
    });

    it('populates GF opponent1 from completed WB Final when missing', async () => {
      const storage = createStorageDouble();
      storage.select
        // gfGroup (group.number===3)
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        // gfRounds for group 30
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        // gfMatches — both slots legacy TBD, status locked
        .mockResolvedValueOnce([
          { id: 70, status: 0, opponent1: { id: null }, opponent2: { id: null } },
        ])
        // findWbGroup (group.number===1)
        .mockResolvedValueOnce([{ id: 5, number: 1 }])
        // wbRounds
        .mockResolvedValueOnce([
          { id: 51, number: 1 },
          { id: 52, number: 2 },
        ])
        // wbFinalMatches
        .mockResolvedValueOnce([
          {
            id: 99,
            number: 1,
            status: 4,
            opponent1: { id: 7, result: 'win' },
            opponent2: { id: 8, result: 'loss' },
          },
        ])
        // findLbGroup (group.number===2)
        .mockResolvedValueOnce([{ id: 20, number: 2 }])
        // lbRounds
        .mockResolvedValueOnce([
          { id: 21, number: 1 },
          { id: 22, number: 2 },
        ])
        // lbFinalMatches — not completed yet
        .mockResolvedValueOnce([
          { id: 200, number: 1, status: 1, opponent1: { id: null }, opponent2: { id: null } },
        ]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent1: { id: 7, position: undefined },
          status: 1,
        }
      );
    });

    it('populates both GF slots and flips status to Ready when both finals are complete', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([
          { id: 70, status: 0, opponent1: { id: null }, opponent2: { id: null } },
        ])
        .mockResolvedValueOnce([{ id: 5, number: 1 }])
        .mockResolvedValueOnce([{ id: 51, number: 2 }])
        .mockResolvedValueOnce([
          {
            id: 99,
            number: 1,
            status: 4,
            opponent1: { id: 7, result: 'win' },
            opponent2: { id: 8, result: 'loss' },
          },
        ])
        .mockResolvedValueOnce([{ id: 20, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 4 }])
        .mockResolvedValueOnce([
          {
            id: 200,
            number: 1,
            status: 4,
            opponent1: { id: 11, result: 'win' },
            opponent2: { id: 12, result: 'loss' },
          },
        ]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeGrandFinalPopulation(101);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        {
          opponent1: { id: 7, position: undefined },
          opponent2: { id: 11, position: undefined },
          status: 2,
        }
      );
    });
  });

  describe('normalizeLosersR1', () => {
    it('returns early when LB group is absent', async () => {
      const storage = createStorageDouble();
      storage.select.mockResolvedValueOnce([{ id: 1, number: 1 }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeLosersR1(200)).resolves.toBeUndefined();

      expect(storage.update).not.toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns early when LB R1 is absent', async () => {
      const storage = createStorageDouble();
      storage.select.mockResolvedValueOnce([{ id: 11, number: 2 }]).mockResolvedValueOnce([]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeLosersR1(200)).resolves.toBeUndefined();

      expect(storage.update).not.toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('triggers direct SQL clear on duplicate opponents', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: { id: 8 } }]);

      const { update, eq } = mockSupabaseDirectUpdate({ error: null });

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeLosersR1(100);

      expect(mockFrom).toHaveBeenCalledWith('match');
      expect(eq).toHaveBeenCalledWith('id', 31);
      expect(update).toHaveBeenCalledWith({
        opponent2_id: null,
        opponent2_score: null,
        opponent2_result: null,
        opponent1_result: 'win',
        opponent1_score: 0,
        status: 4,
      });
    });

    it('throws a DatabaseError when the duplicate-clear write fails', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: { id: 8 } }]);

      mockSupabaseDirectUpdate({ error: { message: 'sql failed' } });

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await expect(service.normalizeLosersR1(100)).rejects.toThrow(DatabaseError);
    });

    it('shifts a lone opponent2 into opponent1 when opponent1 is a legacy TBD slot', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([
          { id: 32, status: 3, opponent1: { id: null }, opponent2: { id: 44 } },
        ]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeLosersR1(100);

      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 32 },
        {
          opponent1: { id: 44, score: null, result: null },
          opponent2: { id: null, score: null, result: null },
          status: 3,
        }
      );
    });

    it('leaves the library-native "BYE vs X" layout untouched (strict-null opponent1)', async () => {
      // opponent1 === null is a real BYE — the canonical layout the library
      // produces for losers-round bye matches. Shifting it would corrupt a
      // healthy bracket.
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 32, status: 4, opponent1: null, opponent2: { id: 44 } }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeLosersR1(100);

      expect(storage.update).not.toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  it('repairs propagation for completed match winners', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([
          { id: 21, number: 1 },
          { id: 22, number: 2 },
        ])
        .mockResolvedValueOnce([
          {
            id: 31,
            number: 1,
            status: 4,
            opponent1: { id: 18, result: 'win' },
            opponent2: { id: 5 },
          },
        ])
        .mockResolvedValueOnce([{ id: 41, number: 1 }])
        // Terminal default: the grand-final group lookup finds no GF group.
        .mockResolvedValue([]),
      update: vi.fn(),
    };

    const selectEqRoundId = vi.fn().mockReturnThis();
    const selectEqNumber = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 41,
            opponent1_id: null,
            opponent2_id: 33,
            opponent1_result: null,
            opponent2_result: null,
            status: 1,
          },
        ],
      })
    );
    const updateEqId = vi.fn(() => Promise.resolve({ error: null }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'match') return {};
      return {
        select: vi.fn(() => ({ eq: selectEqRoundId })),
        update: vi.fn(() => ({ eq: updateEqId })),
      };
    });
    selectEqRoundId.mockImplementation(() => ({ eq: selectEqNumber }));

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.propagateCompletedMatches(400);

    expect(selectEqRoundId).toHaveBeenCalledWith('round_id', 22);
    expect(selectEqNumber).toHaveBeenCalledWith('number', 1);
    expect(updateEqId).toHaveBeenCalledWith('id', 41);
  });

  it('never advances a winner into a stored BYE slot', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([
          { id: 21, number: 1 },
          { id: 22, number: 2 },
        ])
        .mockResolvedValueOnce([
          {
            id: 31,
            number: 1,
            status: 4,
            opponent1: { id: 18, result: 'win' },
            opponent2: { id: 5 },
          },
        ])
        .mockResolvedValueOnce([{ id: 41, number: 1 }])
        // Terminal default: the grand-final group lookup finds no GF group.
        .mockResolvedValue([]),
      update: vi.fn(),
    };

    // Next match: opponent1 is a stored BYE (sentinel), opponent2 empty TBD.
    const selectEqRoundId = vi.fn().mockReturnThis();
    const selectEqNumber = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 41,
            opponent1_id: null,
            opponent2_id: null,
            opponent1_result: 'bye',
            opponent2_result: null,
            status: 1,
          },
        ],
      })
    );
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'match') return {};
      return {
        select: vi.fn(() => ({ eq: selectEqRoundId })),
        update: updateSpy,
      };
    });
    selectEqRoundId.mockImplementation(() => ({ eq: selectEqNumber }));

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.propagateCompletedMatches(400);

    // The winner goes to the TBD slot (opponent2), never the BYE slot.
    expect(updateSpy).toHaveBeenCalledWith({ opponent2_id: 18 });
  });

  it('repairs missing propagation without rewriting the completed source match result', async () => {
    const completedSource = {
      id: 31,
      number: 1,
      status: 4,
      opponent1: { id: 18, score: 21, result: 'win' },
      opponent2: { id: 5, score: 17, result: 'loss' },
    };
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([
          { id: 21, number: 1 },
          { id: 22, number: 2 },
        ])
        .mockResolvedValueOnce([completedSource])
        .mockResolvedValueOnce([{ id: 41, number: 1 }])
        // Terminal default: the grand-final group lookup finds no GF group.
        .mockResolvedValue([]),
      update: vi.fn(),
    };

    const nextMatchLookup = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 41,
            opponent1_id: null,
            opponent2_id: 33,
            opponent1_result: null,
            opponent2_result: null,
            status: 1,
          },
        ],
      })
    );
    const roundEq = vi.fn(() => ({ eq: nextMatchLookup }));
    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'match') return {};
      return { select: vi.fn(() => ({ eq: roundEq })), update };
    });

    const before = structuredClone(completedSource);
    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.propagateCompletedMatches(400);

    expect(completedSource).toEqual(before);
    expect(storage.update).not.toHaveBeenCalledWith('match', { id: 31 }, expect.anything());
    expect(update).toHaveBeenCalledWith({ opponent1_id: 18, status: 2 });
  });
});
