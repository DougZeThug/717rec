
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageCategory } from "@/types/reactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UseMessageBoardResult, FilterOptions } from "./types";

export function useMessageBoard(): UseMessageBoardResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterOptions>({ category: 'All' });
  const { user, profile } = useAuth();
  
  const MESSAGES_PER_PAGE = 20;
  
  // Function to fetch messages with pagination
  const fetchMessages = useCallback(async (pageIndex = 0, replace = true) => {
    const isFirstPage = pageIndex === 0;
    
    if (isFirstPage) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageIndex * MESSAGES_PER_PAGE, (pageIndex + 1) * MESSAGES_PER_PAGE - 1);
      
      // Apply category filter if selected
      if (filter.category !== 'All') {
        query = query.eq('category', filter.category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Check if there might be more messages
      setHasMore(data.length === MESSAGES_PER_PAGE);
      
      // Update messages state (replace or append)
      setMessages(prev => (replace ? data : [...prev, ...data]));
      
      return data;
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
      return [];
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);
  
  // Initial load and filter changes
  useEffect(() => {
    setPage(0);
    fetchMessages(0);
  }, [fetchMessages, filter]);
  
  // Function to load more messages
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    await fetchMessages(nextPage, false);
    setPage(nextPage);
  };
  
  // Function to refresh messages
  const refreshMessages = async () => {
    setPage(0);
    return fetchMessages(0);
  };
  
  // Function to post a new message
  const postMessage = async (content: string, category: MessageCategory) => {
    if (!user || !profile) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to post messages.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          user_id: user.id,
          username: profile.username || user.email || 'Anonymous',
          category,
          team_id: profile.team_id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update local state with the new message
      setMessages(prev => [data, ...prev]);
      
    } catch (error: any) {
      console.error("Error posting message:", error);
      toast({
        title: "Failed to post message",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to edit a message
  const editMessage = async (messageId: string, content: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ content, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update the message in the local state
      setMessages(prev => 
        prev.map(msg => msg.id === messageId ? data : msg)
      );
      
      toast({
        title: "Message updated",
        description: "Your message has been updated successfully.",
      });
      
    } catch (error: any) {
      console.error("Error editing message:", error);
      toast({
        title: "Failed to update message",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to delete a message
  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Remove the message from the local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Message deleted",
        description: "Your message has been deleted successfully.",
      });
      
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: "Failed to delete message",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to update filter
  const updateFilter = (newFilter: Partial<FilterOptions>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, payload => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as Message;
          
          // Only add messages that match the current filter
          if (filter.category === 'All' || newMessage.category === filter.category) {
            // Avoid adding duplicates (e.g. if the user added this message themselves)
            if (!messages.some(m => m.id === newMessage.id)) {
              setMessages(prev => [newMessage, ...prev]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deletedMessage = payload.old as Message;
          setMessages(prev => 
            prev.filter(msg => msg.id !== deletedMessage.id)
          );
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messages, filter.category]);
  
  return {
    messages,
    isLoading,
    error,
    postMessage,
    editMessage,
    deleteMessage,
    hasMore,
    loadingMore,
    loadMoreMessages,
    refreshMessages,
    filterOptions: filter,
    setFilter: updateFilter
  };
}
