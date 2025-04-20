
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScoreOption } from "./types";

interface ScoreButtonProps {
  option: ScoreOption;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const ScoreButton: React.FC<ScoreButtonProps> = ({
  option,
  isSelected,
  onClick,
  disabled = false,
}) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className={cn(
        "min-w-[70px] text-base font-medium transition-all",
        isSelected 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-primary/10",
        "relative"
      )}
      disabled={disabled}
    >
      {option.label}
    </Button>
  );
};

export default ScoreButton;
