
import React from "react";
import { MatchWithTeams } from "./types";
import TeamDisplay from "./components/TeamDisplay";
import ScoreSection from "./components/ScoreSection";
import MatchStatusSection from "./components/MatchStatusSection";
import { cn } from "@/lib/utils";

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
    onGameWinsChange(index, gameWins.team1GameWins, gameWins.team2GameWins);
  };

  return (
    <div className={cn("flex flex-col space-y-4", hasError && "text-destructive")}>
      <div className="flex justify-between items-center">
        <TeamDisplay team={match.team1} />
        <div className="text-sm text-muted-foreground">vs</div>
        <TeamDisplay team={match.team2} />
      </div>

      <ScoreSection
        value={{
          team1Score: typeof match.team1Score === 'number' ? match.team1Score : null,
          team2Score: typeof match.team2Score === 'number' ? match.team2Score : null
        }}
        onScoreChange={handleScoreChange}
        onGameWinsChange={handleGameWinsChange}
        onComplete={() => onMarkCompleted(index, true)}
        disabled={isSubmitting}
        hasError={hasError}
        errorMessage={errorMessage}
        onClearError={onClearError}
        matchId={match.id}
      />

      <MatchStatusSection
        isCompleted={match.iscompleted || false}
        onCompletedChange={(checked) => onMarkCompleted(index, checked)}
        isEdited={match.isEdited || false}
        isValid={match.isValid || false}
        disabled={isSubmitting}
      />
    </div>
  );
};

export default MatchRow;
