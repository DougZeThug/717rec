import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUser,
  mockToast,
  mockChannel,
  mockDispose,
  subscribeOptions,
  mockFetchReactions,
  mockInsertReaction,
  mockDeleteReaction,
} = vi.hoisted(() => ({
  mockUser: { current: null as null | { id: string } },
  mockToast: vi.fn(),
  mockChannel: { on: vi.fn() },
  mockDispose: vi.fn(),
  subscribeOptions: {
    current: null as null | {
      label: string;
      build: () => unknown;
      onReconnect?: (isFirst: boolean) => void;
    },
  },
  mockFetchReactions: vi.fn(),
  mockInsertReaction: vi.fn(),
  mockDeleteReaction: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
}));

vi.mock('@/hooks/realtime/subscribeWithRetry', () => ({
  subscribeWithRetry: vi.fn((options) => {
    subscribeOptions.current = options;
    // Build the channel immediately so the postgres_changes handlers register.
    options.build();
    return { dispose: mockDispose };
  }),
}));

vi.mock('@/services/matches/MatchReactionsService', () => ({
  MatchReactionsService: {
    fetchReactions: mockFetchReactions,
    insertReaction: mockInsertReaction,
    deleteReaction: mockDeleteReaction,
  },
}));

vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

import { useMatchReactions } from '../useMatchReactions';

