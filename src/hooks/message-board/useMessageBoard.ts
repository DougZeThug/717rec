import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from '@/hooks/useToast';
import type { Message, MessageCategory } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

import { messageBoardKeys } from './messageBoardKeys';
import type { FilterOptions, UseMessageBoardResult } from './types';
import { useMessageApi } from './useMessageApi';
import { useMessageRealtime } from './useMessageRealtime';

const PAGE_SIZE = 10;
const MAX_MESSAGES_IN_STATE = 100;
const MESSAGE_FILTER_KEY = 'messageBoardFilters';
const EMPTY_MESSAGES: Message[] = [];
type MessagePage = Message[] & { hasMore?: boolean };
type MessagePages = InfiniteData<MessagePage, string | undefined>;

/** Attach server-pagination metadata to a message page without changing array behavior. */
const toMessagePage = (messages: Message[], hasMore = messages.length === PAGE_SIZE): MessagePage =>
  Object.assign([...messages], { hasMore });

/** Split a flat, newest-first message list into infinite-query page records. */
const buildMessagePages = (messages: Message[], hasMore?: boolean): MessagePages => {
  const pages: MessagePage[] = [];
  for (let index = 0; index < messages.length; index += PAGE_SIZE) {
    const isLastPage = index + PAGE_SIZE >= messages.length;
    pages.push(
      toMessagePage(messages.slice(index, index + PAGE_SIZE), isLastPage ? hasMore : true)
    );
  }
  return {
    pages: pages.length > 0 ? pages : [toMessagePage([], false)],
    pageParams: pages.map((_, index) =>
      index === 0 ? undefined : pages[index - 1]?.at(-1)?.created_at
    ),
  };
};

