import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinalStandings } from '../useFinalStandings';

const mocks = vi.hoisted(() => ({
  fetchFinalStandings: vi.fn(),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchFinalStandings: mocks.fetchFinalStandings,
}));

const standings = [
  {
    placement: 1,
    wins: 3,
    losses: 0,
    game_wins: 6,
    game_losses: 1,
    teams: { id: 'team-1', name: 'Alpha', logo_url: null, image_url: null },
  },
];

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useFinalStandings', () => {
  beforeEach(() => {
    mocks.fetchFinalStandings.mockResolvedValue(standings);
  });

  it('loads the final placements for the bracket', async () => {
    const client = createClient();
    const { result } = renderHook(() => useFinalStandings('bracket-1', true), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(standings));
    expect(mocks.fetchFinalStandings).toHaveBeenCalledWith('bracket-1');
  });

  // useRecalculateStandings refreshes the screen by invalidating this exact
  // key after a manual recalculation. If the key here drifts, the new
  // placements are written to the database but the screen keeps the old ones.
  it('loads again when the final-standings key for that bracket is invalidated', async () => {
    const client = createClient();
    const { result } = renderHook(() => useFinalStandings('bracket-1', true), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(standings));
    expect(mocks.fetchFinalStandings).toHaveBeenCalledTimes(1);

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['final-standings', 'bracket-1'] });
    });

    expect(mocks.fetchFinalStandings).toHaveBeenCalledTimes(2);
  });

  it('leaves the placements alone when another bracket is invalidated', async () => {
    const client = createClient();
    const { result } = renderHook(() => useFinalStandings('bracket-1', true), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(standings));

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['final-standings', 'bracket-2'] });
    });

    expect(mocks.fetchFinalStandings).toHaveBeenCalledTimes(1);
  });

  it('does not ask the service when the caller turns it off', async () => {
    const client = createClient();
    const { result } = renderHook(() => useFinalStandings('bracket-1', false), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
    expect(mocks.fetchFinalStandings).not.toHaveBeenCalled();
  });
});
