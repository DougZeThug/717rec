
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onClick: () => void;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({ 
  emoji, 
  count, 
  hasReacted, 
  onClick 
}) => {
  return (
    <Button
      variant="outline"
      size="xs"
      className={cn(
        "py-0 h-6 px-1.5 gap-1 text-xs border border-gray-200 dark:border-gray-700 bg-background/80",
        hasReacted && "bg-accent/30"
      )}
      onClick={onClick}
    >
      <span className="text-sm">{emoji}</span>
      {count > 0 && <span className="text-xs font-medium">{count}</span>}
    </Button>
  );
};

export default ReactionButton;
