
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
  matchId?: string; // Match ID for debugging
  matchDate?: string; // Match date for debugging
}

const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  onChangeGameWins,
  onComplete,
  isValid = true,
  disabled = false,
  className = "",
  isCompleted = false,
  matchId,
  matchDate
}) => {
  // Log data at initialization
  React.useEffect(() => {
    console.log(`%c ScoreInput for match ${matchId} initialized with:`, "background: #e8f5e9; color: #2e7d32; font-weight: bold", {
      matchId,
      matchDate,
      initialValue: value,
      isCompleted,
      disabled
    });
  }, [matchId, matchDate]);

  // Log on each render to track state changes
  console.log(`%c ScoreInput rendering`, "background: #c8e6c9; color: #2e7d32", {
    matchId,
    matchDate,
    currentValue: value,
    isCompleted,
    disabled,
    isValid
  });

  return (
    <motion.div 
      className={`w-full flex justify-center ${className}`}
      animate={{ 
        opacity: disabled ? 0.8 : 1
      }}
      transition={{ duration: 0.2 }}
      data-match-id={matchId}
      data-match-date={matchDate}
    >
      <ScoreButtonGroup
        value={value}
        onChange={(gameWins) => {
          console.log("%c 🎮 ScoreInput onChange called for match", "background: #81c784; color: #1b5e20; font-weight: bold", {
            matchId,
            matchDate,
            gameWins,
            previousValue: value
          });
          
          // Calculate binary match scores based on game wins
          const team1Won = gameWins.team1Score > gameWins.team2Score;
          const matchScores = {
            team1Score: team1Won ? 1 : 0,
            team2Score: team1Won ? 0 : 1
          };
          
          // Log detailed state transformation
          console.log("%c Converting game wins to match result:", "color: #1b5e20", {
            gameWins,
            resultingMatchScores: matchScores,
            team1Won
          });
          
          // Update match scores (binary win/loss)
          onChange(matchScores);
          
          // If we have a game wins handler, pass the actual game wins
          if (onChangeGameWins) {
            const gameWinsData = {
              team1GameWins: gameWins.team1Score,
              team2GameWins: gameWins.team2Score
            };
            
            console.log("%c Passing game wins to handler:", "color: #1b5e20", gameWinsData);
            onChangeGameWins(gameWinsData);
          }
        }}
        onComplete={onComplete}
        disabled={disabled}
        isCompleted={isCompleted}
        matchId={matchId}
        matchDate={matchDate}
      />
    </motion.div>
  );
};

export default ScoreInput;
