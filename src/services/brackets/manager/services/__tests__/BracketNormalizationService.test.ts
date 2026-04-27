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

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { BracketNormalizationService } from '../BracketNormalizationService';

describe('BracketNormalizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fixes duplicate participant in losers round 1 via direct Supabase update', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: { id: 8 } }]),
      update: vi.fn(),
    };

    const eq = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({
      update: vi.fn(() => ({ eq })),
    });

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.normalizeLosersR1(100);

    expect(mockFrom).toHaveBeenCalledWith('match');
    expect(eq).toHaveBeenCalledWith('id', 31);
    expect(storage.clearParticipantCache).toHaveBeenCalledTimes(2);
  });

  it('populates GF opponent2 from completed LB final winner', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([
          { id: 11, number: 2 },
          { id: 12, number: 3 },
        ])
        .mockResolvedValueOnce([{ id: 41, number: 1 }])
        .mockResolvedValueOnce([{ id: 51, status: 2, opponent1: { id: 3 }, opponent2: null }])
        .mockResolvedValueOnce([
          { id: 11, number: 2 },
          { id: 12, number: 3 },
        ])
        .mockResolvedValueOnce([{ id: 31, number: 4 }])
        .mockResolvedValueOnce([
          {
            id: 61,
            status: 4,
            opponent1: { id: 7, result: 'loss' },
            opponent2: { id: 9, result: 'win' },
          },
        ]),
      update: vi.fn().mockResolvedValue(),
    };

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.normalizeGrandFinalPopulation(100);

    expect(storage.update).toHaveBeenCalledWith(
      'match',
      { id: 51 },
      {
        opponent2: { id: 9, position: undefined },
        status: 2,
      }
    );
  });

  it('returns early when losers bracket group is absent', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]),
      update: vi.fn(),
    };

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await expect(service.normalizeLosersR1(200)).resolves.toBeUndefined();

    expect(storage.update).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('is idempotent when no duplicate exists in losers round 1', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: null }]),
      update: vi.fn(),
    };

    mockFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const service = new BracketNormalizationService(storage as unknown as SupabaseSqlStorage);
    await service.normalizeLosersR1(300);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(storage.update).not.toHaveBeenCalled();
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
