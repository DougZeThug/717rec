import { SmilePlus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useMatchReactions } from '@/hooks/matches/useMatchReactions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import MatchReactionButton from './MatchReactionButton';
import MatchReactionPicker from './MatchReactionPicker';

interface MatchReactionsProps {
  matchId: string;
}

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
      <div className="flex items-center gap-1 mt-2 h-6">
        <div className="w-6 h-6 bg-muted/20 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5 mt-2', animations.fadeIn)}
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className="py-0 h-6 px-1.5 gap-1 text-xs border"
            aria-label="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-md" align="start" sideOffset={5}>
          <MatchReactionPicker onSelect={handleReaction} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MatchReactions;
