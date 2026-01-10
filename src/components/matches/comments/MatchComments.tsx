import { MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMatchComments } from '@/hooks/matches/useMatchComments';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import MatchCommentForm from './MatchCommentForm';
import MatchCommentItem from './MatchCommentItem';

interface MatchCommentsProps {
  matchId: string;
}

const MatchComments: React.FC<MatchCommentsProps> = ({ matchId }) => {
  const { comments, isLoading, addComment, deleteComment } = useMatchComments(matchId);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleAddComment = async (content: string) => {
    const result = await addComment(content);
    if (result) {
      setIsOpen(true); // Expand comments when a new comment is added
    }
  };

  if (isLoading) {
    return (
      <div className="mt-2 animate-pulse">
        <div className="h-8 bg-muted rounded"></div>
        <div className="h-20 bg-muted/50 rounded mt-2"></div>
      </div>
    );
  }

  const commentCount = comments.length;

  return (
    <div className={cn('mt-3 pt-2', animations.fadeIn)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto font-normal hover:bg-transparent hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">
                {commentCount} Comment{commentCount !== 1 ? 's' : ''}
              </span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-2">
          {comments.length > 0 ? (
            <div className="space-y-1 divide-y divide-border/30">
              {comments.map((comment) => (
                <MatchCommentItem key={comment.id} comment={comment} onDelete={deleteComment} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic py-2">
              No comments yet. Be the first to comment!
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-3">
        <MatchCommentForm onSubmit={handleAddComment} />
      </div>
    </div>
  );
};

export default MatchComments;
