import React, { useMemo } from "react";
import { format } from "date-fns";
import { MatchWithTeams } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import DateMatchGroup from "./components/DateMatchGroup";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import MatchesTableSkeleton from "./MatchesTableSkeleton";

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
  // Add index reference to each match for stable references
  const indexedMatches = useMemo(() => {
    return matches.map((match, index) => ({
      ...match,
      id: `${match.id}-index-${index}` // Store original index in ID for reference
    }));
  }, [matches]);

  const matchesByDate = useMemo(() => {
    const groups = indexedMatches.reduce((acc, match) => {
      if (!match.date) return acc;
      const dateKey = format(new Date(match.date), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: new Date(match.date),
          matches: []
        };
      }
      acc[dateKey].matches.push(match);
      return acc;
    }, {} as Record<string, { date: Date; matches: MatchWithTeams[] }>);

    return Object.values(groups).sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }, [indexedMatches]);

  if (loading) {
    return <MatchesTableSkeleton />;
  }

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-0">
          <EmptyState
            icon={Search}
            title="No Matches Found"
            description="No matches match your current filters. Try adjusting your date range or team selection."
            className="py-8"
          />
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
