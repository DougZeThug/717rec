
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { MatchWithTeams } from "./types";
import ScoreInput from "./components/ScoreInput";
import MatchStatusIndicator from "./components/MatchStatusIndicator";
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

  const handleCompletionChange = (checked: boolean) => {
    onMarkCompleted(index, checked);
  };

  const TeamDisplay = ({ team, logoUrl }: { team: { name?: string, logoUrl?: string }, logoUrl?: string }) => (
    <div className="flex items-center gap-2">
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      )}
      <span className="font-medium">{team?.name || "TBD"}</span>
    </div>
  );

  return (
    <div className={cn("flex flex-col space-y-4", hasError && "text-destructive")}>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <TeamDisplay team={match.team1} logoUrl={match.team1?.logoUrl} />
          <div className="text-sm text-muted-foreground">vs</div>
          <TeamDisplay team={match.team2} logoUrl={match.team2?.logoUrl} />
        </div>

        <div className="flex flex-col items-center space-y-4">
          <ScoreInput
            value={{
              team1Score: typeof match.team1Score === 'number' ? match.team1Score : null,
              team2Score: typeof match.team2Score === 'number' ? match.team2Score : null
            }}
            onChange={handleScoreChange}
            onChangeGameWins={handleGameWinsChange}
            onComplete={() => handleCompletionChange(true)}
            disabled={isSubmitting}
          />
          
          {hasError && (
            <div className="text-xs text-destructive flex items-center gap-2">
              <span>{errorMessage || "Invalid score"}</span>
              {onClearError && (
                <button
                  onClick={() => onClearError(match.id)}
                  className="underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={match.iscompleted}
              onCheckedChange={handleCompletionChange}
              disabled={isSubmitting}
            />
            <span className="text-sm">Completed</span>
          </div>
          <MatchStatusIndicator
            isEdited={match.isEdited}
            isValid={match.isValid}
            isCompleted={match.iscompleted}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchRow;
