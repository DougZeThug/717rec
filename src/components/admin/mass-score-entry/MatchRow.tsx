
import React from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MatchWithTeams } from "./types";
import { Edit, Check } from "lucide-react";

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
            <Input
              type="number"
              min="0"
              value={match.team1Score === null ? "" : match.team1Score}
              onChange={(e) => onScoreChange("team1", e.target.value)}
              className={`w-full text-center ${!match.isValid ? "border-red-500" : ""}`}
              disabled={disabled}
            />
          </div>

          {/* Separator */}
          <div className="md:col-span-1 flex justify-center items-center">
            <span className="text-muted-foreground">vs</span>
          </div>

          {/* Score Input for Team 2 */}
          <div className="md:col-span-1">
            <Input
              type="number"
              min="0"
              value={match.team2Score === null ? "" : match.team2Score}
              onChange={(e) => onScoreChange("team2", e.target.value)}
              className={`w-full text-center ${!match.isValid ? "border-red-500" : ""}`}
              disabled={disabled}
            />
          </div>

          {/* Team 2 */}
          <div className="md:col-span-2 flex items-center gap-2">
            <span className="font-medium">{match.team2.name}</span>
          </div>

          {/* Complete Checkbox */}
          <div className="md:col-span-8 flex justify-between items-center mt-2 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`complete-${match.id}`}
                checked={match.iscompleted}
                onCheckedChange={onMarkCompleted}
                disabled={disabled}
              />
              <label
                htmlFor={`complete-${match.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mark as completed
              </label>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {match.isEdited && (
                <span className="text-xs text-blue-500 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </span>
              )}
              {wasCompletedAndEdited && (
                <span className="text-xs text-amber-500 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Rescored
                </span>
              )}
              {match.iscompleted && !match.isEdited && (
                <span className="text-xs text-green-500 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchRow;
