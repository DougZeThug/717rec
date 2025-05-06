
import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Message, MessageCategory } from "@/types/reactions";
import { useMessageApi } from "./useMessageApi";
import { useMessageRealtime } from "./useMessageRealtime";
import { UseMessageBoardResult, FilterOptions, MessageQueryOptions } from "./types";

const PAGE_SIZE = 10;

export const useMessageBoard = (): UseMessageBoardResult => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    category: null,
    teamId: null,
    searchQuery: null
  });

  const { fetchMessages, createMessage, deleteMessage: apiDeleteMessage } = useMessageApi();
  
  // Set filter function
  const setFilter = useCallback((filter: Partial<FilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...filter
    }));
  }, []);

  // Effect to refetch messages when filters change
  useEffect(() => {
    fetchInitialMessages();
  }, [filterOptions.category, filterOptions.teamId, filterOptions.searchQuery]);
  
  // Fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchMessages({
        limit: PAGE_SIZE,
        category: filterOptions.category,
        teamId: filterOptions.teamId,
        searchQuery: filterOptions.searchQuery
      });
      
      setMessages(data || []);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [fetchMessages, filterOptions]);
  
  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // Get the oldest message date in the current list
      const oldestMessage = messages[messages.length - 1];
      
      if (!oldestMessage) {
        setHasMore(false);
        return;
      }
      
      const options: MessageQueryOptions = {
        limit: PAGE_SIZE,
        olderThan: oldestMessage.created_at,
        category: filterOptions.category,
        teamId: filterOptions.teamId,
        searchQuery: filterOptions.searchQuery
      };
      
      const data = await fetchMessages(options);
      
      if (data && data.length > 0) {
        setMessages(prev => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('Error loading more messages:', err);
      toast({
        title: "Error loading messages",
        description: "Could not load additional messages. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingMore(false);
    }
  }, [messages, hasMore, loadingMore, fetchMessages, filterOptions]);
  
  // Post message function
  const postMessage = async (content: string, category: MessageCategory = 'General') => {
    try {
      await createMessage(content, category);
    } catch (err) {
      console.error('Error posting message:', err);
      // Error is already handled in the API function
    }
  };

  // Delete message function
  const deleteMessage = async (messageId: string) => {
    try {
      await apiDeleteMessage(messageId);
      // Optimistic UI update
      setMessages(curr => curr.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      // Error is already handled in the API function
    }
  };
  
  // Set up real-time subscription
  useMessageRealtime(
    // On message inserted
    (newMessage) => {
      // Only add the message if it matches current filters
      if (
        (!filterOptions.category || newMessage.category === filterOptions.category) &&
        (!filterOptions.teamId || newMessage.team_id === filterOptions.teamId) &&
        (!filterOptions.searchQuery || newMessage.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()))
      ) {
        setMessages(curr => [newMessage, ...curr]);
      }
    },
    // On message deleted
    (deletedMessage) => {
      setMessages(curr => curr.filter(msg => msg.id !== deletedMessage.id));
    }
  );
  
  // Refresh messages function
  const refreshMessages = useCallback(async () => {
    await fetchInitialMessages();
  }, [fetchInitialMessages]);
  
  // Initialize on mount
  useEffect(() => {
    fetchInitialMessages();
  }, []);
  
  return {
    messages,
    isLoading,
    loadingMore,
    error,
    hasMore,
    filterOptions,
    postMessage,
    deleteMessage,
    loadMoreMessages,
    refreshMessages,
    setFilter
  };
};
