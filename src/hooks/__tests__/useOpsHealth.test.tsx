import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/opsHealth/OpsHealthService', () => ({
  OpsHealthService: {
    fetchLastPowerSnapshot: vi.fn(),
    fetchPendingOpsCounts: vi.fn(),
  },
}));

const subscribeCallbacks: Array<(status: string) => void> = [];
const removeChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => ({
      on: function on() {
        return this;
      },
      subscribe: (cb: (status: string) => void) => {
        subscribeCallbacks.push(cb);
        return {};
      },
    }),
    removeChannel,
  },
}));

import { OpsHealthService } from '@/services/opsHealth/OpsHealthService';

import {
  useLastPowerSnapshot,
  usePendingOpsCounts,
  useRealtimeHealth,
} from '../useOpsHealth';

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  subscribeCallbacks.length = 0;
  removeChannel.mockClear();
  vi.mocked(OpsHealthService.fetchLastPowerSnapshot).mockReset();
  vi.mocked(OpsHealthService.fetchPendingOpsCounts).mockReset();
});

afterEach(() => {
  queryClient.clear();
});

describe('useLastPowerSnapshot', () => {
  it('exposes data from the service', async () => {
    vi.mocked(OpsHealthService.fetchLastPowerSnapshot).mockResolvedValue({
      created_at: '2026-07-15T04:00:00Z',
      snapshot_date: '2026-07-15',
      week_number: 4,
      season_id: 's-1',
      row_count: 27,
    });
    const { result } = renderHook(() => useLastPowerSnapshot(), { wrapper });
    await waitFor(() => expect(result.current.data?.row_count).toBe(27));
  });
});

describe('usePendingOpsCounts', () => {
  it('exposes counts from the service', async () => {
    vi.mocked(OpsHealthService.fetchPendingOpsCounts).mockResolvedValue({
      pendingScoreSubmissions: 1,
      pendingTeamRequests: 2,
      newContactRequests: 3,
    });
    const { result } = renderHook(() => usePendingOpsCounts(), { wrapper });
    await waitFor(() => expect(result.current.data?.pendingTeamRequests).toBe(2));
  });
});

describe('useRealtimeHealth', () => {
  it('transitions through connecting → connected → error and cleans up', async () => {
    const { result, unmount } = renderHook(() => useRealtimeHealth());
    expect(result.current.state).toBe('connecting');

    await waitFor(() => expect(subscribeCallbacks.length).toBe(1));

    act(() => subscribeCallbacks[0]('SUBSCRIBED'));
    expect(result.current.state).toBe('connected');

    act(() => subscribeCallbacks[0]('CHANNEL_ERROR'));
    expect(result.current.state).toBe('error');

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});