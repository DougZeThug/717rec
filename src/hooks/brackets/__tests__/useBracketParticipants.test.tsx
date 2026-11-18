import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBracketParticipants } from '../useBracketParticipants';

const mocks = vi.hoisted(() => ({
  fetchBracketParticipants: vi.fn(),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchBracketParticipants: mocks.fetchBracketParticipants,
}));

const participants = [
  { id: 1, name: 'Alpha', position: 1, team_id: 'team-1' },
  { id: 2, name: 'Bravo', position: 2, team_id: 'team-2' },
];

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('useBracketParticipants', () => {
  beforeEach(() => {
    mocks.fetchBracketParticipants.mockResolvedValue(participants);
  });

  it('loads the seeded teams for the bracket', async () => {
    const client = createClient();
    const { result } = renderHook(() => useBracketParticipants('bracket-1'), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(participants));
    expect(mocks.fetchBracketParticipants).toHaveBeenCalledWith('bracket-1');
  });

  // SeedingUpdateDialog refreshes the seed list by invalidating this exact key
  // after an admin saves new seeds. If the key here drifts, the dialog keeps
  // listing the old seed order after a save.
  it('loads again when the bracket-participants key for that bracket is invalidated', async () => {
    const client = createClient();
    const { result } = renderHook(() => useBracketParticipants('bracket-1'), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(participants));
    expect(mocks.fetchBracketParticipants).toHaveBeenCalledTimes(1);

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['bracket-participants', 'bracket-1'] });
    });

    expect(mocks.fetchBracketParticipants).toHaveBeenCalledTimes(2);
  });

  it('leaves the seed list alone when another bracket is invalidated', async () => {
    const client = createClient();
    const { result } = renderHook(() => useBracketParticipants('bracket-1'), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.data).toEqual(participants));

    await act(async () => {
      await client.invalidateQueries({ queryKey: ['bracket-participants', 'bracket-2'] });
    });

    expect(mocks.fetchBracketParticipants).toHaveBeenCalledTimes(1);
  });

  it('does not ask the service while there is no bracket id', async () => {
    const client = createClient();
    const { result } = renderHook(() => useBracketParticipants(''), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(result.current.data).toBeUndefined();
    expect(mocks.fetchBracketParticipants).not.toHaveBeenCalled();
  });
});
