import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToast, mockBulk, mockReset, mockSingle } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockBulk: vi.fn(),
  mockReset: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/teams/TeamSeedService', () => ({
  bulkUpdateTeamSeeds: mockBulk,
  resetDivisionSeeds: mockReset,
  updateTeamSeed: mockSingle,
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));
// Retrying would only slow a failing test down.
vi.mock('../../utils/mutationErrorHandling', () => ({
  formatUserError: (e: unknown) => (e instanceof Error ? e.message : 'failed'),
  withRetry: (fn: () => unknown) => fn(),
}));

import { PLAYOFF_TEAMS_QUERY_KEY } from '@/hooks/playoffs/usePlayoffTeams';

import { useTeamSeedMutation } from '../useTeamSeedMutation';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children
  );

describe('useTeamSeedMutation toasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulk.mockResolvedValue([]);
    mockReset.mockResolvedValue({});
  });

  it('says the seeds were updated after a bulk update', async () => {
    const { result } = renderHook(() => useTeamSeedMutation(), { wrapper });

    await act(async () => {
      await result.current.bulkUpdateSeeds.mutateAsync({ updates: [], divisionId: 'd1' });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Seeds updated', variant: 'success' })
    );
  });

  it('says the seeds were reset after a division reset', async () => {
    const { result } = renderHook(() => useTeamSeedMutation(), { wrapper });

    await act(async () => {
      await result.current.resetDivisionSeeds.mutateAsync('d1');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Seeds reset', variant: 'success' })
    );
  });

  it('shows an error toast when a bulk update fails', async () => {
    mockBulk.mockRejectedValue(new Error('db down'));
    const { result } = renderHook(() => useTeamSeedMutation(), { wrapper });

    await act(async () => {
      await result.current.bulkUpdateSeeds
        .mutateAsync({ updates: [], divisionId: 'd1' })
        .catch(() => undefined);
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useTeamSeedMutation refreshes the list the picker reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulk.mockResolvedValue([]);
    mockReset.mockResolvedValue({});
    mockSingle.mockResolvedValue({});
  });

  const run = async (act_: (api: ReturnType<typeof useTeamSeedMutation>) => Promise<unknown>) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(PLAYOFF_TEAMS_QUERY_KEY, []);
    const clientWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => useTeamSeedMutation(), { wrapper: clientWrapper });
    await act(async () => {
      await act_(result.current);
    });
    return client.getQueryState(PLAYOFF_TEAMS_QUERY_KEY)?.isInvalidated;
  };

  it('marks the picker list stale after a bulk Save', async () => {
    await expect(
      run((api) => api.bulkUpdateSeeds.mutateAsync({ updates: [], divisionId: 'd1' }))
    ).resolves.toBe(true);
  });

  it('marks the picker list stale after a single seed Save', async () => {
    await expect(
      run((api) => api.updateSingleTeamSeed.mutateAsync({ teamId: 't1', seed: 1 }))
    ).resolves.toBe(true);
  });

  it('marks the picker list stale after a division reset', async () => {
    await expect(run((api) => api.resetDivisionSeeds.mutateAsync('d1'))).resolves.toBe(true);
  });
});