// Helper to load persisted filters
const loadPersistedFilters = (): FilterOptions => {
  try {
    const saved = sessionStorage.getItem(MESSAGE_FILTER_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return { category: null, teamId: null, searchQuery: null };
};

/** Manage message-board filters, pagination, mutations, and realtime cache patches. */
export const useMessageBoard = (): UseMessageBoardResult => {
  const queryClient = useQueryClient();
  // Filter state - initialize from sessionStorage
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(loadPersistedFilters);

  const {
    fetchMessages,
    createMessage,
    updateMessage: apiUpdateMessage,
    deleteMessage: apiDeleteMessage,
  } = useMessageApi();

  const baseOptions = useMemo(
    () => ({
      limit: PAGE_SIZE,
      category: filterOptions.category,
      teamId: filterOptions.teamId,
      searchQuery: filterOptions.searchQuery,
    }),
    [filterOptions.category, filterOptions.teamId, filterOptions.searchQuery]
  );
  const queryKey = useMemo(() => messageBoardKeys.messages(baseOptions), [baseOptions]);
  const realtimeMessagesRef = useRef<Map<string, Message>>(new Map());
  const realtimeDeletesRef = useRef<Set<string>>(new Set());

  const messageMatchesFilters = useCallback(
    (message: Message) =>
      (!filterOptions.category || message.category === filterOptions.category) &&
      (!filterOptions.teamId || message.team_id === filterOptions.teamId) &&
      (!filterOptions.searchQuery ||
        message.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase())),
    [filterOptions.category, filterOptions.teamId, filterOptions.searchQuery]
  );

  useEffect(() => {
    realtimeMessagesRef.current.clear();
    realtimeDeletesRef.current.clear();
  }, [queryKey]);

  const messagesQuery = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    refetchOnMount: 'always',
    queryFn: async ({ pageParam }) => {
      const page = await fetchMessages({
        ...baseOptions,
        olderThan: pageParam,
      });
      const hasMore = page.length === PAGE_SIZE;
      const byId = new Map(page.map((message) => [message.id, message]));
      realtimeDeletesRef.current.forEach((id) => {
        byId.delete(id);
      });
      realtimeMessagesRef.current.forEach((message, id) => {
        if (realtimeDeletesRef.current.has(id)) return;
        if (!messageMatchesFilters(message)) {
          byId.delete(id);
          return;
        }
        if (!pageParam || byId.has(id)) byId.set(id, message);
      });
      return toMessagePage(
        Array.from(byId.values()).sort((a, b) =>
          (b.created_at ?? '').localeCompare(a.created_at ?? '')
        ),
        hasMore
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage[lastPage.length - 1]?.created_at : undefined,
  });
  const messages = messagesQuery.data?.pages.flat() ?? EMPTY_MESSAGES;
  const isLoading =
    messagesQuery.isLoading || (messagesQuery.isFetching && !messagesQuery.isFetchingNextPage);
  const loadingMore = messagesQuery.isFetchingNextPage;
  const error = messagesQuery.error ? 'Failed to load messages' : null;
  const hasMore = Boolean(messagesQuery.hasNextPage);

  // Set filter function - shows loading immediately for UX feedback
  const setFilter = useCallback((filter: Partial<FilterOptions>) => {
    setFilterOptions((prev) => {
      const newOptions = { ...prev, ...filter };
      // Persist to sessionStorage
      sessionStorage.setItem(MESSAGE_FILTER_KEY, JSON.stringify(newOptions));
      return newOptions;
    });
  }, []);

  const fetchInitialMessages = useCallback(async () => {
    await messagesQuery.refetch();
  }, [messagesQuery]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;

    try {
      const result = await messagesQuery.fetchNextPage();
      if (result.error) throw result.error;
    } catch (err) {
      errorLog('Error loading more messages:', err);
      toast({
        title: 'Error loading messages',
        description: 'Could not load additional messages. Please try again.',
        variant: 'destructive',
      });
    }
  }, [messagesQuery]);

  // Post message function
  const postMessage = async (content: string, category: MessageCategory = 'General') => {
    try {
      await createMessage(content, category);
    } catch (err) {
      errorLog('Error posting message:', err);
      throw err; // Re-throw so caller can preserve input text
    }
  };

  // Edit message function
  const editMessage = async (messageId: string, content: string) => {
    try {
      await apiUpdateMessage(messageId, content);
      // Optimistic UI update
      queryClient.setQueryData<MessagePages>(queryKey, (curr) => {
        if (!curr) return curr;
        return {
          ...curr,
          pages: curr.pages.map((page) =>
            toMessagePage(
              page.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      content,
                      updated_at: new Date().toISOString(),
                      is_edited: true,
                    }
                  : msg
              ),
              page.hasMore
            )
          ),
        };
      });
    } catch (err) {
      errorLog('Error updating message:', err);
      // Error is already handled in the API function
    }
  };

  // Delete message function
  const deleteMessage = async (messageId: string) => {
    try {
      await apiDeleteMessage(messageId);
      // Optimistic UI update
      queryClient.setQueryData<MessagePages>(queryKey, (curr) =>
        curr
          ? buildMessagePages(
              curr.pages.flat().filter((msg) => msg.id !== messageId),
              curr.pages.at(-1)?.hasMore
            )
          : curr
      );
    } catch (err) {
      errorLog('Error deleting message:', err);
      // Error is already handled in the API function
    }
  };

  // Memoized callback for message inserted
  const handleMessageInserted = useCallback(
    (newMessage: Message) => {
      // Only add if matches current filters
      if (messageMatchesFilters(newMessage)) {
        realtimeDeletesRef.current.delete(newMessage.id);
        realtimeMessagesRef.current.set(newMessage.id, newMessage);
        queryClient.setQueryData<MessagePages>(queryKey, (curr) => {
          if (!curr) return buildMessagePages([newMessage]);
          const flattened = [
            newMessage,
            ...curr.pages.flat().filter((message) => message.id !== newMessage.id),
          ].slice(0, MAX_MESSAGES_IN_STATE);
          const hasMore = curr.pages.at(-1)?.hasMore;
          return buildMessagePages(flattened, hasMore);
        });
      }
    },
    [queryKey, messageMatchesFilters, queryClient]
  );

  // Memoized callback for message updated
  const handleMessageUpdated = useCallback(
    (updatedMessage: Message) => {
      const matchesFilter = messageMatchesFilters(updatedMessage);
      if (matchesFilter) {
        realtimeDeletesRef.current.delete(updatedMessage.id);
        realtimeMessagesRef.current.set(updatedMessage.id, updatedMessage);
      } else {
        realtimeMessagesRef.current.delete(updatedMessage.id);
        realtimeDeletesRef.current.add(updatedMessage.id);
      }

      queryClient.setQueryData<MessagePages>(queryKey, (curr) => {
        if (!curr) return curr;
        const flattened = curr.pages.flat();
        const existsInList = flattened.some((msg) => msg.id === updatedMessage.id);
        const nextMessages = existsInList
          ? matchesFilter
            ? flattened.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
            : flattened.filter((msg) => msg.id !== updatedMessage.id)
          : matchesFilter
            ? [updatedMessage, ...flattened].sort((a, b) =>
                (b.created_at ?? '').localeCompare(a.created_at ?? '')
              )
            : flattened;
        return buildMessagePages(nextMessages, curr.pages.at(-1)?.hasMore);
      });
    },
    [queryKey, messageMatchesFilters, queryClient]
  );

  // Memoized callback for message deleted
  const handleMessageDeleted = useCallback(
    (deletedMessage: Message) => {
      realtimeMessagesRef.current.delete(deletedMessage.id);
      realtimeDeletesRef.current.add(deletedMessage.id);
      queryClient.setQueryData<MessagePages>(queryKey, (curr) =>
        curr
          ? buildMessagePages(
              curr.pages.flat().filter((msg) => msg.id !== deletedMessage.id),
              curr.pages.at(-1)?.hasMore
            )
          : curr
      );
    },
    [queryKey, queryClient]
  );

  // Set up real-time subscription with memoized callbacks
  useMessageRealtime(
    handleMessageInserted,
    handleMessageUpdated,
    handleMessageDeleted,
    fetchInitialMessages
  );

  // Refresh messages function
  const refreshMessages = useCallback(async () => {
    await fetchInitialMessages();
  }, [fetchInitialMessages]);

  return {
    messages,
    isLoading,
    loadingMore,
    error,
    hasMore,
    filterOptions,
    postMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    refreshMessages,
    setFilter,
  };
};
