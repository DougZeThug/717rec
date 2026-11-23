import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchSeasonBreakdown } = vi.hoisted(() => ({ fetchSeasonBreakdown: vi.fn() }));
vi.mock('@/services/TeamSeasonStatsService', () => ({ fetchSeasonBreakdown }));

import { useTeamSeasonBreakdown } from '../useTeamSeasonBreakdown';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

afterEach(() => vi.resetAllMocks());

describe('useTeamSeasonBreakdown', () => {
  it('loads the season breakdown for a team', async () => {
    fetchSeasonBreakdown.mockResolvedValue({ team_id: 'team-1' });

    const { result } = renderHook(() => useTeamSeasonBreakdown('team-1'), { wrapper });

    await waitFor(() => expect(result.current.advancedStats).toEqual({ team_id: 'team-1' }));
    expect(fetchSeasonBreakdown).toHaveBeenCalledWith('team-1');
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when there is no team id', () => {
    const { result } = renderHook(() => useTeamSeasonBreakdown(undefined), { wrapper }); // skipcq: JS-W1042

    expect(result.current.advancedStats).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(fetchSeasonBreakdown).not.toHaveBeenCalled();
  });

  it('returns null from a manual refetch without a team id', async () => {
    const { result } = renderHook(() => useTeamSeasonBreakdown(undefined), { wrapper }); // skipcq: JS-W1042

    const refetched = await result.current.refetch();

    expect(refetched.data).toBeNull();
    expect(fetchSeasonBreakdown).not.toHaveBeenCalled();
  });

  it('reports a fetch failure as an error', async () => {
    fetchSeasonBreakdown.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useTeamSeasonBreakdown('team-1'), { wrapper });

    await waitFor(() => expect(result.current.error).toEqual(new Error('boom')));
  });
});
