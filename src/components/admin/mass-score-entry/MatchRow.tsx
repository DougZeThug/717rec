
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/utils/scheduleUtils";
import { MatchWithTeams } from "./types";
import ScoreInput from "./components/ScoreInput";
import MatchStatusIndicator from "./components/MatchStatusIndicator";

interface MatchRowProps {
  match: MatchWithTeams;
  index: number;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
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
  onMarkCompleted,
  isSubmitting,
  hasError,
  errorMessage,
  onClearError
}) => {
  const handleScoreChange = (scores: { team1Score: number; team2Score: number }) => {
    onScoreChange(index, scores.team1Score, scores.team2Score);
  };

  const handleCompletionChange = (checked: boolean) => {
    onMarkCompleted(index, checked);
  };

  return (
    <tr className={hasError ? "bg-red-50" : ""}>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        {formatDate(match.date)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center">
          {match.team1?.logoUrl && (
            <img
              src={match.team1.logoUrl}
              alt=""
              className="h-6 w-6 mr-2 rounded-full"
            />
          )}
          <span>{match.team1?.name || "Team 1"}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center">
          {match.team2?.logoUrl && (
            <img
              src={match.team2.logoUrl}
              alt=""
              className="h-6 w-6 mr-2 rounded-full"
            />
          )}
          <span>{match.team2?.name || "Team 2"}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ScoreInput
          value={{
            team1Score: typeof match.team1Score === 'number' ? match.team1Score : null,
            team2Score: typeof match.team2Score === 'number' ? match.team2Score : null
          }}
          onChange={handleScoreChange}
          onComplete={() => handleCompletionChange(true)}
          disabled={isSubmitting}
        />
        {hasError && (
          <div className="text-xs text-red-600 mt-1">
            {errorMessage || "Invalid score"}
            {onClearError && (
              <button
                onClick={() => onClearError(match.id)}
                className="ml-2 text-xs underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <Checkbox
          checked={match.iscompleted}
          onCheckedChange={handleCompletionChange}
          disabled={isSubmitting}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <MatchStatusIndicator
          isEdited={match.isEdited}
          isValid={match.isValid}
          isCompleted={match.iscompleted}
        />
      </td>
    </tr>
  );
};

export default MatchRow;
