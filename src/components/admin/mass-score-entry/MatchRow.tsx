import React from "react";
import { MatchWithTeams } from "./types";
import TeamDisplay from "./components/TeamDisplay";
import ScoreSection from "./components/ScoreSection";
import MatchStatusSection from "./components/MatchStatusSection";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface MatchRowProps {
  match: MatchWithTeams;
  index: number;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  isSubmitting: boolean;
  hasError: boolean;
  errorMessage?: string;
  onClearError?: (matchId: string) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  index,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  isSubmitting,
  hasError,
  errorMessage,
  onClearError
}) => {
  // Add date type verification on mount
  React.useEffect(() => {
    console.log(`🔍 MatchRow date verification [${match.id}]:`, {
      date: match.date,
      type: typeof match.date,
      isISOString: typeof match.date === 'string' && !isNaN(Date.parse(match.date))
    });
  }, [match.id, match.date]);

  // Log match data at component initialization
  React.useEffect(() => {
    console.log(`🔍 DIAGNOSTIC: MatchRow initialized for match:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      dateObj: match.date ? new Date(match.date).toISOString() : null,
      index,
      team1: match.team1?.name,
      team2: match.team2?.name, 
      scores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins
      },
      types: {
        team1ScoreType: typeof match.team1Score,
        team2ScoreType: typeof match.team2Score,
        team1GameWinsType: typeof match.team1_game_wins,
        team2GameWinsType: typeof match.team2_game_wins
      },
      isCompleted: match.iscompleted,
      hasError,
      fullMatch: JSON.stringify(match)
    });
  }, [match.id]);

  const handleScoreChange = (scores: { team1Score: number; team2Score: number }) => {
    console.log(`🔍 DIAGNOSTIC: MatchRow handleScoreChange for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      index,
      scores,
      previousScores: {
        team1Score: match.team1Score,
        team2Score: match.team2Score
      }
    });
    
    // Ensure we're passing numbers, not strings or null
    const team1Score = Number(scores.team1Score);
    const team2Score = Number(scores.team2Score);
    
    onScoreChange(index, team1Score, team2Score);
  };

  const handleGameWinsChange = (gameWins: { team1GameWins: number; team2GameWins: number }) => {
    // Ensure we pass integer values for game wins
    const team1GameWins = parseInt(String(gameWins.team1GameWins)) || 0;
    const team2GameWins = parseInt(String(gameWins.team2GameWins)) || 0;
    
    console.log(`🔍 DIAGNOSTIC: MatchRow handleGameWinsChange for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      dateType: typeof match.date,
      index,
      team1GameWins,
      team2GameWins,
      previousGameWins: {
        team1GameWins: match.team1_game_wins,
        team2GameWins: match.team2_game_wins
      },
      gameWinsType: {
        team1GameWinsType: typeof team1GameWins,
        team2GameWinsType: typeof team2GameWins
      }
    });
    
    onGameWinsChange(index, team1GameWins, team2GameWins);
  };
  
  const isCompleted = match.iscompleted || false;
  
  // Determine which team is winning (if any) based on match scores (binary indicators)
  const team1Winning = match.team1Score === 1;
  const team2Winning = match.team2Score === 1;
  
  // Make sure game wins are treated as numbers
  const team1GameWins = match.team1_game_wins !== null && typeof match.team1_game_wins !== 'undefined' 
    ? Number(match.team1_game_wins) 
    : null;
    
  const team2GameWins = match.team2_game_wins !== null && typeof match.team2_game_wins !== 'undefined' 
    ? Number(match.team2_game_wins) 
    : null;
  
  return (
    <motion.div 
      className={cn(
        "flex flex-col space-y-4 p-4 border rounded-lg transition-all duration-200",
        isCompleted ? "bg-muted/20" : "bg-card",
        hasError ? "border-destructive" : isCompleted ? "border-green-500/30" : "border-border"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      data-match-id={match.id}
      data-match-date={match.date}
      data-index={index}
    >
      <div className="flex justify-between items-center">
        <div className={cn("flex items-center gap-2", team1Winning && isCompleted && "text-primary font-medium")}>
          <TeamDisplay team={match.team1} />
          {team1Winning && isCompleted && <Crown className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="text-sm text-muted-foreground">vs</div>
        <div className={cn("flex items-center gap-2", team2Winning && isCompleted && "text-primary font-medium")}>
          {team2Winning && isCompleted && <Crown className="h-4 w-4 text-yellow-500" />}
          <TeamDisplay team={match.team2} />
        </div>
      </div>

      <ScoreSection
        value={{
          team1Score: team1GameWins,
          team2Score: team2GameWins
        }}
        onScoreChange={handleScoreChange}
        onGameWinsChange={handleGameWinsChange}
        onComplete={() => {
          console.log(`🔍 DIAGNOSTIC: MatchRow onComplete called for match ${match.id}:`, {
            matchId: match.id,
            matchDate: match.date,
            dateType: typeof match.date,
            index,
            team1GameWins,
            team2GameWins
          });
          onMarkCompleted(index, true);
        }}
        disabled={isSubmitting || (isCompleted && !match.isEdited)}
        hasError={hasError}
        errorMessage={errorMessage}
        onClearError={onClearError}
        matchId={match.id}
        isCompleted={isCompleted}
        matchDate={match.date}
      />

      <MatchStatusSection
        isCompleted={isCompleted}
        onCompletedChange={(checked) => {
          console.log(`🔍 DIAGNOSTIC: MatchRow onCompletedChange to ${checked} for match ${match.id}:`, {
            matchId: match.id,
            matchDate: match.date,
            dateType: typeof match.date,
            index,
            previousState: isCompleted,
            team1GameWins,
            team2GameWins
          });
          onMarkCompleted(index, checked);
        }}
        isEdited={match.isEdited || false}
        isValid={match.isValid || false}
        disabled={isSubmitting}
      />
    </motion.div>
  );
};

export default MatchRow;
