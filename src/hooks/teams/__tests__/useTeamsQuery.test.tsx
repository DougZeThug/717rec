import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchTeamsWithOptions } = vi.hoisted(() => ({ mockFetchTeamsWithOptions: vi.fn() }));

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamsWithOptions: mockFetchTeamsWithOptions,
}));

import { TEAMS_QUERY_KEY, useTeamsQuery } from '../useTeamsQuery';

let activeClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => {
  activeClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: activeClient }, children);
};

const observerInterval = () =>
  activeClient.getQueryCache().find({ queryKey: [TEAMS_QUERY_KEY] })?.observers[0]?.options
    .refetchInterval;

describe('useTeamsQuery polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTeamsWithOptions.mockResolvedValue([]);
  });

  it('does not poll by default', async () => {
    const { result } = renderHook(() => useTeamsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(observerInterval()).toBe(false);
  });

  it('polls on league night for pages that ask for live data', async () => {
    const { result } = renderHook(() => useTeamsQuery(undefined, true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const interval = observerInterval();
    expect(typeof interval).toBe('function');
    const query = activeClient.getQueryCache().find({ queryKey: [TEAMS_QUERY_KEY] });
    const wait = (interval as (q: unknown) => number | false)(query);
    expect(typeof wait).toBe('number');
    expect(wait).toBeGreaterThanOrEqual(60_000);
  });
});