const reaction = (id: string, userId: string, emoji: string) => ({
  id,
  match_id: 'match-1',
  user_id: userId,
  emoji,
  created_at: '2026-06-24T00:00:00Z',
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMatchReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = null;
    subscribeOptions.current = null;
    mockChannel.on.mockReturnValue(mockChannel);
    mockFetchReactions.mockResolvedValue([]);
  });

  it('fetches reactions and groups them into sorted counts with hasReacted for the current user', async () => {
    mockUser.current = { id: 'user-1' };
    mockFetchReactions.mockResolvedValue([
      reaction('r1', 'user-1', '🔥'),
      reaction('r2', 'user-2', '👏'),
      reaction('r3', 'user-3', '👏'),
    ]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchReactions).toHaveBeenCalledWith('match-1');
    expect(result.current.reactions).toHaveLength(3);
    // Sorted by count descending: 👏 (2) before 🔥 (1)
    expect(result.current.reactionCounts).toEqual([
      { emoji: '👏', count: 2, users: ['user-2', 'user-3'], hasReacted: false },
      { emoji: '🔥', count: 1, users: ['user-1'], hasReacted: true },
    ]);
  });

  it('stops loading (with empty reactions) when the fetch fails', async () => {
    mockFetchReactions.mockRejectedValueOnce(new Error('database down'));

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reactions).toEqual([]);
  });

  it('applies realtime INSERT events, deduplicates by id, and applies DELETE events', async () => {
    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', filter: 'match_id=eq.match-1' }),
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'DELETE', filter: 'match_id=eq.match-1' }),
      expect.any(Function)
    );

    const insertHandler = mockChannel.on.mock.calls[0][2];
    const deleteHandler = mockChannel.on.mock.calls[1][2];

    act(() => {
      insertHandler({ new: reaction('r1', 'user-2', '🔥') });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    // Duplicate insert (same id) is ignored
    act(() => {
      insertHandler({ new: reaction('r1', 'user-2', '🔥') });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    act(() => {
      deleteHandler({ old: { id: 'r1' } });
    });
    await waitFor(() => expect(result.current.reactions).toEqual([]));
  });

  it('refetches on reconnect (but not on the first connection) and disposes on unmount', async () => {
    const { result, unmount } = renderHook(() => useMatchReactions('match-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const initialFetchCount = mockFetchReactions.mock.calls.length;

    act(() => {
      subscribeOptions.current?.onReconnect?.(true);
    });
    expect(mockFetchReactions.mock.calls.length).toBe(initialFetchCount);

    act(() => {
      subscribeOptions.current?.onReconnect?.(false);
    });
    await waitFor(() => expect(mockFetchReactions.mock.calls.length).toBe(initialFetchCount + 1));

    unmount();
    expect(mockDispose).toHaveBeenCalled();
  });

  it('preserves realtime INSERTs that arrive while a fetch is in flight', async () => {
    let resolveInitialFetch: ((value: unknown[]) => void) | undefined;
    const initialFetchPromise = new Promise<unknown[]>((resolve) => {
      resolveInitialFetch = resolve;
    });
    mockFetchReactions.mockReturnValueOnce(initialFetchPromise);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });

    const insertHandler = mockChannel.on.mock.calls[0][2];

    act(() => {
      insertHandler({ new: reaction('realtime-insert', 'user-99', '🔥') });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    const fetchedData = [reaction('existing-1', 'user-50', '👏')];
    await act(async () => {
      resolveInitialFetch?.(fetchedData);
      await initialFetchPromise;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reactions).toHaveLength(2);
  });

  it('does not reintroduce reactions deleted while a reconnect fetch is in flight', async () => {
    mockFetchReactions.mockResolvedValueOnce([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reactions).toHaveLength(1);

    const deleteHandler = mockChannel.on.mock.calls[1][2];

    let resolveReconnectFetch: ((value: unknown[]) => void) | undefined;
    const reconnectFetchPromise = new Promise<unknown[]>((resolve) => {
      resolveReconnectFetch = resolve;
    });
    mockFetchReactions.mockReturnValueOnce(reconnectFetchPromise);

    act(() => {
      subscribeOptions.current?.onReconnect?.(false);
    });

    act(() => {
      deleteHandler({ old: { id: 'r1' } });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    const staleFetchedData = [reaction('r1', 'user-1', '🔥')];
    await act(async () => {
      resolveReconnectFetch?.(staleFetchedData);
      await reconnectFetchPromise;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reactions).toHaveLength(0);
  });

  // A row that goes away while this client is offline sends no DELETE event, so
  // nothing takes it out of the inserts buffer. The buffer was cleared only when
  // matchId changed, so the phantom was re-applied on every later refetch --
  // even one that read an empty table.
  it('drops a realtime reaction the server no longer reports after a reconnect', async () => {
    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: reaction('r1', 'user-2', '🔥') });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    mockFetchReactions.mockResolvedValue([]);
    act(() => {
      subscribeOptions.current?.onReconnect?.(false);
    });

    await waitFor(() => expect(result.current.reactions).toHaveLength(0));
  });

  // A tombstone only has to bridge the fetch that was already in flight. After
  // that the server decides, or a row deleted once stays hidden for the life of
  // the hook even after somebody reacts again.
  it('stops applying a delete tombstone after one refetch has used it', async () => {
    mockFetchReactions.mockResolvedValueOnce([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    const deleteHandler = mockChannel.on.mock.calls[1][2];
    act(() => {
      deleteHandler({ old: { id: 'r1' } });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    // This refetch still hides r1: the tombstone was set before it began. The
    // second row proves the fetch really landed.
    mockFetchReactions.mockResolvedValueOnce([
      reaction('r1', 'user-1', '🔥'),
      reaction('r2', 'user-2', '👏'),
    ]);
    act(() => {
      subscribeOptions.current?.onReconnect?.(false);
    });
    await waitFor(() => expect(result.current.reactions.map((r) => r.id)).toEqual(['r2']));

    // The next one must show what the server reports.
    mockFetchReactions.mockResolvedValue([
      reaction('r1', 'user-1', '🔥'),
      reaction('r2', 'user-2', '👏'),
    ]);
    act(() => {
      subscribeOptions.current?.onReconnect?.(false);
    });
    await waitFor(() => expect(result.current.reactions.map((r) => r.id)).toEqual(['r1', 'r2']));
  });

  it('does not put back a row that is already marked deleted', async () => {
    mockFetchReactions.mockResolvedValueOnce([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    const insertHandler = mockChannel.on.mock.calls[0][2];
    const deleteHandler = mockChannel.on.mock.calls[1][2];

    act(() => {
      deleteHandler({ old: { id: 'r1' } });
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    // A delayed INSERT for the same row lands after it has gone.
    act(() => {
      insertHandler({ new: reaction('r1', 'user-1', '🔥') });
    });
    // The cache notifies on a scheduled task, so give it one before asserting.
    // Without this the assertion reads the value from before the event and
    // passes whether or not the row came back.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.reactions).toHaveLength(0);
  });

  // Supabase sends only the replica-identity columns, so `old` can arrive with
  // no id. Guarding it keeps undefined out of the reconciliation buffers.
  it('ignores a delete event that carries no id', async () => {
    mockFetchReactions.mockResolvedValueOnce([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    const deleteHandler = mockChannel.on.mock.calls[1][2];
    act(() => {
      deleteHandler({ old: {} });
    });

    expect(result.current.reactions).toHaveLength(1);
  });

  // A tombstone that only bridges the one fetch already in flight is not
  // enough for a delete that has been issued and has not committed: the server
  // still reports the row, so a second refetch landing in that window put back
  // a reaction the reader had turned off.
  it('keeps a row hidden across more than one refetch while its delete is in flight', async () => {
    mockUser.current = { id: 'user-1' };
    const saved = reaction('saved-1', 'user-1', '🔥');

    let resolveInsert!: () => void;
    mockInsertReaction.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        })
    );
    let resolveDelete!: () => void;
    mockDeleteReaction.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstTap: Promise<void> | undefined;
    act(() => {
      firstTap = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions[0]?.id).toMatch(/^optimistic-/));

    // Tap off while the insert is still on its way: the removal is deferred.
    await act(async () => {
      await result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    // The row is in the table from here on, and the delete does not commit.
    mockFetchReactions.mockResolvedValue([saved]);
    act(() => {
      resolveInsert();
    });
    await waitFor(() => expect(mockDeleteReaction).toHaveBeenCalledWith('saved-1', 'user-1'));

    // Two refetches land inside that window.
    for (let i = 0; i < 2; i += 1) {
      act(() => {
        subscribeOptions.current?.onReconnect?.(false);
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    expect(result.current.reactions).toHaveLength(0);

    await act(async () => {
      resolveDelete();
      await firstTap;
    });
  });

  it('blocks toggling a reaction when signed out', async () => {
    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Not signed in' }));
    expect(mockInsertReaction).not.toHaveBeenCalled();
    expect(mockDeleteReaction).not.toHaveBeenCalled();
  });

  it('adds a new reaction when the user has not reacted with that emoji', async () => {
    mockUser.current = { id: 'user-1' };
    mockFetchReactions.mockResolvedValue([reaction('r1', 'user-1', '👏')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockInsertReaction).toHaveBeenCalledWith('match-1', 'user-1', '🔥');
    expect(mockDeleteReaction).not.toHaveBeenCalled();
  });

  it('replaces optimistic reactions when realtime sends the saved row', async () => {
    mockUser.current = { id: 'user-1' };
    let resolveInsert!: () => void;
    mockInsertReaction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        })
    );

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let togglePromise: Promise<void> | undefined;
    act(() => {
      togglePromise = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));
    expect(result.current.reactions[0].id).toMatch(/^optimistic-/);

    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: reaction('real-reaction', 'user-1', '🔥') });
    });

    await waitFor(() => expect(result.current.reactions).toHaveLength(1));
    expect(result.current.reactions[0].id).toBe('real-reaction');

    act(() => {
      resolveInsert();
    });
    await togglePromise;
  });

  // On, off, on again, faster than the first insert can land. The third tap
  // cancels the second tap's cancellation, so the reader is asking for the
  // reaction the first tap is already inserting. Queueing a fresh toggle for it
  // let that toggle decide its own direction later -- by which time the realtime
  // row for the first tap had arrived -- so it read "it's on" and deleted the
  // row the reader had just asked to keep.
  it('does not delete the reaction a third tap asked to keep', async () => {
    mockUser.current = { id: 'user-1' };
    let resolveInsert!: () => void;
    mockInsertReaction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        })
    );
    mockDeleteReaction.mockImplementation(() => Promise.resolve());

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstTap: Promise<void> | undefined;
    act(() => {
      firstTap = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions[0]?.id).toMatch(/^optimistic-/));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    let thirdTap: Promise<void> | undefined;
    act(() => {
      thirdTap = result.current.toggleReaction('🔥');
    });

    // The first tap's row arrives over realtime. The cache holds it either way,
    // so what follows turns only on whether a toggle was queued behind it.
    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: reaction('real-1', 'user-1', '🔥') });
    });
    await waitFor(() => expect(result.current.reactions[0].id).toBe('real-1'));

    // Now the insert finally lands and anything queued behind it runs.
    mockFetchReactions.mockResolvedValue([reaction('real-1', 'user-1', '🔥')]);
    await act(async () => {
      resolveInsert();
      await firstTap;
      await thirdTap;
    });

    expect(mockDeleteReaction).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));
    expect(result.current.reactionCounts[0]).toMatchObject({ emoji: '🔥', hasReacted: true });
  });

  // Tapping on then straight off again defers the removal until the insert has
  // landed. The deferred removal tombstones the new row before deleting it, and
  // a tombstone left behind by a failed delete made the next refetch hide a row
  // that is still in the table: no reaction for this reader, one for everybody
  // else.
  it('keeps a reaction that a failed clean-up left in the table', async () => {
    mockUser.current = { id: 'user-1' };
    let resolveInsert!: () => void;
    mockInsertReaction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        })
    );
    mockDeleteReaction.mockRejectedValue(new Error('delete refused'));

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstTap: Promise<void> | undefined;
    act(() => {
      firstTap = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions[0]?.id).toMatch(/^optimistic-/));

    // Tapping off while the insert is in flight only marks the optimistic row
    // for removal; nothing is sent.
    await act(async () => {
      await result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    // The insert lands, the deferred clean-up delete fails, and the row stays.
    mockFetchReactions.mockResolvedValue([reaction('real-1', 'user-1', '🔥')]);
    await act(async () => {
      resolveInsert();
      await firstTap;
    });

    await waitFor(() => expect(result.current.reactions).toHaveLength(1));
    expect(result.current.reactions[0].id).toBe('real-1');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to remove reaction. Please try again.',
      variant: 'destructive',
    });
  });

  it('does not send optimistic ids to delete when a pending reaction is toggled off', async () => {
    mockUser.current = { id: 'user-1' };
    let resolveInsert!: () => void;
    mockInsertReaction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        })
    );
    mockDeleteReaction.mockImplementation(() => Promise.resolve());

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let togglePromise: Promise<void> | undefined;
    act(() => {
      togglePromise = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions[0].id).toMatch(/^optimistic-/));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockDeleteReaction).not.toHaveBeenCalledWith(
      expect.stringMatching(/^optimistic-/),
      'user-1'
    );
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: reaction('real-reaction', 'user-1', '🔥') });
    });

    // The clean-up delete is queued behind the insert that is still in flight,
    // so let that finish before looking for it. Until B-68 it went straight
    // out, which is what let it overtake a later tap's upsert.
    act(() => {
      resolveInsert();
    });
    await togglePromise;

    await waitFor(() => expect(mockDeleteReaction).toHaveBeenCalledWith('real-reaction', 'user-1'));
    expect(result.current.reactions).toHaveLength(0);
  });

  // Tap on, off, then on again, all before the first insert's row comes back.
  // The realtime echo makes the hook send a clean-up delete for that row. That
  // delete used to go out unqueued while the third tap's insert was queued, so
  // both could be in flight together: insertReaction is an upsert, so it
  // matched the row still sitting there and the delete then removed it. The
  // reader's last tap was lost with no error.
  it('queues the clean-up delete behind the taps for the same emoji', async () => {
    mockUser.current = { id: 'user-1' };

    // Once, not permanently: vi.clearAllMocks() resets calls but keeps
    // implementations, so a held-open promise here would hang later tests.
    let resolveFirstInsert!: () => void;
    mockInsertReaction
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstInsert = resolve;
          })
      )
      .mockResolvedValueOnce(undefined);

    let resolveDelete!: () => void;
    mockDeleteReaction.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstTap: Promise<void> | undefined;
    act(() => {
      firstTap = result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions[0]?.id).toMatch(/^optimistic-/));

    // Tap off while the insert is still on its way: nothing is sent yet.
    await act(async () => {
      await result.current.toggleReaction('🔥');
    });
    await waitFor(() => expect(result.current.reactions).toHaveLength(0));

    // The first tap's row arrives, so the hook must clean it up.
    const insertHandler = mockChannel.on.mock.calls[0][2];
    act(() => {
      insertHandler({ new: reaction('real-1', 'user-1', '🔥') });
    });

    // Tap on again, then let the first insert finish.
    let thirdTap: Promise<void> | undefined;
    act(() => {
      thirdTap = result.current.toggleReaction('🔥');
    });
    await act(async () => {
      resolveFirstInsert();
      await firstTap;
    });
    await waitFor(() => expect(mockDeleteReaction).toHaveBeenCalledWith('real-1', 'user-1'));

    // The delete is still in flight, so the third tap's insert must wait on it.
    expect(mockInsertReaction).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete();
      await thirdTap;
    });

    expect(mockInsertReaction).toHaveBeenCalledTimes(2);
    expect(mockDeleteReaction).toHaveBeenCalledTimes(1);
  });

  it('removes an existing reaction when the user toggles the same emoji', async () => {
    mockUser.current = { id: 'user-1' };
    mockFetchReactions.mockResolvedValue([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockDeleteReaction).toHaveBeenCalledWith('r1', 'user-1');
    expect(mockInsertReaction).not.toHaveBeenCalled();
  });

  it('ignores an empty emoji', async () => {
    mockUser.current = { id: 'user-1' };
    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('');
    });

    expect(mockInsertReaction).not.toHaveBeenCalled();
    expect(mockDeleteReaction).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows an error toast when toggling fails', async () => {
    mockUser.current = { id: 'user-1' };
    mockInsertReaction.mockRejectedValue(new Error('insert failed'));

    const { result } = renderHook(() => useMatchReactions('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to update reaction. Please try again.',
      })
    );
  });
});
