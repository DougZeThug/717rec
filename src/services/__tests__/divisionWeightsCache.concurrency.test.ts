import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/DivisionService', () => ({
  DivisionService: { fetchDivisionWeightsMap: vi.fn() },
}));

import { DivisionService } from '@/services/DivisionService';

import { clearDivisionWeightsCache, fetchDivisionWeights } from '../divisionWeightsCache';

describe('divisionWeightsCache concurrency and error handling', () => {
  beforeEach(() => {
    clearDivisionWeightsCache();
    vi.clearAllMocks();
  });

  it('shares one in-flight fetch between concurrent callers', async () => {
    let resolveFetch: (value: { id: string; division_weight: number }[]) => void = vi.fn();
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }) as never
    );

    // Start two fetches before the first resolves
    const first = fetchDivisionWeights();
    const second = fetchDivisionWeights();

    resolveFetch([{ id: 'div-1', division_weight: 0.9 }]);

    const [a, b] = await Promise.all([first, second]);
    expect(a.get('div-1')).toBe(0.9);
    expect(b.get('div-1')).toBe(0.9);
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(1);
  });

  it('propagates fetch errors to the caller', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockRejectedValue(
      new Error('database unavailable')
    );

    await expect(fetchDivisionWeights()).rejects.toThrow('database unavailable');
  });

  it('retries after a failed fetch instead of caching the failure', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap)
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValueOnce([{ id: 'div-1', division_weight: 0.8 }] as never);

    await expect(fetchDivisionWeights()).rejects.toThrow('transient error');

    const weights = await fetchDivisionWeights();
    expect(weights.get('div-1')).toBe(0.8);
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
  });
});
