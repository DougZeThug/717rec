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

import { BracketNormalizationService } from '../BracketNormalizationService';

describe('BracketNormalizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path: fixes duplicate participant in losers round 1 via direct Supabase update', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: { id: 8 } }]),
      update: vi.fn(),
    } as any;

    const eq = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({
      update: vi.fn(() => ({ eq })),
    });

    const service = new BracketNormalizationService(storage);
    await service.normalizeLosersR1(100);

    expect(mockFrom).toHaveBeenCalledWith('match');
    expect(eq).toHaveBeenCalledWith('id', 31);
    expect(storage.clearParticipantCache).toHaveBeenCalled();
  });

  it('missing required rows: returns early when losers bracket group is absent', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]),
      update: vi.fn(),
    } as any;

    const service = new BracketNormalizationService(storage);
    await expect(service.normalizeLosersR1(200)).resolves.toBeUndefined();

    expect(storage.update).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('idempotency edge case: second normalization run performs no duplicate-fix write', async () => {
    const storage = {
      clearParticipantCache: vi.fn(),
      select: vi
        .fn()
        .mockResolvedValueOnce([{ id: 11, number: 2 }])
        .mockResolvedValueOnce([{ id: 21, number: 1 }])
        .mockResolvedValueOnce([{ id: 31, status: 1, opponent1: { id: 8 }, opponent2: null }]),
      update: vi.fn(),
    } as any;

    mockFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    });

    const service = new BracketNormalizationService(storage);
    await service.normalizeLosersR1(300);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(storage.update).not.toHaveBeenCalled();
  });
});
