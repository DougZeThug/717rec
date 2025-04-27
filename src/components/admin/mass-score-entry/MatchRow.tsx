
import React from "react";
import { MatchWithTeams } from "./types";
import TeamDisplay from "./components/TeamDisplay";
import ScoreSection from "./components/ScoreSection";
import MatchStatusSection from "./components/MatchStatusSection";
import { Switch } from "@/components/ui/switch";

interface MatchRowProps {
  match: MatchWithTeams;
  index: number;
  isSubmitting?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  onClearError?: (matchId: string) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  index,
  isSubmitting = false,
  hasError = false,
  errorMessage,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  onClearError
}) => {
  console.log(`MatchRow render for match ${match.id}:`, {
    matchId: match.id,
    isCompleted: match.iscompleted,
    scores: `${match.team1Score}-${match.team2Score}`,
    isValid: match.isValid,
    isEdited: match.isEdited
  });

  return (
    <div className={`p-4 rounded-lg bg-background border ${hasError ? 'border-destructive' : 'border-border'}`}>
      <div className="space-y-4">
        {/* Team Names Display */}
        <div className="flex justify-between gap-4">
          <TeamDisplay team={match.team1} align="left" />
          <TeamDisplay team={match.team2} align="right" />
        </div>

        {/* Score Section */}
        <ScoreSection
          match={match}
          onScoreChange={(scores) => onScoreChange(index, scores.team1Score, scores.team2Score)}
          onGameWinsChange={(gameWins) => onGameWinsChange(index, gameWins.team1GameWins, gameWins.team2GameWins)}
          isSubmitting={isSubmitting}
          hasError={hasError}
          errorMessage={errorMessage}
          onClearError={() => onClearError?.(match.id)}
        />

        {/* Match Status Section */}
        <MatchStatusSection
          isCompleted={match.iscompleted}
          onCompletedChange={(checked) => {
            console.log(`MatchRow: onCompletedChange called with ${checked} for match ${match.id}`);
            onMarkCompleted(index, checked);
          }}
          isEdited={match.isEdited}
          isValid={match.isValid}
          disabled={isSubmitting}
        />

        {/* Explicit Mark as Complete toggle */}
        <div className="flex items-center gap-2 pt-2">
          <label className="text-sm font-medium">Mark as Complete</label>
          <Switch
            checked={match.iscompleted}
            onCheckedChange={(value) => {
              console.log(`MatchRow: Direct switch toggled to ${value} for match ${match.id}`);
              onMarkCompleted(index, value);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchRow;
