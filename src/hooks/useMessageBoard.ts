
import { useState, useEffect } from "react";
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

export const useMessageBoard = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { membership } = useTeamMembership();
  
  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          throw error;
        }
        
        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, []);
  
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
  
  return {
    messages,
    isLoading,
    error,
    postMessage,
    deleteMessage
  };
};
