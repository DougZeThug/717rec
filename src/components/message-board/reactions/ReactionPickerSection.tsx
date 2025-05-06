
import React from "react";
import { Button } from "@/components/ui/button";

interface ReactionPickerSectionProps {
  emojis: string[];
  onSelect: (emoji: string) => void;
  label: string;
}

const ReactionPickerSection: React.FC<ReactionPickerSectionProps> = ({ 
  emojis, 
  onSelect, 
  label 
}) => (
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

export default ReactionPickerSection;
