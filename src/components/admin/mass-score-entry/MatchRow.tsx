
import React from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { MatchWithTeams } from "./types";
import ScoreInput from "./components/ScoreInput";
import MatchStatusIndicator from "./components/MatchStatusIndicator";
import CompletionCheckbox from "./components/CompletionCheckbox";

interface MatchRowProps {
  match: MatchWithTeams;
  onScoreChange: (team: "team1" | "team2", value: string) => void;
  onMarkCompleted: (checked: boolean) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  onScoreChange,
  onMarkCompleted,
  disabled = false,
  hasError = false
}) => {
  if (!match.team1 || !match.team2) return null;

  // Determine if the match has been previously completed and now edited
  const wasCompletedAndEdited = match.iscompleted && match.isEdited;
  
  return (
    <Card className={`overflow-hidden border ${match.isEdited ? "border-blue-300" : ""} ${hasError ? "border-red-400" : ""}`}>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-8 gap-2 p-4">
          {/* Time */}
          <div className="md:col-span-1 text-center md:text-left flex flex-col justify-center">
            <span className="text-sm font-medium">
              {match.date
                ? format(parseISO(match.date), "h:mm a")
                : "No time"}
            </span>
          </div>

          {/* Team 1 */}
          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            <span className="font-medium text-right">{match.team1.name}</span>
          </div>

          {/* Score Input for Team 1 */}
          <div className="md:col-span-1">
            <ScoreInput
              value={match.team1Score}
              onChange={(value) => onScoreChange("team1", value)}
              isValid={match.isValid}
              disabled={disabled}
            />
          </div>

          {/* Separator */}
          <div className="md:col-span-1 flex justify-center items-center">
            <span className="text-muted-foreground">vs</span>
          </div>

          {/* Score Input for Team 2 */}
          <div className="md:col-span-1">
            <ScoreInput
              value={match.team2Score}
              onChange={(value) => onScoreChange("team2", value)}
              isValid={match.isValid}
              disabled={disabled}
            />
          </div>

          {/* Team 2 */}
          <div className="md:col-span-2 flex items-center gap-2">
            <span className="font-medium">{match.team2.name}</span>
          </div>

          {/* Complete Checkbox and Status */}
          <div className="md:col-span-8 flex justify-between items-center mt-2 pt-2 border-t">
            <CompletionCheckbox
              id={`complete-${match.id}`}
              checked={match.iscompleted}
              onCheckedChange={onMarkCompleted}
              disabled={disabled}
            />
            
            <MatchStatusIndicator
              isEdited={match.isEdited}
              wasCompletedAndEdited={wasCompletedAndEdited}
              isCompleted={match.iscompleted}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchRow;
