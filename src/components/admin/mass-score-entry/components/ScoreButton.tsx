
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoreButtonProps {
  option: {
    team1Score: number;
    team2Score: number;
    label: string;
  };
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  isCompleted?: boolean;
}

const ScoreButton = ({
  option,
  isSelected,
  onClick,
  disabled = false,
  isCompleted = false
}: ScoreButtonProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-md min-w-[3.5rem] h-10 px-3 border transition-all duration-200",
        isSelected
          ? "bg-primary text-primary-foreground border-primary"
          : isCompleted
            ? "bg-muted hover:bg-muted/80 border-muted-foreground/20"
            : "bg-background hover:bg-muted border-input",
        isCompleted && !isSelected && "opacity-60",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {option.label}
    </motion.button>
  );
};

export default ScoreButton;
