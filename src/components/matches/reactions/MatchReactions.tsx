import { SmilePlus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useMatchReactions } from '@/hooks/matches/useMatchReactions';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import MatchReactionButton from './MatchReactionButton';
import MatchReactionPicker from './MatchReactionPicker';

interface MatchReactionsProps {
  matchId: string;
}

interface AddReactionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

const AddReactionPopover: React.FC<AddReactionPopoverProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size="xs"
        className="py-0 h-6 px-1.5 gap-1 text-xs border"
        aria-label="Add reaction"
      >
        <SmilePlus className="size-3.5" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 border-none shadow-md" align="start" sideOffset={5}>
      <MatchReactionPicker onSelect={onSelect} />
    </PopoverContent>
  </Popover>
);

const MatchReactions: React.FC<MatchReactionsProps> = ({ matchId }) => {
  const { reactionCounts, toggleReaction, isLoading } = useMatchReactions(matchId);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleReaction = (emoji: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to react to matches',
        variant: 'default',
      });
      return;
    }

    toggleReaction(emoji);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 h-6">
        <Skeleton className="size-6 rounded-full bg-muted/20" />
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-1', animations.fadeIn)}
      role="group"
      aria-label="Match reactions"
    >
      {reactionCounts.map((reaction) => (
        <MatchReactionButton
          key={reaction.emoji}
          emoji={reaction.emoji}
          count={reaction.count}
          hasReacted={reaction.hasReacted}
          onClick={() => handleReaction(reaction.emoji)}
        />
      ))}

      <AddReactionPopover open={open} onOpenChange={setOpen} onSelect={handleReaction} />
    </div>
  );
};

export default MatchReactions;
