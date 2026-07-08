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

import { errorLog } from '@/utils/logger';

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

describe('BracketNormalizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateLBRounds', () => {
    it.each([
      { bracketSize: 4, expected: 2 },
      { bracketSize: 8, expected: 4 },
      { bracketSize: 16, expected: 6 },
      { bracketSize: 2, expected: 0 },
    ])('returns $expected for bracket size $bracketSize', ({ bracketSize, expected }) => {
      const storage = createStorageDouble();
      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      expect(service.calculateLBRounds(bracketSize)).toBe(expected);
    });
  });

  describe('findLBFinalMatch', () => {
    it('returns null when LB group is missing', async () => {
      const storage = createStorageDouble();
      storage.select.mockResolvedValueOnce([{ id: 1, number: 1 }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.findLBFinalMatch(100)).resolves.toBeNull();
    });

    it('returns null when LB rounds are missing', async () => {
      const storage = createStorageDouble();
      storage.select.mockResolvedValueOnce([{ id: 10, number: 2 }]).mockResolvedValueOnce([]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.findLBFinalMatch(100)).resolves.toBeNull();
    });

    it('returns final round match on happy path', async () => {
      const storage = createStorageDouble();
      const expectedMatch = {
        id: 600,
        round_id: 300,
        status: 1,
        opponent1: { id: 3 },
        opponent2: null,
      };

      storage.select
        .mockResolvedValueOnce([{ id: 10, number: 2 }])
        .mockResolvedValueOnce([
          { id: 200, number: 1 },
          { id: 300, number: 4 },
        ])
        .mockResolvedValueOnce([expectedMatch]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.findLBFinalMatch(100)).resolves.toEqual(expectedMatch);
    });

    it('returns null when select fails', async () => {
      const storage = createStorageDouble();
      storage.select.mockRejectedValueOnce(new Error('db down'));

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.findLBFinalMatch(100)).resolves.toBeNull();
      expect(errorLog).toHaveBeenCalled();
    });
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

    it('updates GF opponent2 when LB final is complete', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 2, opponent1: { id: 5 }, opponent2: null }])
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

    it('swallows errors defensively', async () => {
      const storage = createStorageDouble();
      storage.select.mockRejectedValueOnce(new Error('unexpected storage failure'));

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);

      await expect(service.normalizeGrandFinalPopulation(101)).resolves.toBeUndefined();
      expect(errorLog).toHaveBeenCalled();
    });

    it('populates GF opponent1 from completed WB Final when missing', async () => {
      const storage = createStorageDouble();
      storage.select
        // gfGroup (group.number===3)
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        // gfRounds for group 30
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        // gfMatches — both slots empty, status locked
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
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
          { id: 200, number: 1, status: 1, opponent1: null, opponent2: null },
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
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
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

  describe('repairGrandFinalWithRetries', () => {
    it('returns immediately when GF is already populated', async () => {
      const storage = createStorageDouble();
      storage.select
        // 1st pass: isGrandFinalFullyPopulated → gfGroup, gfRounds, gfMatch (both filled)
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 2, opponent1: { id: 5 }, opponent2: { id: 8 } }]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.repairGrandFinalWithRetries(101, { attempts: 3, delayMs: 0 });

      // Only the populated-check happened — no normalization writes.
      expect(storage.update).not.toHaveBeenCalled();
    });

    it('retries normalization until both slots are populated', async () => {
      const storage = createStorageDouble();
      // Attempt 1 populated-check → both empty.
      storage.select
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
        // Attempt 1 normalizeGrandFinalPopulation: gfGroup, gfRounds, gfMatch, WB lookup (no WB final yet)
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
        .mockResolvedValueOnce([{ id: 5, number: 1 }])
        .mockResolvedValueOnce([{ id: 51, number: 1 }])
        .mockResolvedValueOnce([{ id: 99, number: 1, status: 1, opponent1: null, opponent2: null }])
        // LB lookup (no LB final yet)
        .mockResolvedValueOnce([{ id: 20, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 2 }])
        .mockResolvedValueOnce([
          { id: 200, number: 1, status: 1, opponent1: null, opponent2: null },
        ])
        // Attempt 2 populated-check → still empty
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
        // Attempt 2 normalizeGrandFinalPopulation: now WB & LB finals are complete
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([{ id: 70, status: 0, opponent1: null, opponent2: null }])
        .mockResolvedValueOnce([{ id: 5, number: 1 }])
        .mockResolvedValueOnce([{ id: 51, number: 1 }])
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
        .mockResolvedValueOnce([{ id: 21, number: 2 }])
        .mockResolvedValueOnce([
          {
            id: 200,
            number: 1,
            status: 4,
            opponent1: { id: 11, result: 'win' },
            opponent2: { id: 12, result: 'loss' },
          },
        ])
        // Attempt 3 populated-check → now sees the write applied (both filled)
        .mockResolvedValueOnce([{ id: 30, number: 3 }])
        .mockResolvedValueOnce([{ id: 32, number: 1 }])
        .mockResolvedValueOnce([
          { id: 70, status: 2, opponent1: { id: 7 }, opponent2: { id: 11 } },
        ]);

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.repairGrandFinalWithRetries(101, { attempts: 3, delayMs: 0 });

      // Two normalize passes wrote to the GF match.
      expect(storage.update).toHaveBeenCalledTimes(1);
      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 70 },
        expect.objectContaining({
          opponent1: { id: 7, position: undefined },
          opponent2: { id: 11, position: undefined },
          status: 2,
        })
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

    it('triggers direct SQL clear + cache clear on duplicate opponents', async () => {
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
      expect(storage.clearParticipantCache).toHaveBeenCalledTimes(2);
    });

    it('logs direct SQL errors and continues to next match', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([
          { id: 31, status: 1, opponent1: { id: 8 }, opponent2: { id: 8 } },
          { id: 32, status: 1, opponent1: null, opponent2: { id: 10 } },
        ]);

      mockSupabaseDirectUpdate({ error: { message: 'sql failed' } });

      const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
      await service.normalizeLosersR1(100);

      expect(errorLog).toHaveBeenCalled();
      expect(storage.update).toHaveBeenCalledWith(
        'match',
        { id: 32 },
        {
          opponent1: { id: 10, score: null, result: null },
          opponent2: { id: null, score: null, result: null },
          status: 1,
        }
      );
    });

    it('shifts opponent2 to opponent1 when opponent1 is missing', async () => {
      const storage = createStorageDouble();
      storage.select
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 32, status: 3, opponent1: null, opponent2: { id: 44 } }]);

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
        .mockResolvedValueOnce([{ id: 41, number: 1 }]),
      update: vi.fn(),
    };

    const selectEqRoundId = vi.fn().mockReturnThis();
    const selectEqNumber = vi.fn(() =>
      Promise.resolve({
        data: [{ id: 41, opponent1_id: null, opponent2_id: 33, status: 1 }],
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
});
