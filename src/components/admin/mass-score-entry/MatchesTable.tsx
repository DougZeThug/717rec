
import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { MatchWithTeams } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import DateMatchGroup from "./components/DateMatchGroup";
import { Loader2 } from "lucide-react";

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
  // Create a stable mapping of matches to their original indices
  const matchesByDate = useMemo(() => {
    const groups = matches.reduce((acc, match, originalIndex) => {
      if (!match.date) return acc;
      const dateKey = format(new Date(match.date), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: new Date(match.date),
          matches: []
        };
      }
      // Store the original index with each match
      acc[dateKey].matches.push({ ...match, originalIndex });
      return acc;
    }, {} as Record<string, { date: Date; matches: (MatchWithTeams & { originalIndex: number })[] }>);

    return Object.values(groups).sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }, [matches]);

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

  const totalDates = matchesByDate.length;
  const defaultExpanded = totalDates <= 3;

  return (
    <div className="space-y-4">
      {matchesByDate.map(({ date, matches: dateMatches }) => (
        <DateMatchGroup
          key={format(date, "yyyy-MM-dd")}
          date={date}
          matches={dateMatches}
          defaultExpanded={defaultExpanded}
          onScoreChange={onScoreChange}
          onGameWinsChange={onGameWinsChange}
          onMarkCompleted={onMarkCompleted}
          submitting={submitting}
          failedMatches={failedMatches}
          errorMessages={errorMessages}
          onClearError={onClearError}
        />
      ))}
    </div>
  );
};

export default MatchesTable;
