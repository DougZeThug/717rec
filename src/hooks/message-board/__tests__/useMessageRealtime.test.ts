import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: mocks.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: mocks.channel } }));
import { useMessageRealtime } from '../useMessageRealtime';

describe('useMessageRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.on.mockReturnThis();
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.subscribe.mockReturnValue({ dispose: mocks.dispose });
  });
  it('routes all events, reconnects after the first connection, and disposes', () => {
    const insert = vi.fn();
    const update = vi.fn();
    const remove = vi.fn();
    const reconnect = vi.fn();
    const { unmount } = renderHook(() => useMessageRealtime(insert, update, remove, reconnect));
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();
    expect(mocks.on).toHaveBeenCalledTimes(3);
    act(() => {
      mocks.on.mock.calls[0][2]({ new: { id: 'new' } });
      mocks.on.mock.calls[1][2]({ new: { id: 'changed' } });
      mocks.on.mock.calls[2][2]({ old: { id: 'gone' } });
    });
    expect(insert).toHaveBeenCalledWith({ id: 'new' });
    expect(update).toHaveBeenCalledWith({ id: 'changed' });
    expect(remove).toHaveBeenCalledWith({ id: 'gone' });
    options.onReconnect(true);
    options.onReconnect(false);
    expect(reconnect).toHaveBeenCalledOnce();
    unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it('uses new callbacks without rebuilding the subscription', () => {
    const oldInsert = vi.fn();
    const newInsert = vi.fn();
    const noop = vi.fn();
    const { rerender } = renderHook(({ insert }) => useMessageRealtime(insert, noop, noop), {
      initialProps: { insert: oldInsert },
    });
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();
    rerender({ insert: newInsert });
    act(() => mocks.on.mock.calls[0][2]({ new: { id: '1' } }));
    expect(oldInsert).not.toHaveBeenCalled();
    expect(newInsert).toHaveBeenCalled();
    expect(mocks.subscribe).toHaveBeenCalledOnce();
  });
});
