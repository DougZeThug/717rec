import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mutable state used inside vi.mock factories
const { mockToast, mockRemoveChannel, mockChannel, mockFrom, mockFromSingle } = vi.hoisted(() => {
  const mockToast = vi.fn();
  const mockRemoveChannel = vi.fn();
  const mockFromSingle = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null });
  // Build the from() chain inline — intermediate fns not needed outside this scope
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        limit: vi.fn(() => ({
          single: mockFromSingle,
        })),
      })),
    })),
  }));
  const mockChannel = { on: vi.fn(), subscribe: vi.fn() };
  return { mockToast, mockRemoveChannel, mockChannel, mockFrom, mockFromSingle };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
    from: mockFrom,
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { useBracketsManagerRealtime } from '../useBracketsManagerRealtime';
import { supabase } from '@/integrations/supabase/client';

const BRACKET_ID = 'bracket-abc';
const STAGE_ID = 42;

// Track callbacks fired by the channel stub
let capturedPayloadCallback: ((payload: unknown) => void) | null = null;
let capturedSubscribeCallback: ((status: string) => void) | null = null;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
};

describe('useBracketsManagerRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPayloadCallback = null;
    capturedSubscribeCallback = null;

    mockChannel.on.mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        capturedPayloadCallback = cb;
        return mockChannel;
      }
    );
    mockChannel.subscribe.mockImplementation((cb: (status: string) => void) => {
      capturedSubscribeCallback = cb;
      return mockChannel;
    });
    (supabase.channel as ReturnType<typeof vi.fn>).mockReturnValue(mockChannel);
    mockFromSingle.mockResolvedValue({ data: { id: STAGE_ID }, error: null });
  });

  it('does not create a channel when bracketId is null', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useBracketsManagerRealtime(null), { wrapper });
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('uses providedStageId directly without fetching from DB', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), { wrapper });
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches stageId from stage table when not provided', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useBracketsManagerRealtime(BRACKET_ID), { wrapper });
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('stage'));
  });

  it('calls .on() with the correct postgres_changes filter', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), { wrapper });
    await waitFor(() => expect(mockChannel.on).toHaveBeenCalled());
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'match',
        filter: `stage_id=eq.${STAGE_ID}`,
      }),
      expect.any(Function)
    );
  });

  it('sets realtimeEnabled=true when subscription status is SUBSCRIBED', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), {
      wrapper,
    });
    await waitFor(() => expect(capturedSubscribeCallback).not.toBeNull());
    const subscribeCb = capturedSubscribeCallback as (status: string) => void;
    act(() => { subscribeCb('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.realtimeEnabled).toBe(true));
  });

  it('sets realtimeEnabled=false on CHANNEL_ERROR', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), {
      wrapper,
    });
    await waitFor(() => expect(capturedSubscribeCallback).not.toBeNull());
    const subscribeCb = capturedSubscribeCallback as (status: string) => void;
    act(() => { subscribeCb('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.realtimeEnabled).toBe(true));
    act(() => { subscribeCb('CHANNEL_ERROR'); });
    await waitFor(() => expect(result.current.realtimeEnabled).toBe(false));
  });

  it('invalidates bracket queries when a payload event fires', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), { wrapper });
    await waitFor(() => expect(capturedPayloadCallback).not.toBeNull());
    const payloadCb = capturedPayloadCallback as (payload: unknown) => void;

    act(() => { payloadCb({ eventType: 'UPDATE', new: { id: 1 } }); });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['bracket-data', BRACKET_ID] })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['bracket-info', BRACKET_ID] })
    );
  });

  it('shows Bracket Updated toast when a realtime event fires', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), { wrapper });
    await waitFor(() => expect(capturedPayloadCallback).not.toBeNull());
    const payloadCb = capturedPayloadCallback as (payload: unknown) => void;

    act(() => { payloadCb({ eventType: 'UPDATE', new: { id: 1 } }); });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Bracket Updated' })
    );
  });

  it('calls supabase.removeChannel on unmount', async () => {
    const { wrapper } = createWrapper();
    const { unmount } = renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), {
      wrapper,
    });
    await waitFor(() => expect(supabase.channel).toHaveBeenCalled());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('updates lastUpdate timestamp when event fires', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBracketsManagerRealtime(BRACKET_ID, STAGE_ID), {
      wrapper,
    });
    await waitFor(() => expect(capturedPayloadCallback).not.toBeNull());
    const payloadCb = capturedPayloadCallback as (payload: unknown) => void;
    expect(result.current.lastUpdate).toBeNull();

    act(() => { payloadCb({ eventType: 'UPDATE', new: { id: 1 } }); });

    await waitFor(() => expect(result.current.lastUpdate).toBeInstanceOf(Date));
  });
});
