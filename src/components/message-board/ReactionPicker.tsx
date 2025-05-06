
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { animations } from "@/styles/designSystem";

// Common emoji sets
const EMOJI_GROUPS = {
  positive: ["👍", "❤️", "😂", "🎉", "🙌", "👏", "🔥", "✅"],
  neutral: ["👀", "🤔", "😮", "👋", "💯", "🚀", "🧐", "💭"],
  other: ["🙏", "💪", "👎", "😢", "🤷", "😎", "🏆", "👌"]
};

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

const ReactionPickerSection: React.FC<{
  emojis: string[];
  onSelect: (emoji: string) => void;
  label: string;
}> = ({ emojis, onSelect, label }) => (
  <div className="space-y-1">
    <div className="text-xs font-medium text-muted-foreground px-1">{label}</div>
    <div className="grid grid-cols-4 gap-1">
      {emojis.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="xs"
          className="h-8 w-8 p-0 hover:bg-accent/50"
          onClick={() => onSelect(emoji)}
        >
          <span className="text-lg">{emoji}</span>
        </Button>
      ))}
    </div>
  </div>
);

const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect }) => {
  return (
    <TooltipProvider>
      <Popover>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 w-6 p-0 rounded-full"
              >
                <Smile className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-2 py-1">
            <span className="text-xs">Add reaction</span>
          </TooltipContent>
        </Tooltip>
        <PopoverContent 
          className={cn("w-auto p-3 space-y-3", animations.scaleIn)}
          side="top" 
          align="start"
          alignOffset={-5}
          sideOffset={5}
        >
          <ReactionPickerSection 
            emojis={EMOJI_GROUPS.positive}
            onSelect={onSelect}
            label="Positive"
          />
          <ReactionPickerSection 
            emojis={EMOJI_GROUPS.neutral}
            onSelect={onSelect}
            label="Neutral"
          />
          <ReactionPickerSection 
            emojis={EMOJI_GROUPS.other}
            onSelect={onSelect}
            label="Other"
          />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};

export default ReactionPicker;
