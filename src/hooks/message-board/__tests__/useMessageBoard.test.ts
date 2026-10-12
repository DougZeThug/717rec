import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Message } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

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

const createWrapper = (
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
) => {
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

  it('shows a realtime message the server search would return for a % search', async () => {
    mockFetchMessages.mockResolvedValue([]);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilter({ searchQuery: '100%' });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The server runs ILIKE '%100%%', where % is a wildcard, so this matches.
    act(() => {
      realtimeHandlers.onMessageInserted?.({
        ...baseMessage,
        id: 'm2',
        content: 'I scored 100 points',
        created_at: '2026-04-21T10:00:00.000Z',
      });
    });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m2']));
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

  // The feed stops its automatic retry on this flag, so it has to be set by a
  // failed page fetch and cleared by the next good one.
  it('flags a failed load-more and clears the flag when a retry succeeds', async () => {
    mockFetchMessages
      .mockResolvedValueOnce(
        Array.from({ length: 10 }, (_, i) => ({ ...baseMessage, id: `m${i}` }))
      )
      .mockRejectedValueOnce(new Error('load more failed'))
      .mockResolvedValueOnce([{ ...baseMessage, id: 'older' }]);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadMoreError).toBe(false);

    await act(async () => {
      await result.current.loadMoreMessages();
    });
    await waitFor(() => expect(result.current.loadMoreError).toBe(true));
    expect(result.current.messages).toHaveLength(10);

    await act(async () => {
      await result.current.loadMoreMessages();
    });
    await waitFor(() => expect(result.current.loadMoreError).toBe(false));
    expect(result.current.messages).toHaveLength(11);
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

  // The other half of the same handler: an edit that still matches the filter
  // replaces the message where it sits, rather than removing it.
  it('shows an edit in place when the message still matches the filter', async () => {
    mockFetchMessages.mockResolvedValue([baseMessage]);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      realtimeHandlers.onMessageUpdated?.({ ...baseMessage, content: 'hello, edited' });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0]).toMatchObject({
      id: 'm1',
      content: 'hello, edited',
    });
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

  // An edit to a message the reader has not paged down to yet used to be
  // spliced in below the oldest one on screen. It then became the cursor for
  // "older than", so the next page started below it and every message in
  // between was never asked for, and never seen.
  const tenMessages = () =>
    Array.from({ length: 10 }, (_, i) => ({
      ...baseMessage,
      id: `m${i}`,
      created_at: `2026-04-20T10:0${i}:00.000Z`,
    }));

  /** Older than anything on screen, and it matches the empty filters. */
  const ancientEdit: Message = {
    ...baseMessage,
    id: 'ancient',
    content: 'edited long after the fact',
    created_at: '2026-04-13T10:00:00.000Z',
  };

  it('keeps the load-more cursor when an edit arrives for an older message', async () => {
    mockFetchMessages.mockResolvedValue(tenMessages());

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      realtimeHandlers.onMessageUpdated?.(ancientEdit);
      await Promise.resolve();
    });

    // It waits in the realtime buffer for the page that reaches it, rather
    // than sitting under a list it does not belong to the bottom of.
    expect(result.current.messages.some((m) => m.id === 'ancient')).toBe(false);

    mockFetchMessages.mockClear();
    mockFetchMessages.mockResolvedValue([]);
    await act(async () => {
      await result.current.loadMoreMessages();
    });

    // m0 is the oldest the league returned, so it is still the cursor.
    expect(mockFetchMessages).toHaveBeenCalledWith(
      expect.objectContaining({ olderThan: '2026-04-20T10:00:00.000Z' }),
      expect.any(AbortSignal)
    );
  });

  // The same bug through the other door: a refetch of the first page merges
  // the whole realtime buffer, and this query refetches on every mount and
  // every time the tab regains focus.
  it('keeps the load-more cursor when a refresh merges the realtime buffer', async () => {
    mockFetchMessages.mockResolvedValue(tenMessages());

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      realtimeHandlers.onMessageUpdated?.(ancientEdit);
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.refreshMessages();
    });

    expect(result.current.messages.some((m) => m.id === 'ancient')).toBe(false);

    mockFetchMessages.mockClear();
    mockFetchMessages.mockResolvedValue([]);
    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(mockFetchMessages).toHaveBeenCalledWith(
      expect.objectContaining({ olderThan: '2026-04-20T10:00:00.000Z' }),
      expect.any(AbortSignal)
    );
  });

  it('starts from the filters saved in this browser session', async () => {
    sessionStorage.setItem(
      'messageBoardFilters',
      JSON.stringify({ category: 'Question', teamId: null, searchQuery: 'help' })
    );
    mockFetchMessages.mockResolvedValue([]);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });

    expect(result.current.filterOptions).toEqual({
      category: 'Question',
      teamId: null,
      searchQuery: 'help',
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchMessages).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Question', searchQuery: 'help' }),
      expect.any(AbortSignal)
    );
  });

  it('falls back to empty filters when the saved filters are corrupt', async () => {
    sessionStorage.setItem('messageBoardFilters', '{not json');
    mockFetchMessages.mockResolvedValue([]);

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });

    expect(result.current.filterOptions).toEqual({
      category: null,
      teamId: null,
      searchQuery: null,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  describe('postMessage', () => {
    it('sends the text in the General category by default', async () => {
      mockFetchMessages.mockResolvedValue([]);
      mockCreateMessage.mockResolvedValue(undefined);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.postMessage('see you at 7');
      });

      expect(mockCreateMessage).toHaveBeenCalledWith('see you at 7', 'General');
      expect(errorLog).not.toHaveBeenCalled();
    });

    it('logs the failure and re-throws it so the caller keeps the typed text', async () => {
      const failure = new Error('insert failed');
      mockFetchMessages.mockResolvedValue([]);
      mockCreateMessage.mockRejectedValue(failure);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await expect(result.current.postMessage('lost?', 'Question')).rejects.toBe(failure);
      });

      expect(mockCreateMessage).toHaveBeenCalledWith('lost?', 'Question');
      expect(errorLog).toHaveBeenCalledWith('Error posting message:', failure);
    });
  });

  it('re-throws a failed edit and leaves the message unchanged', async () => {
    const failure = new Error('update failed');
    mockFetchMessages.mockResolvedValue([baseMessage]);
    mockUpdateMessage.mockRejectedValue(failure);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.editMessage('m1', 'edited')).rejects.toBe(failure);
    });

    expect(errorLog).toHaveBeenCalledWith('Error updating message:', failure);
    expect(result.current.messages).toEqual([baseMessage]);
  });

  it('keeps the message and does not throw when a delete fails', async () => {
    const failure = new Error('delete failed');
    mockFetchMessages.mockResolvedValue([baseMessage]);
    mockDeleteMessage.mockRejectedValue(failure);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteMessage('m1');
    });

    expect(errorLog).toHaveBeenCalledWith('Error deleting message:', failure);
    expect(result.current.messages).toEqual([baseMessage]);
  });

  it('logs a failed reload when deletes empty a list the server has more of', async () => {
    const reloadFailure = new Error('reload failed');
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(reloadFailure);
    const firstPage = tenMessages();
    mockFetchMessages.mockResolvedValue(firstPage);

    const { result } = renderHook(() => useMessageBoard(), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      firstPage.forEach((message) => realtimeHandlers.onMessageDeleted?.(message));
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(errorLog).toHaveBeenCalledWith(
        'Error reloading the message board after it emptied:',
        reloadFailure
      )
    );
    expect(invalidate).toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it('puts a realtime edit of an unseen, newer message at the top of the list', async () => {
    const newer: Message = { ...baseMessage, id: 'm2', created_at: '2026-04-21T10:00:00.000Z' };
    mockFetchMessages.mockResolvedValue([baseMessage]);
    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      realtimeHandlers.onMessageUpdated?.(newer);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m2', 'm1']));
  });

  describe('realtime buffers', () => {
    it('drops a buffered message that no longer matches the filter when a fetch merges it', async () => {
      mockFetchMessages.mockResolvedValue([baseMessage]);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // A realtime event handled by the pre-filter-change render lands in the
      // buffer after the filter change has already cleared it.
      const staleInsert = realtimeHandlers.onMessageInserted;
      let resolveFetch!: (messages: Message[]) => void;
      mockFetchMessages.mockImplementation(
        () =>
          new Promise<Message[]>((resolve) => {
            resolveFetch = resolve;
          })
      );
      act(() => {
        result.current.setFilter({ category: 'Question' });
      });
      await waitFor(() =>
        expect(mockFetchMessages).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'Question' }),
          expect.any(AbortSignal)
        )
      );

      const stale: Message = { ...baseMessage, id: 'stale', category: 'General' };
      act(() => {
        staleInsert?.(stale);
      });
      const question: Message = { ...baseMessage, id: 'q1', category: 'Question' };
      await act(async () => {
        resolveFetch([question, stale]);
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['q1']));
    });

    it('forgets a buffered message once the server page carries it', async () => {
      const arrived: Message = { ...baseMessage, id: 'm2', created_at: '2026-04-21T10:00:00.000Z' };
      mockFetchMessages.mockResolvedValue([baseMessage]);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        realtimeHandlers.onMessageInserted?.(arrived);
      });
      await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m2', 'm1']));

      // The server now returns it, so the buffer has done its job.
      mockFetchMessages.mockResolvedValue([arrived, baseMessage]);
      await act(async () => {
        await result.current.refreshMessages();
      });
      await waitFor(() => expect(mockFetchMessages).toHaveBeenCalledTimes(2));
      expect(result.current.messages.map((m) => m.id)).toEqual(['m2', 'm1']);

      // Gone on the server (deleted elsewhere): a kept buffer entry would bring it back.
      mockFetchMessages.mockResolvedValue([baseMessage]);
      await act(async () => {
        await result.current.refreshMessages();
      });
      await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m1']));
    });

    it('keeps only the newest 100 buffered inserts', async () => {
      mockFetchMessages.mockResolvedValue([]);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // m000 is the oldest, m104 the newest.
      act(() => {
        for (let i = 0; i < 105; i++) {
          realtimeHandlers.onMessageInserted?.({
            ...baseMessage,
            id: `m${String(i).padStart(3, '0')}`,
            created_at: new Date(Date.UTC(2026, 4, 1, 10, 0, i)).toISOString(),
          });
        }
      });

      // A refresh that finds one old message on the server shows the buffer
      // that was kept next to it. Unpruned, it would hold all 105.
      mockFetchMessages.mockResolvedValue([baseMessage]);
      await act(async () => {
        await result.current.refreshMessages();
      });

      await waitFor(() => expect(result.current.messages.at(-1)?.id).toBe('m1'));
      const ids = result.current.messages.map((m) => m.id);
      expect(ids).toHaveLength(101);
      expect(ids[0]).toBe('m104');
      expect(ids).not.toContain('m000');
      expect(ids).not.toContain('m004');
      expect(ids).toContain('m005');
    });

    it('keeps only the newest 100 delete markers', async () => {
      mockFetchMessages.mockResolvedValue([baseMessage]);
      const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const gone = (i: number): Message => ({
        ...baseMessage,
        id: `gone-${i}`,
        created_at: `2026-04-19T10:00:00.${String(i).padStart(3, '0')}Z`,
      });
      act(() => {
        for (let i = 0; i < 105; i++) realtimeHandlers.onMessageDeleted?.(gone(i));
      });

      // The server still lists three of them. The oldest marker was pushed out
      // (gone-0 comes back); a recent one still hides its message (gone-104).
      mockFetchMessages.mockResolvedValue([baseMessage, gone(0), gone(104)]);
      await act(async () => {
        await result.current.refreshMessages();
      });

      await waitFor(() => expect(result.current.messages.map((m) => m.id)).toContain('gone-0'));
      const ids = result.current.messages.map((m) => m.id);
      expect(ids).toContain('m1');
      expect(ids).not.toContain('gone-104');
    });
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
