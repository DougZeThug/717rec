import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { toast } from '@/hooks/useToast';
import { Message, MessageCategory } from '@/types/reactions';
import { errorLog } from '@/utils/logger';

import { messageBoardKeys } from './messageBoardKeys';
import { FilterOptions, MessageQueryOptions, UseMessageBoardResult } from './types';
import { useMessageApi } from './useMessageApi';
import { useMessageRealtime } from './useMessageRealtime';

const PAGE_SIZE = 10;
const MAX_MESSAGES_IN_STATE = 100;
const MESSAGE_FILTER_KEY = 'messageBoardFilters';
const EMPTY_MESSAGES: Message[] = [];

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

export const useMessageBoard = (): UseMessageBoardResult => {
  const queryClient = useQueryClient();
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationExhausted, setPaginationExhausted] = useState(false);

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
  const messagesQuery = useQuery({
    queryKey: messageBoardKeys.page(baseOptions),
    queryFn: () => fetchMessages(baseOptions),
  });
  const messages = messagesQuery.data ?? EMPTY_MESSAGES;
  const isLoading = messagesQuery.isLoading || messagesQuery.isFetching;
  const error = messagesQuery.error ? 'Failed to load messages' : null;
  const hasMore = !paginationExhausted && messages.length === PAGE_SIZE;

  // Set filter function - shows loading immediately for UX feedback
  const setFilter = useCallback((filter: Partial<FilterOptions>) => {
    setPaginationExhausted(false);
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
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);

      // Get the oldest message date in the current list
      const oldestMessage = messages[messages.length - 1];

      if (!oldestMessage) {
        setPaginationExhausted(true);
        return;
      }

      const options: MessageQueryOptions = {
        limit: PAGE_SIZE,
        olderThan: oldestMessage.created_at,
        category: filterOptions.category,
        teamId: filterOptions.teamId,
        searchQuery: filterOptions.searchQuery,
      };

      const data = await fetchMessages(options);

      if (data && data.length > 0) {
        queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (prev = []) => [
          ...prev,
          ...data,
        ]);
        setPaginationExhausted(data.length < PAGE_SIZE);
      } else {
        setPaginationExhausted(true);
      }
    } catch (err) {
      errorLog('Error loading more messages:', err);
      toast({
        title: 'Error loading messages',
        description: 'Could not load additional messages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMore(false);
    }
  }, [baseOptions, messages, hasMore, loadingMore, fetchMessages, filterOptions, queryClient]);

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
      queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (curr = []) =>
        curr.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content,
                updated_at: new Date().toISOString(),
                is_edited: true,
              }
            : msg
        )
      );
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
      queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (curr = []) =>
        curr.filter((msg) => msg.id !== messageId)
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
      if (
        (!filterOptions.category || newMessage.category === filterOptions.category) &&
        (!filterOptions.teamId || newMessage.team_id === filterOptions.teamId) &&
        (!filterOptions.searchQuery ||
          newMessage.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()))
      ) {
        queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (curr = []) => {
          const updated = [newMessage, ...curr];
          // Cap at MAX_MESSAGES_IN_STATE to prevent memory bloat
          return updated.length > MAX_MESSAGES_IN_STATE
            ? updated.slice(0, MAX_MESSAGES_IN_STATE)
            : updated;
        });
      }
    },
    [
      baseOptions,
      filterOptions.category,
      filterOptions.teamId,
      filterOptions.searchQuery,
      queryClient,
    ]
  );

  // Memoized callback for message updated
  const handleMessageUpdated = useCallback(
    (updatedMessage: Message) => {
      const matchesFilter =
        (!filterOptions.category || updatedMessage.category === filterOptions.category) &&
        (!filterOptions.teamId || updatedMessage.team_id === filterOptions.teamId) &&
        (!filterOptions.searchQuery ||
          updatedMessage.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()));

      queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (curr = []) => {
        const existsInList = curr.some((msg) => msg.id === updatedMessage.id);

        if (existsInList) {
          // Update in place if still matches filter, otherwise remove
          return matchesFilter
            ? curr.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
            : curr.filter((msg) => msg.id !== updatedMessage.id);
        } else {
          // Not in list — insert at correct position to maintain created_at desc order
          if (matchesFilter) {
            const insertIndex = curr.findIndex(
              (msg) =>
                msg.created_at &&
                updatedMessage.created_at &&
                msg.created_at < updatedMessage.created_at
            );
            if (insertIndex === -1) {
              return [...curr, updatedMessage];
            }
            return [...curr.slice(0, insertIndex), updatedMessage, ...curr.slice(insertIndex)];
          }
          return curr;
        }
      });
    },
    [
      baseOptions,
      filterOptions.category,
      filterOptions.teamId,
      filterOptions.searchQuery,
      queryClient,
    ]
  );

  // Memoized callback for message deleted
  const handleMessageDeleted = useCallback(
    (deletedMessage: Message) => {
      queryClient.setQueryData<Message[]>(messageBoardKeys.page(baseOptions), (curr = []) =>
        curr.filter((msg) => msg.id !== deletedMessage.id)
      );
    },
    [baseOptions, queryClient]
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
