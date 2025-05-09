
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchReaction, MatchReactionCount } from "@/types/reactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useMatchReactions(matchId: string) {
  const [reactions, setReactions] = useState<MatchReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Calculated reaction counts with user's reaction status
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
  
  // Fetch all reactions for a match
  const fetchReactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_reactions')
        .select('*')
        .eq('match_id', matchId);

      if (error) throw error;
      
      setReactions(data || []);
      return data;
    } catch (error) {
      console.error("Error fetching match reactions:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle (add/remove) a reaction
  const toggleReaction = async (emoji: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to react to matches.",
        variant: "destructive",
      });
      return;
    }

    const hasReacted = reactions.some(r => 
      r.user_id === user.id && r.emoji === emoji
    );

    try {
      if (hasReacted) {
        // Remove the reaction
        const { error } = await supabase
          .from('match_reactions')
          .delete()
          .eq('match_id', matchId)
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
          .from('match_reactions')
          .insert({
            match_id: matchId,
            user_id: user.id,
            emoji
          })
          .select('*')
          .single();

        if (error) {
          // If the error is a unique constraint violation, it's already been added
          if (error.code === '23505') {
            console.log('Reaction already exists');
            return;
          }
          throw error;
        }
        
        // Update local state
        setReactions(prev => [...prev, data]);
      }
    } catch (error: any) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Reaction failed",
        description: error.message || "Failed to update your reaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchReactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`match_reactions:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_reactions',
        filter: `match_id=eq.${matchId}`
      }, payload => {
        console.log('Real-time reaction update:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          const newReaction = payload.new as MatchReaction;
          // Avoid duplicates from current user's actions
          if (user?.id !== newReaction.user_id) {
            setReactions(prev => [...prev, newReaction]);
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const oldReaction = payload.old as MatchReaction;
          // Remove the deleted reaction
          setReactions(prev => prev.filter(r => r.id !== oldReaction.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id]);

  return {
    reactions,
    reactionCounts,
    isLoading,
    toggleReaction
  };
}
