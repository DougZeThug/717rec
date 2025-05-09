
import React from "react";
import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const isNearLimit = current > max * 0.8;
  const isOverLimit = current > max;

  return (
    <span 
      className={cn(
        "text-xs transition-colors",
        isOverLimit 
          ? "text-destructive font-medium" 
          : isNearLimit 
            ? "text-amber-500 dark:text-amber-400" 
            : "text-muted-foreground"
      )}
    >
      {current}/{max}
    </span>
  );
};

export default CharacterCounter;
