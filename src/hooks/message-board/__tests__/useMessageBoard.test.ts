import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/types/reactions';

import { useMessageBoard } from '../useMessageBoard';

const mockFetchMessages = vi.fn();
const mockCreateMessage = vi.fn();
const mockUpdateMessage = vi.fn();
const mockDeleteMessage = vi.fn();
const mockToast = vi.fn();

let realtimeHandlers: {
  onMessageInserted: ((message: Message) => void) | null;
  onMessageUpdated: ((message: Message) => void) | null;
  onMessageDeleted: ((message: Message) => void) | null;
};

vi.mock('../useMessageApi', () => ({
  useMessageApi: () => ({
    fetchMessages: mockFetchMessages,
    createMessage: mockCreateMessage,
    updateMessage: mockUpdateMessage,
    deleteMessage: mockDeleteMessage,
  }),
}));

vi.mock('../useMessageRealtime', () => ({
  useMessageRealtime: (
    onMessageInserted: (message: Message) => void,
    onMessageUpdated: (message: Message) => void,
    onMessageDeleted: (message: Message) => void
  ) => {
    realtimeHandlers = { onMessageInserted, onMessageUpdated, onMessageDeleted };
  },
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (args: unknown) => mockToast(args),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

const baseMessage: Message = {
  id: 'm1',
  content: 'hello world',
  created_at: '2026-04-20T10:00:00.000Z',
  username: 'sam',
  team_name: null,
  user_id: 'u1',
  team_id: null,
  category: 'General',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMessageBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
    realtimeHandlers = { onMessageInserted: null, onMessageUpdated: null, onMessageDeleted: null };
  });

  it('loads initial messages and updates loading/success state', async () => {
    mockFetchMessages.mockResolvedValue([baseMessage]);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([baseMessage]);
    expect(mockFetchMessages).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, category: null, teamId: null, searchQuery: null }),
      expect.any(AbortSignal)
    );
  });

  it('surfaces fetch failure with error messaging', async () => {
    mockFetchMessages.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load messages');
  });

  it('uses filter changes to call API with new parameters after debounce', async () => {
    mockFetchMessages.mockResolvedValue([baseMessage]);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockFetchMessages.mockClear();

    act(() => {
      result.current.setFilter({ category: 'Question', searchQuery: 'help' });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    await waitFor(() => {
      expect(mockFetchMessages).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Question', searchQuery: 'help' }),
        expect.any(AbortSignal)
      );
    });
  });

  it('applies optimistic edit/delete and realtime inserts', async () => {
    mockFetchMessages.mockResolvedValue([baseMessage]);
    mockUpdateMessage.mockResolvedValue(true);
    mockDeleteMessage.mockImplementation(() => Promise.resolve());

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.editMessage('m1', 'updated');
    });
    await waitFor(() => expect(result.current.messages[0].content).toBe('updated'));
    expect(result.current.messages[0].is_edited).toBe(true);

    act(() => {
      realtimeHandlers.onMessageInserted?.({
        ...baseMessage,
        id: 'm2',
        content: 'brand new',
        created_at: '2026-04-21T10:00:00.000Z',
      });
    });
    await waitFor(() => expect(result.current.messages[0].id).toBe('m2'));

    await act(async () => {
      await result.current.deleteMessage('m2');
    });
    await waitFor(() => expect(result.current.messages.find((m) => m.id === 'm2')).toBeUndefined());
  });

  it('shows load-more toast on failure', async () => {
    mockFetchMessages
      .mockResolvedValueOnce(
        Array.from({ length: 10 }, (_, i) => ({ ...baseMessage, id: `m${i}` }))
      )
      .mockRejectedValueOnce(new Error('load more failed'));

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error loading messages', variant: 'destructive' })
    );
  });

  // A realtime message can land before the first fetch has filled the cache.
  // The optimistic page written there is gone now, so this guards what it used
  // to do for us: the message still arrives, held in the realtime buffer that
  // the fetch merges, and the fetch's own answer on pagination stands.
  it('does not lose a realtime message that beats the first fetch', async () => {
    let resolveFetch!: (messages: Message[]) => void;
    mockFetchMessages.mockImplementation(
      () =>
        new Promise<Message[]>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchMessages).toHaveBeenCalled());

    act(() => {
      realtimeHandlers.onMessageInserted?.({
        ...baseMessage,
        id: 'realtime-first',
        created_at: '2026-04-21T10:00:00.000Z',
      });
    });

    await act(async () => {
      resolveFetch(
        Array.from({ length: 10 }, (_, i) => ({
          ...baseMessage,
          id: `m${i}`,
          created_at: `2026-04-20T10:0${i}:00.000Z`,
        }))
      );
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.messages.some((m) => m.id === 'realtime-first')).toBe(true);
  });

  // The same race with a failing first load. The optimistic page also cleared
  // the error, so a board that had failed to load looked like a board holding
  // one message and nothing more.
  it('still reports a failed first load when a realtime message beats it', async () => {
    let rejectFetch!: (err: Error) => void;
    mockFetchMessages.mockImplementation(
      () =>
        new Promise<Message[]>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchMessages).toHaveBeenCalled());

    act(() => {
      realtimeHandlers.onMessageInserted?.({ ...baseMessage, id: 'realtime-first' });
    });

    await act(async () => {
      rejectFetch(new Error('network down'));
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to load messages'));
  });

  // Deleting every message on screen leaves no cursor to ask for older ones
  // with, so the board used to settle into an empty state while the server
  // still held more. Reload the first page instead.
  it('reloads the board when deletes empty a list the server has more of', async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      ...baseMessage,
      id: `m${i}`,
      created_at: `2026-04-20T10:0${i}:00.000Z`,
    }));
    mockFetchMessages.mockResolvedValue(firstPage);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    const olderPage = Array.from({ length: 10 }, (_, i) => ({
      ...baseMessage,
      id: `older-${i}`,
      created_at: `2026-04-19T10:0${i}:00.000Z`,
    }));
    mockFetchMessages.mockResolvedValue(olderPage);

    await act(async () => {
      firstPage.forEach((message) => realtimeHandlers.onMessageDeleted?.(message));
      await Promise.resolve();
    });

    // Newest first, so the reloaded page arrives in reverse of how it was built.
    await waitFor(() =>
      expect(result.current.messages.map((m) => m.id)).toEqual(olderPage.map((m) => m.id).reverse())
    );
    expect(result.current.hasMore).toBe(true);
  });

  // Re-categorising can empty the list just as deletes can: the message is
  // still there, it just no longer matches the filter. Same dead end, so the
  // same reload.
  it('reloads the board when an edit categorises the last message away', async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      ...baseMessage,
      id: `m${i}`,
      created_at: `2026-04-20T10:0${i}:00.000Z`,
    }));
    mockFetchMessages.mockResolvedValue(firstPage);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // A category has to be filtered on for re-categorising to exclude anything;
    // the default filter takes every category.
    act(() => {
      result.current.setFilter({ category: 'General' });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    const olderPage = Array.from({ length: 10 }, (_, i) => ({
      ...baseMessage,
      id: `older-${i}`,
      created_at: `2026-04-19T10:0${i}:00.000Z`,
    }));
    mockFetchMessages.mockResolvedValue(olderPage);

    // Every loaded message moves to a category the active filter excludes.
    await act(async () => {
      firstPage.forEach((message) =>
        realtimeHandlers.onMessageUpdated?.({ ...message, category: 'Question' })
      );
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(result.current.messages.map((m) => m.id)).toEqual(olderPage.map((m) => m.id).reverse())
    );
    expect(result.current.hasMore).toBe(true);
  });

  it('preserves load-more availability after realtime cache rewrites', async () => {
    mockFetchMessages.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        ...baseMessage,
        id: `m${i}`,
        created_at: `2026-04-20T10:0${i}:00.000Z`,
      }))
    );

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);

    act(() => {
      realtimeHandlers.onMessageInserted?.({
        ...baseMessage,
        id: 'new-message',
        created_at: '2026-04-21T10:00:00.000Z',
      });
    });
    await waitFor(() => expect(result.current.messages[0].id).toBe('new-message'));
    expect(result.current.hasMore).toBe(true);

    act(() => {
      realtimeHandlers.onMessageDeleted?.({ ...baseMessage, id: 'm9' });
    });
    await waitFor(() => expect(result.current.messages.find((m) => m.id === 'm9')).toBeUndefined());
    expect(result.current.hasMore).toBe(true);
  });
});
