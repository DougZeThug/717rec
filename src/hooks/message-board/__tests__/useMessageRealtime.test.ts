import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
}));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: m.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: m.channel } }));
import { useMessageRealtime } from '../useMessageRealtime';

describe('useMessageRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.on.mockReturnThis();
    m.channel.mockReturnValue({ on: m.on });
    m.subscribe.mockReturnValue({ dispose: m.dispose });
  });
  it('routes all events, reconnects after the first connection, and disposes', () => {
    const insert = vi.fn();
    const update = vi.fn();
    const remove = vi.fn();
    const reconnect = vi.fn();
    const { unmount } = renderHook(() => useMessageRealtime(insert, update, remove, reconnect));
    const options = m.subscribe.mock.calls[0][0];
    options.build();
    expect(m.on).toHaveBeenCalledTimes(3);
    act(() => {
      m.on.mock.calls[0][2]({ new: { id: 'new' } });
      m.on.mock.calls[1][2]({ new: { id: 'changed' } });
      m.on.mock.calls[2][2]({ old: { id: 'gone' } });
    });
    expect(insert).toHaveBeenCalledWith({ id: 'new' });
    expect(update).toHaveBeenCalledWith({ id: 'changed' });
    expect(remove).toHaveBeenCalledWith({ id: 'gone' });
    options.onReconnect(true);
    options.onReconnect(false);
    expect(reconnect).toHaveBeenCalledOnce();
    unmount();
    expect(m.dispose).toHaveBeenCalledOnce();
  });
  it('uses new callbacks without rebuilding the subscription', () => {
    const oldInsert = vi.fn();
    const newInsert = vi.fn();
    const noop = vi.fn();
    const { rerender } = renderHook(({ insert }) => useMessageRealtime(insert, noop, noop), {
      initialProps: { insert: oldInsert },
    });
    const options = m.subscribe.mock.calls[0][0];
    options.build();
    rerender({ insert: newInsert });
    act(() => m.on.mock.calls[0][2]({ new: { id: '1' } }));
    expect(oldInsert).not.toHaveBeenCalled();
    expect(newInsert).toHaveBeenCalled();
    expect(m.subscribe).toHaveBeenCalledOnce();
  });
});
