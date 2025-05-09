
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface MatchComment {
  id: string;
  match_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export const useMatchComments = (matchId: string) => {
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch comments for the match
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('match_comments')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setComments(data || []);
      } catch (err) {
        console.error('Error fetching match comments:', err);
        setError('Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (matchId) {
      fetchComments();
    }
  }, [matchId]);
  
  // Set up realtime subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel('match-comments')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_comments',
          filter: `match_id=eq.${matchId}`
        }, 
        (payload) => {
          const newComment = payload.new as MatchComment;
          setComments(curr => [...curr, newComment]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);
  
  // Post a new comment
  const addComment = async (content: string) => {
    if (!user) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to comment",
        variant: "destructive"
      });
      return null;
    }
    
    if (!content.trim()) return null;
    
    try {
      const { data, error } = await supabase
        .from('match_comments')
        .insert({
          match_id: matchId,
          user_id: user.id,
          username: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
          content: content.trim()
        })
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Error adding comment:', err);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
      return null;
    }
  };
  
  // Delete a comment (only author can delete)
  const deleteComment = async (commentId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('match_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // RLS ensures this is the user's comment
      
      if (error) {
        throw error;
      }
      
      setComments(curr => curr.filter(c => c.id !== commentId));
      return true;
    } catch (err) {
      console.error('Error removing comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
      return false;
    }
  };
  
  return {
    comments,
    isLoading,
    error,
    addComment,
    deleteComment
  };
};
