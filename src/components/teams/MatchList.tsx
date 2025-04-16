
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import MatchCard from "./MatchCard";

interface MatchListProps {
  title: string;
  matches: Match[];
  isLoading: boolean;
  teamId: string;
  isPast?: boolean;
  getOpponentId: (match: Match) => string;
  getMatchResult?: (match: Match) => string;
  getScoreDisplay?: (match: Match) => string;
}

const MatchList = ({
  title,
  matches,
  isLoading,
  teamId,
  isPast = false,
  getOpponentId,
  getMatchResult,
  getScoreDisplay
}: MatchListProps) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : matches.length > 0 ? (
        <div className={`space-y-4 ${!isPast ? 'mb-8' : ''}`}>
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              opponentId={getOpponentId(match)}
              isPastMatch={isPast}
              matchResult={isPast && getMatchResult ? getMatchResult(match) : undefined}
              scoreDisplay={isPast && getScoreDisplay ? getScoreDisplay(match) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className={`text-gray-500 ${!isPast ? 'mb-8' : ''}`}>
          {isPast ? 'No past matches found.' : 'No upcoming matches scheduled.'}
        </p>
      )}
    </>
  );
};

export default MatchList;
