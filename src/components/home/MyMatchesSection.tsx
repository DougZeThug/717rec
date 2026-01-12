import React from 'react';

import MyNextMatchCard from '@/components/home/MyNextMatchCard';
import { Match } from '@/types';

interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface MatchWithOpponent {
  match: Match;
  opponent: TeamInfo;
  weekNumber: number | null;
}

interface MyMatchesSectionProps {
  matches: MatchWithOpponent[];
  myTeam: TeamInfo;
  isPreviousMatches: boolean;
}

const MyMatchesSection: React.FC<MyMatchesSectionProps> = ({
  matches,
  myTeam,
  isPreviousMatches,
}) => {
  if (matches.length === 0) return null;

  // Determine header text based on count and type
  const getHeaderText = (isFirst: boolean) => {
    if (!isFirst) return undefined; // No header for subsequent cards
    
    if (isPreviousMatches) {
      return matches.length > 1 ? 'Your Last Matches' : 'Your Last Match';
    }
    return matches.length > 1 ? 'Your Next Matches' : 'Your Next Match';
  };

  return (
    <div className="flex flex-col gap-3">
      {matches.map((matchInfo, index) => (
        <MyNextMatchCard
          key={matchInfo.match.id}
          match={matchInfo.match}
          myTeam={myTeam}
          opponent={matchInfo.opponent}
          weekNumber={matchInfo.weekNumber}
          isPrevious={isPreviousMatches}
          showHeader={index === 0}
          headerText={getHeaderText(index === 0)}
        />
      ))}
    </div>
  );
};

export default MyMatchesSection;
