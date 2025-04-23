
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
  const handleScoreChange = (scores: { team1Score: number; team2Score: number }) => {
    onScoreChange(index, scores.team1Score, scores.team2Score);
  };

  const handleGameWinsChange = (gameWins: { team1GameWins: number; team2GameWins: number }) => {
    // Ensure we pass integer values
    const team1GameWins = parseInt(String(gameWins.team1GameWins)) || 0;
    const team2GameWins = parseInt(String(gameWins.team2GameWins)) || 0;
    onGameWinsChange(index, team1GameWins, team2GameWins);
  };
  
  const isCompleted = match.iscompleted || false;
  
  // Determine which team is winning (if any)
  const team1Winning = match.team1Score !== null && match.team2Score !== null && match.team1Score > match.team2Score;
  const team2Winning = match.team1Score !== null && match.team2Score !== null && match.team2Score > match.team1Score;
  
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
          team1Score: typeof match.team1Score === 'number' ? match.team1Score : null,
          team2Score: typeof match.team2Score === 'number' ? match.team2Score : null
        }}
        onScoreChange={handleScoreChange}
        onGameWinsChange={handleGameWinsChange}
        onComplete={() => onMarkCompleted(index, true)}
        disabled={isSubmitting || (isCompleted && !match.isEdited)}
        hasError={hasError}
        errorMessage={errorMessage}
        onClearError={onClearError}
        matchId={match.id}
        isCompleted={isCompleted}
      />

      <MatchStatusSection
        isCompleted={isCompleted}
        onCompletedChange={(checked) => onMarkCompleted(index, checked)}
        isEdited={match.isEdited || false}
        isValid={match.isValid || false}
        disabled={isSubmitting}
      />
    </motion.div>
  );
};

export default MatchRow;
