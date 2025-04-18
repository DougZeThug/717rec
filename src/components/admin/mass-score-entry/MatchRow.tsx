import React from "react";
import { MatchWithTeams } from "../types";
import { cn } from "@/lib/utils";
import ScoreInput from "./components/ScoreInput";
import CompletionCheckbox from "./components/CompletionCheckbox";
import MatchStatusIndicator from "./components/MatchStatusIndicator";

interface MatchRowProps {
  match: MatchWithTeams;
  isSubmitting: boolean;
  failedMatch?: { matchId: string; errorMessage: string };
  onScoreChange: (team: 'team1' | 'team2', value: string) => void;
  onMarkCompleted: (checked: boolean) => void;
}

const MatchRow = ({ match, isSubmitting, failedMatch, onScoreChange, onMarkCompleted }: MatchRowProps) => {
  const errorMessage = failedMatch?.errorMessage;
  
  const handleScoreChange = (scores: { team1Score: number; team2Score: number }) => {
    onScoreChange('team1', scores.team1Score.toString());
    onScoreChange('team2', scores.team2Score.toString());
  };

  return (
    <tr className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      errorMessage ? "bg-destructive/10" : ""
    )}>
      <td className="py-4 px-2">
        <div className="flex items-center gap-2">
          <MatchStatusIndicator isValid={match.isValid} isCompleted={match.iscompleted} />
          <span>{match.team1?.name || "TBD"}</span>
        </div>
      </td>
      
      <td className="py-4 px-4">
        <div className="flex flex-col items-center gap-2">
          <ScoreInput
            value={{
              team1Score: match.team1Score,
              team2Score: match.team2Score
            }}
            onChange={handleScoreChange}
            isValid={match.isValid}
            disabled={isSubmitting}
          />
          {errorMessage && (
            <p className="text-sm text-destructive mt-1">{errorMessage}</p>
          )}
        </div>
      </td>

      <td className="py-4 px-2">
        <span>{match.team2?.name || "TBD"}</span>
      </td>

      <td className="py-4 px-4">
        <CompletionCheckbox
          checked={match.iscompleted}
          onCheckedChange={(checked) => onMarkCompleted(checked)}
          disabled={isSubmitting || !match.isValid}
        />
      </td>
    </tr>
  );
};

export default MatchRow;
