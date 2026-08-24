import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  subscribe: vi.fn(),
  dispose: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
  toast: vi.fn(),
  error: vi.fn(),
  user: { id: 'u1' } as { id: string } | null,
}));
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/services/messages/MessageReactionsService', () => ({
  MessageReactionsService: {
    fetchReactions: mocks.fetch,
    addReaction: mocks.add,
    removeReaction: mocks.remove,
  },
}));
vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({ subscribeWithRetry: mocks.subscribe }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: mocks.channel } }));
vi.mock('@/hooks/useToast', () => ({ toast: mocks.toast }));
vi.mock('@/utils/logger', () => ({ errorLog: mocks.error }));
import { messageBoardKeys } from '../messageBoardKeys';
import { useMessageReactions } from '../useMessageReactions';

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};
const reaction = (id: string, user_id: string, emoji = '👍') => ({
  id,
  message_id: 'm1',
  user_id,
  emoji,
  created_at: '2026-01-01',
});
describe('useMessageReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'u1' };
    mocks.fetch.mockResolvedValue([]);
    mocks.on.mockReturnThis();
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.subscribe.mockReturnValue({ dispose: mocks.dispose });
  });
  it('fetches, groups counts, and marks the current user reaction', async () => {
    mocks.fetch.mockResolvedValue([reaction('1', 'u1'), reaction('2', 'u2')]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMessageReactions('m1'), { wrapper });
    await waitFor(() =>
      expect(result.current.reactionCounts).toEqual([
        { emoji: '👍', count: 2, users: ['u1', 'u2'], hasReacted: true },
      ])
    );
    expect(mocks.fetch).toHaveBeenCalledWith('m1');
  });
  it('merges realtime inserts, ignores duplicates, and applies deletes', async () => {
    const { client, wrapper } = setup();
    const { unmount } = renderHook(() => useMessageReactions('m1'), { wrapper });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
    const options = mocks.subscribe.mock.calls[0][0];
    options.build();
    const inserted = reaction('r1', 'u2');
    act(() => {
      mocks.on.mock.calls[0][2]({ new: inserted, old: {} });
      mocks.on.mock.calls[0][2]({ new: inserted, old: {} });
    });
    expect(client.getQueryData(messageBoardKeys.reactions('m1'))).toEqual([inserted]);
    act(() => mocks.on.mock.calls[1][2]({ old: inserted, new: {} }));
    expect(client.getQueryData(messageBoardKeys.reactions('m1'))).toEqual([]);
    options.onReconnect(true);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    options.onReconnect(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: messageBoardKeys.reactions('m1') });
    unmount();
    expect(mocks.dispose).toHaveBeenCalled();
  });
  it('shows a sign-in error without calling the service when signed out', async () => {
    mocks.user = null;
    const { wrapper } = setup();
    const { result } = renderHook(() => useMessageReactions('m1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.addReaction('👍');
    });
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Not signed in',
      description: 'You must be signed in to react to messages',
      variant: 'destructive',
    });
  });
  it('adds and removes reactions through the service', async () => {
    mocks.add.mockResolvedValue('server-id');
    mocks.remove.mockImplementation(() => Promise.resolve());
    mocks.fetch.mockResolvedValue([reaction('r1', 'u1')]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMessageReactions('m1'), { wrapper });
    await waitFor(() => expect(result.current.reactionCounts).toHaveLength(1));
    await act(async () => {
      await result.current.addReaction('🔥');
    });
    expect(mocks.add).toHaveBeenCalledWith('m1', 'u1', '🔥');
    await act(async () => {
      await result.current.removeReaction('r1');
    });
    expect(mocks.remove).toHaveBeenCalledWith('r1', 'u1');
  });
});
