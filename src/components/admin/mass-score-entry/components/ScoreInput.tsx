
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
        onChange={(gameWins) => {
          console.log("🎮 ScoreInput onChange called with game wins:", gameWins);
          
          // Calculate binary match scores based on game wins
          const team1Won = gameWins.team1Score > gameWins.team2Score;
          const matchScores = {
            team1Score: team1Won ? 1 : 0,
            team2Score: team1Won ? 0 : 1
          };
          
          // Update match scores (binary win/loss)
          onChange(matchScores);
          
          // If we have a game wins handler, pass the actual game wins
          if (onChangeGameWins) {
            onChangeGameWins({
              team1GameWins: gameWins.team1Score,
              team2GameWins: gameWins.team2Score
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
