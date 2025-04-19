
import { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import MatchCard from "./MatchCard";

interface MatchListProps {
  title: string;
  matches: Match[];
  isLoading: boolean;
  teamId: string;
  isPast?: boolean;
}

const MatchList = ({
  title,
  matches,
  isLoading,
  teamId,
  isPast = false,
}: MatchListProps) => {
  const getOpponentId = (match: Match) => {
    return match.team1Id === teamId ? match.team2Id : match.team1Id;
  };

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
