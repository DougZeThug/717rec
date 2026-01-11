import React from 'react';

import { Match, Team } from '@/types';

import MatchCard from './MatchCard';
import RecentMatchesSkeleton from './RecentMatchesSkeleton';

interface RecentMatchesProps {
  completedMatches: Match[];
  getTeamById: (id: string) => Team | undefined;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  isLoading?: boolean;
}

const RecentMatches: React.FC<RecentMatchesProps> = ({
  completedMatches,
  getTeamById,
  formatDate,
  formatTime,
  isLoading = false,
}) => {
  if (isLoading) {
    return <RecentMatchesSkeleton />;
  }

  return (
    <section id="recent-matches-section" className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedMatches.map((match) => {
          const team1 = getTeamById(match.team1Id);
          const team2 = getTeamById(match.team2Id);

          if (!team1 || !team2) return null;

          return (
            <MatchCard
              key={match.id}
              match={match}
              team1={team1}
              team2={team2}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          );
        })}
      </div>
    </section>
  );
};

export default RecentMatches;
