
import React from "react";
import { MatchWithTeams } from "../types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchScoreRowProps {
  match: MatchWithTeams;
  index: number;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onClearError?: (matchId: string) => void;
}

const MatchScoreRow: React.FC<MatchScoreRowProps> = ({
  match,
  index,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  submitting,
  hasError = false,
  errorMessage,
  onClearError
}) => {
  // Validation status
  const hasValidScores = match.team1Score !== null && match.team2Score !== null;
  const hasValidGameWins = match.team1_game_wins !== null && match.team2_game_wins !== null;
  const isReadyToSubmit = match.isEdited && match.isValid && match.iscompleted;

  const getValidationIcon = () => {
    if (isReadyToSubmit) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (match.isEdited && (!match.isValid || !match.iscompleted)) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return null;
  };

  const getValidationMessage = () => {
    if (isReadyToSubmit) return "Ready to submit";
    if (!match.isEdited) return "Not edited";
    if (!match.iscompleted) return "Mark as completed";
    if (!match.isValid) return "Invalid scores";
    return "";
  };

  return (
    <div className={cn(
      "p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors",
      hasError && "bg-red-50 dark:bg-red-950/20",
      isReadyToSubmit && "bg-green-50 dark:bg-green-950/20"
    )}>
      {hasError && errorMessage && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          {onClearError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearError(match.id)}
              className="h-auto p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-12 gap-2 items-center text-sm">
        {/* Team Names */}
        <div className="col-span-4 space-y-1">
          <div className="font-medium truncate">{match.team1?.name || "Team 1"}</div>
          <div className="font-medium truncate">{match.team2?.name || "Team 2"}</div>
        </div>

        {/* Match Scores */}
        <div className="col-span-2 space-y-1">
          <Input
            type="number"
            value={match.team1Score ?? ""}
            onChange={(e) => onScoreChange(index, parseInt(e.target.value) || 0, match.team2Score ?? 0)}
            placeholder="0"
            className="h-8 text-center"
            disabled={submitting}
          />
          <Input
            type="number"
            value={match.team2Score ?? ""}
            onChange={(e) => onScoreChange(index, match.team1Score ?? 0, parseInt(e.target.value) || 0)}
            placeholder="0"
            className="h-8 text-center"
            disabled={submitting}
          />
        </div>

        {/* Game Wins */}
        <div className="col-span-2 space-y-1">
          <Input
            type="number"
            value={match.team1_game_wins ?? ""}
            onChange={(e) => onGameWinsChange(index, parseInt(e.target.value) || 0, match.team2_game_wins ?? 0)}
            placeholder="0"
            className="h-8 text-center"
            disabled={submitting}
          />
          <Input
            type="number"
            value={match.team2_game_wins ?? ""}
            onChange={(e) => onGameWinsChange(index, match.team1_game_wins ?? 0, parseInt(e.target.value) || 0)}
            placeholder="0"
            className="h-8 text-center"
            disabled={submitting}
          />
        </div>

        {/* Completed Checkbox */}
        <div className="col-span-2 flex justify-center">
          <Checkbox
            checked={match.iscompleted}
            onCheckedChange={(checked) => onMarkCompleted(index, checked as boolean)}
            disabled={submitting}
          />
        </div>

        {/* Validation Status */}
        <div className="col-span-2 flex items-center gap-2">
          {getValidationIcon()}
          <span className="text-xs text-muted-foreground truncate">
            {getValidationMessage()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchScoreRow;
