import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/DivisionService', () => ({
  DivisionService: { fetchDivisionWeightsMap: vi.fn() },
}));

import { DivisionService } from '@/services/DivisionService';

import {
  clearDivisionWeightsCache,
  fetchDivisionWeights,
  fetchDivisionWeightsByName,
} from '../divisionWeightsCache';

describe('divisionWeightsCache', () => {
  beforeEach(() => {
    clearDivisionWeightsCache();
    vi.clearAllMocks();
  });

  it('fetches weights from DivisionService on first call', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
      { id: 'div-1', division_weight: 0.9 } as never,
    ]);
    const weights = await fetchDivisionWeights();
    expect(weights.get('div-1')).toBe(0.9);
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on subsequent calls (no extra DB round-trip)', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
      { id: 'div-1', division_weight: 0.9 } as never,
    ]);
    await fetchDivisionWeights();
    await fetchDivisionWeights();
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(1);
  });

  it('clearDivisionWeightsCache forces a fresh fetch', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
      { id: 'div-1', division_weight: 0.9 } as never,
    ]);
    await fetchDivisionWeights();
    clearDivisionWeightsCache();
    await fetchDivisionWeights();
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
  });

  it('uses DEFAULT_DIVISION_WEIGHT when division_weight is null', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
      { id: 'div-1', division_weight: null } as never,
    ]);
    const weights = await fetchDivisionWeights();
    expect(weights.get('div-1')).toBe(0.85);
  });

  it('does not cache empty results (retries next time)', async () => {
    vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([]);
    await fetchDivisionWeights();
    await fetchDivisionWeights();
    // Not cached because result was empty → fetches twice
    expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
  });

  // Career scoring reads weights by division name, not by id.
  describe('fetchDivisionWeightsByName', () => {
    it('keys weights by the lowercased, trimmed division name', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: 'Competitive', division_weight: 0.9 },
        { id: 'div-2', name: '  Intermediate  ', division_weight: 0.7 },
      ] as never);
      const weights = await fetchDivisionWeightsByName();
      expect(weights.get('competitive')).toBe(0.9);
      expect(weights.get('intermediate')).toBe(0.7);
      expect(weights.has('Competitive')).toBe(false);
      expect(weights.has('  Intermediate  ')).toBe(false);
      expect(weights.has('div-1')).toBe(false);
      expect(weights.size).toBe(2);
    });

    it('skips a division that has no name', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: null, division_weight: 0.5 },
        { id: 'div-2', name: 'Recreational', division_weight: 0.4 },
      ] as never);
      const weights = await fetchDivisionWeightsByName();
      expect([...weights.keys()]).toEqual(['recreational']);
    });

    it('uses 0.85 when division_weight is null or undefined', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: 'Alpha', division_weight: null },
        { id: 'div-2', name: 'Beta' },
      ] as never);
      const weights = await fetchDivisionWeightsByName();
      expect(weights.get('alpha')).toBe(0.85);
      expect(weights.get('beta')).toBe(0.85);
    });

    it('keeps a weight of 0 instead of replacing it with the default', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: 'Hidden', division_weight: 0 },
      ] as never);
      const weights = await fetchDivisionWeightsByName();
      expect(weights.get('hidden')).toBe(0);
    });

    it('shares one in-flight fetch between concurrent callers', async () => {
      let resolveFetch: (value: { id: string; name: string; division_weight: number }[]) => void =
        vi.fn();
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }) as never
      );

      // Start two fetches before the first resolves
      const first = fetchDivisionWeightsByName();
      const second = fetchDivisionWeightsByName();

      resolveFetch([{ id: 'div-1', name: 'Competitive', division_weight: 0.9 }]);

      const [a, b] = await Promise.all([first, second]);
      expect(a.get('competitive')).toBe(0.9);
      expect(b).toBe(a);
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(1);
    });

    it('returns the cached map on later calls (no extra DB round-trip)', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: 'Competitive', division_weight: 0.9 },
      ] as never);
      const first = await fetchDivisionWeightsByName();
      const second = await fetchDivisionWeightsByName();
      expect(second).toBe(first);
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(1);
    });

    it('does not cache empty results (retries next time)', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([]);
      await fetchDivisionWeightsByName();
      await fetchDivisionWeightsByName();
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
    });

    it('retries after a failed fetch instead of caching the failure', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap)
        .mockRejectedValueOnce(new Error('transient error'))
        .mockResolvedValueOnce([
          { id: 'div-1', name: 'Competitive', division_weight: 0.8 },
        ] as never);

      await expect(fetchDivisionWeightsByName()).rejects.toThrow('transient error');

      const weights = await fetchDivisionWeightsByName();
      expect(weights.get('competitive')).toBe(0.8);
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
    });

    it('clearDivisionWeightsCache forces a fresh fetch by name', async () => {
      vi.mocked(DivisionService.fetchDivisionWeightsMap).mockResolvedValue([
        { id: 'div-1', name: 'Competitive', division_weight: 0.9 },
      ] as never);
      await fetchDivisionWeightsByName();
      clearDivisionWeightsCache();
      await fetchDivisionWeightsByName();
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);
    });

    it('clearDivisionWeightsCache also drops an in-flight by-name fetch', async () => {
      let resolveFirst: (value: { id: string; name: string; division_weight: number }[]) => void =
        vi.fn();
      vi.mocked(DivisionService.fetchDivisionWeightsMap)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }) as never
        )
        .mockResolvedValueOnce([
          { id: 'div-1', name: 'Competitive', division_weight: 0.6 },
        ] as never);

      const stale = fetchDivisionWeightsByName();
      clearDivisionWeightsCache();
      // The cleared cache must start its own fetch, not reuse the old promise.
      const fresh = await fetchDivisionWeightsByName();
      expect(fresh.get('competitive')).toBe(0.6);
      expect(DivisionService.fetchDivisionWeightsMap).toHaveBeenCalledTimes(2);

      resolveFirst([{ id: 'div-1', name: 'Competitive', division_weight: 0.1 }]);
      await stale;
    });
  });
});
