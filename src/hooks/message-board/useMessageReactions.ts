
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageReaction, ReactionCount } from "@/types/reactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useMessageReactions(messageId: string) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Memoized reaction counts with user's reaction status
  const reactionCounts = useMemo(() => {
    const counts: Record<string, { count: number; users: string[] }> = {};
    
    // Count reactions by emoji
    reactions.forEach(reaction => {
      if (!counts[reaction.emoji]) {
        counts[reaction.emoji] = { count: 0, users: [] };
      }
      counts[reaction.emoji].count += 1;
      counts[reaction.emoji].users.push(reaction.user_id);
    });
    
    // Convert to array and add hasReacted flag
    return Object.entries(counts).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: user ? data.users.includes(user.id) : false
    })).sort((a, b) => b.count - a.count);
  }, [reactions, user]);
  
  // Fetch all reactions for a message
  const fetchReactions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);
        
      if (error) throw error;
      
      setReactions(data || []);
      return data;
    } catch (error: any) {
      console.error("Error fetching reactions:", error);
      setError(error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle reaction (add/remove)
  const toggleReaction = async (emoji: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to react to messages.",
        variant: "destructive",
      });
      return false;
    }
    
    const hasReacted = reactions.some(r => 
      r.user_id === user.id && r.emoji === emoji
    );
    
    try {
      if (hasReacted) {
        // Remove the reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
          
        if (error) throw error;
        
        // Update local state
        setReactions(prev => 
          prev.filter(r => !(r.user_id === user.id && r.emoji === emoji))
        );
      } else {
        // Add the reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          })
          .select()
          .single();
          
        if (error) {
          // Handle unique constraint violation
          if (error.code === '23505') {
            return true; // Already exists, treat as success
          }
          throw error;
        }
        
        // Update local state
        setReactions(prev => [...prev, data]);
      }
      
      return true;
    } catch (error: any) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Reaction failed",
        description: "Failed to update your reaction. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Initialize reactions and set up realtime subscription
  useEffect(() => {
    fetchReactions();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`message_reactions:${messageId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}` 
      }, payload => {
        
        if (payload.eventType === 'INSERT' && payload.new) {
          // Add new reaction
          const newReaction = payload.new as MessageReaction;
          // Avoid duplicates from user's own actions
          if (user?.id !== newReaction.user_id) {
            setReactions(prev => 
              prev.some(r => r.id === newReaction.id) ? prev : [...prev, newReaction]
            );
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove deleted reaction
          const oldReaction = payload.old as MessageReaction;
          setReactions(prev => 
            prev.filter(r => r.id !== oldReaction.id)
          );
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, user?.id]);
  
  return {
    reactions,
    reactionCounts,
    isLoading,
    error,
    toggleReaction
  };
}
