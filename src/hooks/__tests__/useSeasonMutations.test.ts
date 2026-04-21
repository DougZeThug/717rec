import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/SeasonService', () => ({
  SeasonService: {
    createSeason: vi.fn(),
    updateSeason: vi.fn(),
    activateSeason: vi.fn(),
    activateSeasonWithPartialArchive: vi.fn(),
    finalizePlayoffs: vi.fn(),
    archiveSeason: vi.fn(),
  },
}));

import { SeasonService } from '@/services/SeasonService';

import { useSeasonMutations } from '../useSeasonMutations';

const INVALIDATED_KEYS = [
  ['seasons'],
  ['matches'],
  ['teams'],
  ['rankings'],
  ['v_team_details'],
  ['teamStats'],
  ['standings'],
  ['careerRankings'],
  ['bracket-data'],
  ['playoff-matches'],
];

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useSeasonMutations(), { wrapper });
  return { result, invalidateSpy };
};

describe('useSeasonMutations.activateSeasonWithPartialArchive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the full set of related query keys on success', async () => {
    (SeasonService.activateSeasonWithPartialArchive as any).mockResolvedValue({ id: 's-1' });
    const { result, invalidateSpy } = setup();

    await result.current.activateSeasonWithPartialArchive.mutateAsync('s-1');

    await waitFor(() => {
      for (const key of INVALIDATED_KEYS) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
      }
    });
    expect(SeasonService.activateSeasonWithPartialArchive).toHaveBeenCalled();
    expect((SeasonService.activateSeasonWithPartialArchive as any).mock.calls[0][0]).toBe('s-1');
  });

  it('surfaces service errors so callers can toast', async () => {
    (SeasonService.activateSeasonWithPartialArchive as any).mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await expect(
      result.current.activateSeasonWithPartialArchive.mutateAsync('s-1')
    ).rejects.toThrow('boom');
  });
});

describe('useSeasonMutations.finalizePlayoffs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the full set of related query keys on success', async () => {
    (SeasonService.finalizePlayoffs as any).mockResolvedValue({ id: 's-1', is_archived: true });
    const { result, invalidateSpy } = setup();

    await result.current.finalizePlayoffs.mutateAsync({
      seasonId: 's-1',
      championTeamId: null,
      runnerUpTeamId: null,
      thirdPlaceTeamId: null,
    });

    await waitFor(() => {
      for (const key of INVALIDATED_KEYS) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
      }
    });
    expect((SeasonService.finalizePlayoffs as any).mock.calls[0][0]).toEqual({
      seasonId: 's-1',
      championTeamId: null,
      runnerUpTeamId: null,
      thirdPlaceTeamId: null,
    });
  });

  it('surfaces service errors so callers can toast', async () => {
    (SeasonService.finalizePlayoffs as any).mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await expect(
      result.current.finalizePlayoffs.mutateAsync({ seasonId: 's-1' } as any)
    ).rejects.toThrow('nope');
  });
});