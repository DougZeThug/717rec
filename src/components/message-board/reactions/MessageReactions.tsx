import React from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useMessageReactions } from '@/hooks/message-board/useMessageReactions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import ReactionButton from './ReactionButton';
import ReactionPicker from './ReactionPicker';

interface MessageReactionsProps {
  messageId: string;
  showPicker?: boolean;
  onPickerClose?: () => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  showPicker = false,
  onPickerClose,
}) => {
  const { reactionCounts, addReaction, isLoading } = useMessageReactions(messageId);
  const { user } = useAuth();

  const handleAddReaction = (emoji: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to react to messages',
        variant: 'default',
      });
      return;
    }

    addReaction(emoji);
    if (onPickerClose) {
      onPickerClose();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 mt-2 h-6">
        <div className="w-6 h-6 bg-muted/20 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (reactionCounts.length === 0 && !showPicker) {
    return null; // Don't show anything if there are no reactions and picker is hidden
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 mt-2',
        animations.fadeIn,
        'animation-delay-300'
      )}
      role="group"
      aria-label="Message reactions"
    >
      {reactionCounts.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          emoji={reaction.emoji}
          count={reaction.count}
          hasReacted={reaction.hasReacted}
          onClick={() => handleAddReaction(reaction.emoji)}
        />
      ))}

      {/* Only show picker when explicitly requested via long press */}
      {showPicker && <ReactionPicker onSelect={handleAddReaction} onClose={onPickerClose} />}
    </div>
  );
};

export default MessageReactions;
