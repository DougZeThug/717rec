
import React from "react";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import ReactionButton from "./ReactionButton";
import ReactionPicker from "./ReactionPicker";

interface MessageReactionsProps {
  messageId: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId }) => {
  const { reactionCounts, addReaction } = useMessageReactions(messageId);
  
  const handleAddReaction = (emoji: string) => {
    addReaction(emoji);
  };
  
  if (reactionCounts.length === 0) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <ReactionPicker onSelect={handleAddReaction} />
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
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
