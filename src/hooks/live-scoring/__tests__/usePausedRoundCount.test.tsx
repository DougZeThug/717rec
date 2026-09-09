import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { liveScoringKeys } from '../liveScoringKeys';
import { usePausedRoundCount } from '../usePausedRoundCount';

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

/** Fires a save under the given key, the way useRoundMutations does. */
const saveRound = (mutationKey: readonly unknown[]) =>
  queryClient
    .getMutationCache()
    .build(queryClient, { mutationKey: mutationKey as unknown[], mutationFn: vi.fn() })
    .execute(undefined);

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.mount();
});

afterEach(() => {
  queryClient.unmount();
  onlineManager.setOnline(true);
});

describe('usePausedRoundCount', () => {
  it('counts nothing while everything is getting through', () => {
    const { result } = renderHook(() => usePausedRoundCount('match-1'), { wrapper });
    expect(result.current).toBe(0);
  });

  it('counts the rounds waiting for a signal', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => usePausedRoundCount('match-1'), { wrapper });

    act(() => {
      void saveRound(liveScoringKeys.submitRound('match-1'));
      void saveRound(liveScoringKeys.submitRound('match-1'));
    });

    await waitFor(() => expect(result.current).toBe(2));
  });

  it('counts only this match', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => usePausedRoundCount('match-1'), { wrapper });

    act(() => {
      void saveRound(liveScoringKeys.submitRound('match-1'));
      void saveRound(liveScoringKeys.submitRound('match-2'));
    });

    await waitFor(() => expect(result.current).toBe(1));
  });

  it('goes back to nothing once the rounds have gone', async () => {
    onlineManager.setOnline(false);
    const { result } = renderHook(() => usePausedRoundCount('match-1'), { wrapper });

    act(() => {
      void saveRound(liveScoringKeys.submitRound('match-1'));
    });
    await waitFor(() => expect(result.current).toBe(1));

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(result.current).toBe(0));
  });
});
