
import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Message } from "@/types/reactions";
import { useMessageApi } from "./useMessageApi";
import { useMessageRealtime } from "./useMessageRealtime";
import { UseMessageBoardResult } from "./types";

const PAGE_SIZE = 10;

export const useMessageBoard = (): UseMessageBoardResult => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const { fetchMessages, createMessage, deleteMessage: apiDeleteMessage } = useMessageApi();
  
  // Fetch initial messages
  const fetchInitialMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchMessages({ limit: PAGE_SIZE });
      
      setMessages(data || []);
      setHasMore(data.length === PAGE_SIZE);
      setPage(1);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [fetchMessages]);
  
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
      
      const data = await fetchMessages({
        limit: PAGE_SIZE,
        olderThan: oldestMessage.created_at
      });
      
      if (data && data.length > 0) {
        setMessages(prev => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(prev => prev + 1);
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
  }, [messages, hasMore, loadingMore, fetchMessages]);
  
  // Post message function
  const postMessage = async (content: string) => {
    try {
      await createMessage(content);
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
      setMessages(curr => [newMessage, ...curr]);
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
  useState(() => {
    fetchInitialMessages();
  });
  
  return {
    messages,
    isLoading,
    loadingMore,
    error,
    hasMore,
    postMessage,
    deleteMessage,
    loadMoreMessages,
    refreshMessages
  };
};
