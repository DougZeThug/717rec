
import React from "react";
import ScoreButtonGroup from "./ScoreButtonGroup";
import { motion } from "framer-motion";

interface ScoreInputProps {
  value: { team1Score: number | null; team2Score: number | null };
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  onChangeGameWins?: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onComplete?: () => void;
  isValid?: boolean;
  disabled?: boolean;
  className?: string;
  isCompleted?: boolean;
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  onChangeGameWins,
  onComplete,
  isValid = true,
  disabled = false,
  className = "",
  isCompleted = false
}) => {
  return (
    <motion.div 
      className={`w-full flex justify-center ${className}`}
      animate={{ 
        opacity: disabled ? 0.8 : 1
      }}
      transition={{ duration: 0.2 }}
    >
      <ScoreButtonGroup
        value={value}
        onChange={(scores) => {
          onChange(scores);
          if (onChangeGameWins) {
            // Ensure we pass the numeric game wins
            const team1GameWins = scores.team1Score || 0;
            const team2GameWins = scores.team2Score || 0;
            onChangeGameWins({
              team1GameWins,
              team2GameWins
            });
          }
        }}
        onComplete={onComplete}
        disabled={disabled}
        isCompleted={isCompleted}
      />
    </motion.div>
  );
};

export default ScoreInput;
