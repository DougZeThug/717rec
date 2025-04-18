
import React from "react";
import { format } from "date-fns";
import { MatchWithTeams } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import MatchRow from "./MatchRow";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MatchesTableProps {
  matches: MatchWithTeams[];
  loading: boolean;
  onScoreChange: (index: number, team: "team1" | "team2", value: string) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
  submitting?: boolean;
  failedMatches?: string[];
  errorMessages?: Record<string, string>;
  onClearError?: (matchId: string) => void;
}

const MatchesTable: React.FC<MatchesTableProps> = ({
  matches,
  loading,
  onScoreChange,
  onMarkCompleted,
  submitting = false,
  failedMatches = [],
  errorMessages = {},
  onClearError
}) => {
  // Group matches by date for better organization
  const matchesByDate: Record<string, MatchWithTeams[]> = {};

  matches.forEach((match) => {
    if (!match.date) return;
    
    const dateKey = format(new Date(match.date), "yyyy-MM-dd");
    if (!matchesByDate[dateKey]) {
      matchesByDate[dateKey] = [];
    }
    
    matchesByDate[dateKey].push(match);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading matches...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No matches found for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {Object.keys(matchesByDate).map((dateKey) => (
        <div key={dateKey}>
          <h3 className="text-lg font-semibold mb-4">
            {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {matchesByDate[dateKey].map((match, idx) => {
              const originalIndex = matches.findIndex(m => m.id === match.id);
              const hasError = failedMatches?.includes(match.id);
              const errorMessage = errorMessages?.[match.id];
              
              return (
                <div key={match.id} className="space-y-2">
                  {hasError && errorMessage && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>{errorMessage}</span>
                        {onClearError && (
                          <button 
                            onClick={() => onClearError(match.id)} 
                            className="text-xs underline"
                          >
                            Dismiss
                          </button>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <MatchRow
                    match={match}
                    disabled={submitting}
                    hasError={hasError}
                    onScoreChange={(team, value) => onScoreChange(originalIndex, team, value)}
                    onMarkCompleted={(checked) => onMarkCompleted(originalIndex, checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchesTable;
