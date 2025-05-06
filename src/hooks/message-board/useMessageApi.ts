
import { supabase } from "@/integrations/supabase/client";
import { Message, MessageCategory } from "@/types/reactions";
import { toast } from "@/hooks/use-toast";
import { MessageQueryOptions } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMembership } from "@/hooks/useTeamMembership";

export const useMessageApi = () => {
  const { user, profile } = useAuth();
  const { membership } = useTeamMembership();

  const fetchMessages = async (options: MessageQueryOptions = {}) => {
    const { limit = 10, olderThan = null, category = null, teamId = null, searchQuery = null } = options;
    
    // Create a query builder without method chaining initially
    let query = supabase
      .from('messages')
      .select('*');
      
    // Apply sorting
    query = query.order('created_at', { ascending: false });
    
    // Apply limit
    query = query.limit(limit);
      
    // Apply filters conditionally
    if (olderThan) {
      query = query.lt('created_at', olderThan);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    
    if (searchQuery) {
      query = query.ilike('content', `%${searchQuery}%`);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
    
    return data as Message[];
  };

  const createMessage = async (content: string, category: MessageCategory = 'General') => {
    if (!user || !profile?.username) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to post messages",
        variant: "destructive"
      });
      throw new Error("User not authenticated");
    }
    
    const newMessage = {
      content,
      category,
      user_id: user.id,
      username: profile.username || 'Anonymous',
      team_id: membership?.team_id || null,
      team_name: membership?.team?.name || null,
    };
    
    const { error } = await supabase
      .from('messages')
      .insert(newMessage);
    
    if (error) {
      toast({
        title: "Error posting message",
        description: "Your message could not be posted. Please try again.",
        variant: "destructive"
      });
      throw new Error(`Failed to create message: ${error.message}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to delete messages",
        variant: "destructive"
      });
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);
    
    if (error) {
      toast({
        title: "Error deleting message",
        description: "Your message could not be deleted. Please try again.",
        variant: "destructive"
      });
      throw new Error(`Failed to delete message: ${error.message}`);
    }
    
    toast({
      title: "Message deleted",
      description: "Your message has been deleted",
    });
  };

  return {
    fetchMessages,
    createMessage,
    deleteMessage
  };
};
