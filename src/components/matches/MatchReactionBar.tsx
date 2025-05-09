
import React, { useState } from "react";
import { useMatchReactions } from "@/hooks/matches/useMatchReactions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { animations } from "@/styles/design-system";

interface MatchReactionBarProps {
  matchId: string;
}

// Common emojis for quick reactions
const COMMON_EMOJIS = [
  "👍", "❤️", "🔥", "😂", "😮", "👏", "🎉", "🙌"
];

export const MatchReactionBar: React.FC<MatchReactionBarProps> = ({ matchId }) => {
  const { reactionCounts, isLoading, toggleReaction } = useMatchReactions(matchId);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  
  const handleReactionClick = async (emoji: string) => {
    await toggleReaction(emoji);
  };
  
  const handleAddEmoji = async (emoji: string) => {
    await toggleReaction(emoji);
    setOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center h-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {reactionCounts.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.hasReacted ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "h-8 px-2 py-1 text-xs gap-1 transition-all",
            reaction.hasReacted && "animate-pulse-once",
            animations.fadeIn
          )}
          onClick={() => handleReactionClick(reaction.emoji)}
          disabled={!user}
        >
          <span className="text-base mr-0.5">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </Button>
      ))}
      
      {user && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 py-1 text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              React
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-4 gap-2">
              {COMMON_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => handleAddEmoji(emoji)}
                >
                  <span className="text-xl">{emoji}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
