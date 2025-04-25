
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
  // Handle click event with detailed logging
  const handleClick = () => {
    if (!disabled) {
      console.log("ScoreButton clicked:", {
        scores: `${option.team1Score}-${option.team2Score}`,
        isSelected: Boolean(isSelected),
        wasSelected: isSelected,
        isCompleted,
        label: option.label
      });
      onClick();
    }
  };

  // Force boolean type for isSelected to prevent truthy/falsey issues
  // This is critical for correctly rendering selected state with 0 values
  const selected = Boolean(isSelected);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-md min-w-[3.5rem] h-10 px-3 border transition-colors duration-200",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : isCompleted
            ? "bg-muted hover:bg-muted/80 border-muted-foreground/20"
            : "bg-background hover:bg-muted border-input",
        isCompleted && !selected && "opacity-60",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      data-testid={`score-button-${option.label}`}
      data-selected={selected}
      data-score1={option.team1Score}
      data-score2={option.team2Score}
      aria-pressed={selected}
    >
      {option.label}
    </motion.button>
  );
};

export default ScoreButton;
