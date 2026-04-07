import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/DivisionService', () => ({
  DivisionService: { fetchDivisionWeightsMap: vi.fn() },
}));

import { DivisionService } from '@/services/DivisionService';
import {
  clearDivisionWeightsCache,
  fetchDivisionWeights,
  getDefaultDivisionWeight,
} from '../divisionWeightsCache';

describe('divisionWeightsCache', () => {
  beforeEach(() => {
    clearDivisionWeightsCache();
    vi.clearAllMocks();
  });

  it('getDefaultDivisionWeight returns 0.85', () => {
    expect(getDefaultDivisionWeight()).toBe(0.85);
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
});
