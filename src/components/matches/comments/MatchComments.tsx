import { MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatchComments } from '@/hooks/matches/useMatchComments';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import MatchCommentForm from './MatchCommentForm';
import MatchCommentItem from './MatchCommentItem';

interface MatchCommentsProps {
  matchId: string;
}

const CommentsTrigger: React.FC<{ commentCount: number }> = ({ commentCount }) => (
  <CollapsibleTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      className="p-0 h-auto font-normal hover:bg-transparent hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground"
    >
      <MessageSquare className="size-4" />
      <span className="text-sm">
        {commentCount} Comment{commentCount !== 1 ? 's' : ''}
      </span>
    </Button>
  </CollapsibleTrigger>
);

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
    // One 44px block, as tall as the collapsed comments row, so the card does not jump.
    return <Skeleton className="h-11 w-26" />;
  }

  const commentCount = comments.length;

  return (
    // min-w-0: this sits in a flex row beside the reactions. Without it the row
    // grew to the long team name's full width and the card cut the comments off
    // at 320 px.
    <div className={cn('min-w-0', animations.fadeIn)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <CommentsTrigger commentCount={commentCount} />
        </div>

        <CollapsibleContent className="space-y-2">
          {comments.length > 0 && (
            <div className="space-y-1 divide-y divide-border/30">
              {comments.map((comment) => (
                <MatchCommentItem key={comment.id} comment={comment} onDelete={deleteComment} />
              ))}
            </div>
          )}
          <MatchCommentForm onSubmit={handleAddComment} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MatchComments;
