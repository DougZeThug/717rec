
import React from "react";
import { format } from "date-fns";
import { MatchWithTeams } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import MatchRow from "./MatchRow";
import { Loader2, AlertCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";

interface MatchesTableProps {
  matches: MatchWithTeams[];
  loading: boolean;
  onScoreChange: (index: number, team1Score: number, team2Score: number) => void;
  onGameWinsChange: (index: number, team1GameWins: number, team2GameWins: number) => void;
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
  onGameWinsChange,
  onMarkCompleted,
  submitting = false,
  failedMatches = [],
  errorMessages = {},
  onClearError
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading matches...</span>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
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

  // Group matches by date - added try/catch for safety
  try {
    const matchesByDate = matches.reduce((acc, match) => {
      if (!match || !match.date) return acc;
      const dateKey = format(new Date(match.date), "yyyy-MM-dd");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(match);
      return acc;
    }, {} as Record<string, MatchWithTeams[]>);

    return (
      <div className="space-y-8">
        {Object.entries(matchesByDate).map(([dateKey, dayMatches]) => (
          <motion.div 
            key={dateKey} 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dayMatches.map((match, idx) => {
                if (!match || !match.id) return null;
                
                const originalIndex = matches.findIndex(m => m.id === match.id);
                const hasError = failedMatches?.includes(match.id);
                const errorMessage = errorMessages?.[match.id];
                
                return (
                  <div key={match.id} className="flex flex-col gap-2">
                    {hasError && errorMessage && (
                      <Alert variant="destructive" className="mb-2 py-2">
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
                      index={originalIndex}
                      isSubmitting={submitting}
                      hasError={hasError}
                      errorMessage={errorMessage}
                      onScoreChange={onScoreChange}
                      onGameWinsChange={onGameWinsChange}
                      onMarkCompleted={onMarkCompleted}
                      onClearError={onClearError}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error rendering matches:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          There was an error displaying the matches. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
};

export default MatchesTable;
