
import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMatchComments } from "@/hooks/matches/useMatchComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import LoginRequired from "@/components/auth/LoginRequired";

interface MatchCommentSectionProps {
  matchId: string;
}

export const MatchCommentSection: React.FC<MatchCommentSectionProps> = ({ matchId }) => {
  const { comments, isLoading, addComment, deleteComment } = useMatchComments(matchId);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const result = await addComment(newComment);
    setIsSubmitting(false);
    
    if (result) {
      setNewComment("");
    }
  };
  
  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
  };

  return (
    <div className="mt-4 space-y-4">
      <h3 className="font-semibold text-sm">Comments</h3>
      
      {/* Comment list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-muted-foreground text-sm text-center py-2">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              className={cn(
                "p-3 rounded-lg bg-muted/50 border",
                animations.fadeIn
              )}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium text-sm">
                  {comment.username}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
      
      {/* Comment input */}
      <LoginRequired
        message="Please sign in to post comments"
        fallback={
          <div className="text-center text-sm text-muted-foreground py-2">
            Sign in to join the conversation
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[60px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-right text-muted-foreground mt-1">
              {newComment.length}/500
            </div>
          </div>
          <Button 
            type="submit" 
            size="sm"
            disabled={!newComment.trim() || isSubmitting}
            className="h-9"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </LoginRequired>
    </div>
  );
};
