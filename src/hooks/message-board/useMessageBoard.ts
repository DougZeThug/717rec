
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Message, MessageCategory } from "@/types/reactions";
import { useMessageApi } from "./useMessageApi";
import { useMessageRealtime } from "./useMessageRealtime";
import { UseMessageBoardResult, FilterOptions, MessageQueryOptions } from "./types";
import { errorLog } from "@/utils/logger";

const PAGE_SIZE = 10;
const FILTER_DEBOUNCE_MS = 300;
const MAX_MESSAGES_IN_STATE = 100;
const MESSAGE_FILTER_KEY = "messageBoardFilters";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter state - initialize from sessionStorage
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(loadPersistedFilters);

  // Debounce ref for filter changes
  const filterDebounceRef = useRef<NodeJS.Timeout>();

  const { fetchMessages, createMessage, updateMessage: apiUpdateMessage, deleteMessage: apiDeleteMessage } = useMessageApi();
  
  // Set filter function - shows loading immediately for UX feedback
  const setFilter = useCallback((filter: Partial<FilterOptions>) => {
    setIsLoading(true); // Immediate feedback
    setFilterOptions(prev => {
      const newOptions = { ...prev, ...filter };
      // Persist to sessionStorage
      sessionStorage.setItem(MESSAGE_FILTER_KEY, JSON.stringify(newOptions));
      return newOptions;
    });
  }, []);

  // Debounced effect to refetch messages when filters change
  useEffect(() => {
    // Clear any pending debounce timer
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    
    // Set a new debounce timer
    filterDebounceRef.current = setTimeout(() => {
      fetchInitialMessages();
    }, FILTER_DEBOUNCE_MS);
    
    // Cleanup on filter change or unmount
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
    };
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
      errorLog('Error fetching messages:', err);
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
      errorLog('Error loading more messages:', err);
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
      errorLog('Error posting message:', err);
      // Error is already handled in the API function
    }
  };

  // Edit message function
  const editMessage = async (messageId: string, content: string) => {
    try {
      await apiUpdateMessage(messageId, content);
      // Optimistic UI update
      setMessages(curr => curr.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              content, 
              updated_at: new Date().toISOString(),
              is_edited: true 
            } 
          : msg
      ));
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
      setMessages(curr => curr.filter(msg => msg.id !== messageId));
    } catch (err) {
      errorLog('Error deleting message:', err);
      // Error is already handled in the API function
    }
  };
  
  // Memoized callback for message inserted
  const handleMessageInserted = useCallback((newMessage: Message) => {
    // Only add if matches current filters
    if (
      (!filterOptions.category || newMessage.category === filterOptions.category) &&
      (!filterOptions.teamId || newMessage.team_id === filterOptions.teamId) &&
      (!filterOptions.searchQuery || newMessage.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()))
    ) {
      setMessages(curr => {
        const updated = [newMessage, ...curr];
        // Cap at MAX_MESSAGES_IN_STATE to prevent memory bloat
        return updated.length > MAX_MESSAGES_IN_STATE 
          ? updated.slice(0, MAX_MESSAGES_IN_STATE) 
          : updated;
      });
    }
  }, [filterOptions.category, filterOptions.teamId, filterOptions.searchQuery]);

  // Memoized callback for message updated  
  const handleMessageUpdated = useCallback((updatedMessage: Message) => {
    if (
      (!filterOptions.category || updatedMessage.category === filterOptions.category) &&
      (!filterOptions.teamId || updatedMessage.team_id === filterOptions.teamId) &&
      (!filterOptions.searchQuery || updatedMessage.content.toLowerCase().includes(filterOptions.searchQuery.toLowerCase()))
    ) {
      setMessages(curr => curr.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    }
  }, [filterOptions.category, filterOptions.teamId, filterOptions.searchQuery]);

  // Memoized callback for message deleted
  const handleMessageDeleted = useCallback((deletedMessage: Message) => {
    setMessages(curr => curr.filter(msg => msg.id !== deletedMessage.id));
  }, []);

  // Set up real-time subscription with memoized callbacks
  useMessageRealtime(
    handleMessageInserted,
    handleMessageUpdated,
    handleMessageDeleted
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
    editMessage,
    deleteMessage,
    loadMoreMessages,
    refreshMessages,
    setFilter
  };
};
