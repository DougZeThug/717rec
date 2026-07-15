import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchComments } from '../useMatchComments';

const {
  mockUser,
  mockToast,
  mockChannel,
  mockFetchComments,
  mockFetchAuthor,
  mockAddComment,
  mockDeleteComment,
} = vi.hoisted(() => ({
  mockUser: {
    current: null as null | { id: string; email?: string; user_metadata?: Record<string, string> },
  },
  mockToast: vi.fn(),
  mockChannel: {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
  mockFetchComments: vi.fn(),
  mockFetchAuthor: vi.fn(),
  mockAddComment: vi.fn(),
  mockDeleteComment: vi.fn(),
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
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/matches/MatchCommentsService', () => ({
  MatchCommentsService: {
    fetchComments: mockFetchComments,
    fetchCommentAuthorInfo: mockFetchAuthor,
    addComment: mockAddComment,
    deleteComment: mockDeleteComment,
  },
}));

vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));

import { supabase } from '@/integrations/supabase/client';

const comment = {
  id: 'comment-1',
  match_id: 'match-1',
  user_id: 'user-1',
  username: 'Player One',
  team_name: 'Aces',
  content: 'Great match',
  created_at: '2026-06-24T00:00:00Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMatchComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = null;
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockFetchComments.mockResolvedValue([comment]);
  });

  it('loads comments and wires realtime inserts and deletes for the current match', async () => {
    const { result, unmount } = renderHook(() => useMatchComments('match-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toEqual([comment]);
    expect(mockFetchComments).toHaveBeenCalledWith('match-1');
    expect(supabase.channel).toHaveBeenCalledWith(
      expect.stringMatching(/^match-comments-match-1-/)
    );
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
    act(() => {
      insertHandler({ new: { ...comment, id: 'comment-2', content: 'Rematch?' } });
    });
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    const deleteHandler = mockChannel.on.mock.calls[1][2];
    act(() => {
      deleteHandler({ old: { id: 'comment-1' } });
    });
    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(['comment-2']));

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('surfaces fetch failures without leaving the hook loading', async () => {
    mockFetchComments.mockRejectedValueOnce(new Error('database down'));

    const { result } = renderHook(() => useMatchComments('match-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load comments');
    expect(result.current.comments).toEqual([]);
  });

  it('blocks signed-out and blank comments before calling the service', async () => {
    const { result } = renderHook(() => useMatchComments('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.addComment('hello')).resolves.toBeNull();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Not signed in' }));

    mockUser.current = { id: 'user-1', email: 'fallback@example.com', user_metadata: {} };
    const { result: signedInResult } = renderHook(() => useMatchComments('match-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(signedInResult.current.isLoading).toBe(false));

    await expect(signedInResult.current.addComment('   ')).resolves.toBeNull();
    expect(mockAddComment).not.toHaveBeenCalled();
  });

  it('trims comments, derives author information, and returns added comment data', async () => {
    mockUser.current = { id: 'user-1', email: 'fallback@example.com', user_metadata: {} };
    mockFetchAuthor.mockResolvedValue({ username: null, teamName: 'Aces' });
    mockAddComment.mockResolvedValue({ ...comment, content: 'Nice shot' });

    const { result } = renderHook(() => useMatchComments('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.addComment('  Nice shot  ')).resolves.toEqual({
      ...comment,
      content: 'Nice shot',
    });

    expect(mockAddComment).toHaveBeenCalledWith('match-1', {
      user_id: 'user-1',
      username: 'fallback',
      team_name: 'Aces',
      content: 'Nice shot',
    });
  });

  it('removes a deleted comment locally and returns false on delete failures', async () => {
    mockUser.current = { id: 'user-1' };
    mockFetchComments.mockResolvedValueOnce([comment]).mockResolvedValue([]);
    const { result } = renderHook(() => useMatchComments('match-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    let deleteResult = false;
    await act(async () => {
      deleteResult = await result.current.deleteComment('comment-1');
    });

    expect(deleteResult).toBe(true);
    expect(mockDeleteComment).toHaveBeenCalledWith('comment-1', 'user-1');
    await waitFor(() => expect(result.current.comments).toEqual([]));

    mockDeleteComment.mockRejectedValueOnce(new Error('not allowed'));
    await act(async () => {
      deleteResult = await result.current.deleteComment('comment-2');
    });

    expect(deleteResult).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
  });
});
