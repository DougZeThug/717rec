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
      expect.objectContaining({ limit: 10, category: null, teamId: null, searchQuery: null })
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
        expect.objectContaining({ category: 'Question', searchQuery: 'help' })
      );
    });
  });

  it('applies optimistic edit/delete and realtime inserts', async () => {
    mockFetchMessages.mockResolvedValue([baseMessage]);
    mockUpdateMessage.mockResolvedValue(true);
    mockDeleteMessage.mockResolvedValue();

    const { result } = renderHook(() => useMessageBoard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.editMessage('m1', 'updated');
    });
    expect(result.current.messages[0].content).toBe('updated');
    expect(result.current.messages[0].is_edited).toBe(true);

    act(() => {
      realtimeHandlers.onMessageInserted?.({
        ...baseMessage,
        id: 'm2',
        content: 'brand new',
        created_at: '2026-04-21T10:00:00.000Z',
      });
    });
    expect(result.current.messages[0].id).toBe('m2');

    await act(async () => {
      await result.current.deleteMessage('m2');
    });
    expect(result.current.messages.find((m) => m.id === 'm2')).toBeUndefined();
  });

  it('shows load-more toast on failure', async () => {
    mockFetchMessages
      .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({ ...baseMessage, id: `m${i}` })))
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
});
