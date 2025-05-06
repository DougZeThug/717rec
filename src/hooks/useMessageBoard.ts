
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembership } from "@/hooks/useTeamMembership";

export interface Message {
  id: string;
  content: string;
  created_at: string;
  username: string;
  team_name: string | null;
  user_id: string | null;
  team_id: string | null;
}

const PAGE_SIZE = 10;

export const useMessageBoard = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { user, profile } = useAuth();
  const { membership } = useTeamMembership();
  
  // Fetch initial messages
  useEffect(() => {
    fetchInitialMessages();
  }, []);
  
  const fetchInitialMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      
      if (error) {
        throw error;
      }
      
      setMessages(data || []);
      setHasMore(data?.length === PAGE_SIZE);
      setPage(1);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to load more messages
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
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .lt('created_at', oldestMessage.created_at) // Get messages older than the oldest one we have
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      
      if (error) {
        throw error;
      }
      
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
  }, [messages, hasMore, loadingMore]);
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, 
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(curr => [newMessage, ...curr]);
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages(curr => curr.filter(msg => msg.id !== deletedMessage.id));
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Post message function
  const postMessage = async (content: string) => {
    if (!user || !profile?.username) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to post messages",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const newMessage = {
        content,
        user_id: user.id,
        username: profile.username || 'Anonymous',
        team_id: membership?.team_id || null,
        team_name: membership?.team?.name || null,
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(newMessage);
      
      if (error) {
        throw error;
      }
      
    } catch (err) {
      console.error('Error posting message:', err);
      toast({
        title: "Error posting message",
        description: "Your message could not be posted. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete message function
  const deleteMessage = async (messageId: string) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to delete messages",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id); // RLS will ensure this is the user's message
      
      if (error) {
        throw error;
      }
      
      // Optimistic UI update
      setMessages(curr => curr.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Message deleted",
        description: "Your message has been deleted",
      });
      
    } catch (err) {
      console.error('Error deleting message:', err);
      toast({
        title: "Error deleting message",
        description: "Your message could not be deleted. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Function to refresh messages
  const refreshMessages = async () => {
    await fetchInitialMessages();
  };
  
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
