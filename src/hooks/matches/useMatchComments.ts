
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MatchComment, MatchCommentInput } from "@/types/comments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useMatchComments(matchId: string) {
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile } = useAuth();
  
  // Fetch comments for a specific match
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_comments')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setComments(data || []);
      return data;
    } catch (error) {
      console.error("Error fetching match comments:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new comment
  const addComment = async (content: string) => {
    if (!user || !profile) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add a comment.",
        variant: "destructive",
      });
      return null;
    }

    if (!content.trim()) {
      toast({
        title: "Empty comment",
        description: "Comment cannot be empty.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const commentData: MatchCommentInput = {
        match_id: matchId,
        content: content.trim()
      };

      const { data, error } = await supabase
        .from('match_comments')
        .insert({
          ...commentData,
          user_id: user.id,
          username: profile.username || user.email || 'Anonymous'
        })
        .select('*')
        .single();

      if (error) throw error;
      
      // Optimistically update the comments list
      setComments(prevComments => [...prevComments, data]);
      
      return data;
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Comment failed",
        description: error.message || "Failed to add your comment. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete a comment
  const deleteComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to delete a comment.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('match_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update the comments list
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      
      return true;
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete your comment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Setup real-time subscription for comments
  useEffect(() => {
    fetchComments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`match_comments:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_comments',
        filter: `match_id=eq.${matchId}`
      }, payload => {
        console.log('Real-time comment update:', payload);
        
        // Handle different events
        if (payload.eventType === 'INSERT' && payload.new) {
          // Only add if not from current user (avoid duplicates)
          const newComment = payload.new as MatchComment;
          if (user?.id !== newComment.user_id) {
            setComments(prev => [...prev, newComment]);
          }
        } else if (payload.eventType === 'DELETE' && payload.old) {
          // Remove deleted comment
          const deletedComment = payload.old as MatchComment;
          setComments(prev => prev.filter(c => c.id !== deletedComment.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user?.id]);

  return {
    comments,
    isLoading,
    addComment,
    deleteComment,
    refreshComments: fetchComments
  };
}
