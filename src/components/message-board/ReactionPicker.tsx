
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

// Common emoji sets
const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🙌", "👏", "🔥", "✅"];
const ADDITIONAL_EMOJIS = ["👀", "🤔", "😮", "😢", "😎", "🚀", "💯", "👎"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 w-6 p-0 rounded-full"
        >
          <Smile className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        side="top" 
        align="start"
        alignOffset={-5}
      >
        <div className="grid grid-cols-8 gap-1.5">
          {COMMON_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="xs"
              className="h-8 w-8 p-0"
              onClick={() => onSelect(emoji)}
            >
              <span className="text-lg">{emoji}</span>
            </Button>
          ))}
          {ADDITIONAL_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="xs"
              className="h-8 w-8 p-0"
              onClick={() => onSelect(emoji)}
            >
              <span className="text-lg">{emoji}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ReactionPicker;
