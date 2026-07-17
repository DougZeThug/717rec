import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string) => mockRpc(fn),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { DriftService } from '../DriftService';

const pgError = () => ({
  message: 'boom',
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

describe('DriftService.fetchDrift', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns [] when the view has no rows', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [], error: null }),
    });
    expect(await DriftService.fetchDrift()).toEqual([]);
  });

  it('returns rows as-is when drift exists', async () => {
    const row = {
      team_id: 't-1',
      name: 'Sweat Bandits',
      counter_wins: 1,
      derived_wins: 2,
      counter_losses: 0,
      derived_losses: 0,
      counter_game_wins: 2,
      derived_game_wins: 4,
      counter_game_losses: 1,
      derived_game_losses: 1,
    };
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [row], error: null }),
    });
    expect(await DriftService.fetchDrift()).toEqual([row]);
  });

  it('throws DatabaseError on query failure', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: null, error: pgError() }),
    });
    await expect(DriftService.fetchDrift()).rejects.toThrow(DatabaseError);
  });
});

describe('DriftService.reconcile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the numeric repaired count from the RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: 3, error: null });
    expect(await DriftService.reconcile()).toBe(3);
    expect(mockRpc).toHaveBeenCalledWith('reconcile_team_counters');
  });

  it('coerces non-numeric payloads to 0', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await DriftService.reconcile()).toBe(0);
  });

  it('throws DatabaseError when the RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: pgError() });
    await expect(DriftService.reconcile()).rejects.toThrow(DatabaseError);
  });
});