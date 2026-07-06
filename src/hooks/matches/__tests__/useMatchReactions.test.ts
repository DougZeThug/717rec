import { act, renderHook, waitFor } from '@testing-library/react';
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

    const { result } = renderHook(() => useMatchReactions('match-1'));

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

    const { result } = renderHook(() => useMatchReactions('match-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reactions).toEqual([]);
  });

  it('applies realtime INSERT events, deduplicates by id, and applies DELETE events', async () => {
    const { result } = renderHook(() => useMatchReactions('match-1'));
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
    expect(result.current.reactions).toHaveLength(1);

    // Duplicate insert (same id) is ignored
    act(() => {
      insertHandler({ new: reaction('r1', 'user-2', '🔥') });
    });
    expect(result.current.reactions).toHaveLength(1);

    act(() => {
      deleteHandler({ old: { id: 'r1' } });
    });
    expect(result.current.reactions).toEqual([]);
  });

  it('refetches on reconnect (but not on the first connection) and disposes on unmount', async () => {
    const { result, unmount } = renderHook(() => useMatchReactions('match-1'));
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

  it('blocks toggling a reaction when signed out', async () => {
    const { result } = renderHook(() => useMatchReactions('match-1'));
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

    const { result } = renderHook(() => useMatchReactions('match-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockInsertReaction).toHaveBeenCalledWith('match-1', 'user-1', '🔥');
    expect(mockDeleteReaction).not.toHaveBeenCalled();
  });

  it('removes an existing reaction when the user toggles the same emoji', async () => {
    mockUser.current = { id: 'user-1' };
    mockFetchReactions.mockResolvedValue([reaction('r1', 'user-1', '🔥')]);

    const { result } = renderHook(() => useMatchReactions('match-1'));
    await waitFor(() => expect(result.current.reactions).toHaveLength(1));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockDeleteReaction).toHaveBeenCalledWith('r1', 'user-1');
    expect(mockInsertReaction).not.toHaveBeenCalled();
  });

  it('ignores an empty emoji', async () => {
    mockUser.current = { id: 'user-1' };
    const { result } = renderHook(() => useMatchReactions('match-1'));
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

    const { result } = renderHook(() => useMatchReactions('match-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleReaction('🔥');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', description: 'Failed to update reaction' })
    );
  });
});
