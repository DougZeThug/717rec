
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
  // Add date type verification on mount and value changes
  React.useEffect(() => {
    console.log(`🔍 ScoreInput initial state [${matchId}]:`, {
      date: matchDate,
      dateType: typeof matchDate,
      isISOString: typeof matchDate === 'string' && !isNaN(Date.parse(matchDate)),
      value,
      valueJSON: JSON.stringify(value),
      valueTypes: {
        team1ScoreType: typeof value.team1Score,
        team2ScoreType: typeof value.team2Score
      }
    });
  }, [matchId, matchDate, value]);

  return (
    <motion.div 
      className={`w-full flex justify-center ${className}`}
      animate={{ 
        opacity: disabled ? 0.8 : 1
      }}
      transition={{ duration: 0.2 }}
      data-match-id={matchId}
      data-match-date={matchDate}
      data-date-type={typeof matchDate}
    >
      <ScoreButtonGroup
        value={value}
        onChange={(gameWins) => {
          console.log("🔍 DIAGNOSTIC: ScoreInput onChange called for match", {
            matchId,
            matchDate,
            dateType: typeof matchDate,
            gameWins,
            gameWinsJSON: JSON.stringify(gameWins),
            gameWinsTypes: {
              team1ScoreType: typeof gameWins.team1Score,
              team2ScoreType: typeof gameWins.team2Score
            },
            previousValue: value,
            previousValueJSON: JSON.stringify(value),
            isCompleted
          });
          
          // Calculate binary match scores based on game wins
          const team1Won = gameWins.team1Score > gameWins.team2Score;
          const matchScores = {
            team1Score: team1Won ? 1 : 0,
            team2Score: team1Won ? 0 : 1
          };
          
          // Log detailed state transformation
          console.log("🔍 DIAGNOSTIC: Converting game wins to match result:", {
            matchId,
            matchDate,
            dateType: typeof matchDate,
            gameWins,
            gameWinsJSON: JSON.stringify(gameWins),
            resultingMatchScores: matchScores,
            matchScoresJSON: JSON.stringify(matchScores),
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
            
            console.log("🔍 DIAGNOSTIC: Passing game wins to handler:", {
              matchId,
              matchDate,
              dateType: typeof matchDate,
              gameWinsData,
              gameWinsDataJSON: JSON.stringify(gameWinsData),
              gameWinsDataTypes: {
                team1GameWinsType: typeof gameWins.team1Score,
                team2GameWinsType: typeof gameWins.team2Score
              }
            });
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
