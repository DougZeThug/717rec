import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ScoreStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  teamLogo?: string | null;
  teamName?: string;
  accentColor?: "blue" | "red";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  showWinnerIndicator?: boolean;
  isWinning?: boolean;
}

export const ScoreStepper: React.FC<ScoreStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  teamLogo,
  teamName,
  accentColor = "blue",
  size = "md",
  disabled = false,
  showWinnerIndicator = false,
  isWinning = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");

  const handleIncrement = () => {
    if (value < max && !disabled) {
      setDirection("up");
      setIsAnimating(true);
      onChange(value + 1);
      setTimeout(() => setIsAnimating(false), 150);
    }
  };

  const handleDecrement = () => {
    if (value > min && !disabled) {
      setDirection("down");
      setIsAnimating(true);
      onChange(value - 1);
      setTimeout(() => setIsAnimating(false), 150);
    }
  };

  const sizeClasses = {
    sm: {
      container: "gap-1",
      button: "h-8 w-8",
      score: "text-xl min-w-[3rem]",
      label: "text-xs",
      logo: "w-4 h-4",
    },
    md: {
      container: "gap-2",
      button: "h-10 w-10",
      score: "text-2xl min-w-[4rem]",
      label: "text-sm",
      logo: "w-5 h-5",
    },
    lg: {
      container: "gap-3",
      button: "h-12 w-12",
      score: "text-3xl min-w-[5rem]",
      label: "text-base",
      logo: "w-6 h-6",
    },
  };

  const accentClasses = {
    blue: {
      button: "hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200 dark:hover:bg-blue-900/30",
      ring: "focus-visible:ring-blue-500",
      winning: "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20",
    },
    red: {
      button: "hover:bg-red-100 hover:text-red-600 active:bg-red-200 dark:hover:bg-red-900/30",
      ring: "focus-visible:ring-red-500",
      winning: "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20",
    },
  };

  const sizes = sizeClasses[size];
  const accent = accentClasses[accentColor];

  return (
    <div className={cn("flex flex-col items-center", sizes.container)}>
      {/* Team Label */}
      {label && (
        <div className={cn("flex items-center gap-1.5 mb-1", sizes.label)}>
          {teamLogo && (
            <div className={cn("rounded-full overflow-hidden bg-muted", sizes.logo)}>
              <img
                src={teamLogo}
                alt={teamName || "Team"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <span className="font-medium text-muted-foreground truncate max-w-[120px]">
            {label}
          </span>
        </div>
      )}

      {/* Stepper Controls */}
      <div
        className={cn(
          "flex items-center rounded-xl border bg-card p-1 transition-all duration-200",
          sizes.container,
          showWinnerIndicator && isWinning && accent.winning
        )}
      >
        {/* Decrement Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={cn(
            "rounded-lg transition-all duration-150",
            sizes.button,
            accent.button,
            accent.ring,
            "disabled:opacity-40"
          )}
          aria-label="Decrease score"
        >
          <Minus className="h-4 w-4" />
        </Button>

        {/* Score Display */}
        <div
          className={cn(
            "relative flex items-center justify-center font-bold tabular-nums overflow-hidden",
            sizes.score
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{
                y: direction === "up" ? 20 : -20,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: direction === "up" ? -20 : 20,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                duration: 0.15,
              }}
              className={cn(
                isAnimating && "text-primary"
              )}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Increment Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={cn(
            "rounded-lg transition-all duration-150",
            sizes.button,
            accent.button,
            accent.ring,
            "disabled:opacity-40"
          )}
          aria-label="Increase score"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Winner Indicator */}
      {showWinnerIndicator && isWinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-1 text-xs font-medium text-green-600 dark:text-green-400"
        >
          Leading
        </motion.div>
      )}
    </div>
  );
};

export default ScoreStepper;
