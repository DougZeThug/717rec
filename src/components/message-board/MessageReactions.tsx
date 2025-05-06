
import React from "react";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import ReactionButton from "./ReactionButton";
import ReactionPicker from "./ReactionPicker";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface MessageReactionsProps {
  messageId: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId }) => {
  const { reactionCounts, addReaction, isLoading } = useMessageReactions(messageId);
  const { user } = useAuth();
  
  const handleAddReaction = (emoji: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to messages",
        variant: "default",
      });
      return;
    }
    
    addReaction(emoji);
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
      className={cn(
        "flex flex-wrap items-center gap-1.5 mt-2",
        animations.fadeIn,
        "animation-delay-300"
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
      <ReactionPicker onSelect={handleAddReaction} />
    </div>
  );
};

export default MessageReactions;
