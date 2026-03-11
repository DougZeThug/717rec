import { TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

import { Match } from '@/types';

interface TeamTrendProps {
  recentMatches: Match[];
  teamId: string;
  limit?: number;
}

const TeamTrend: React.FC<TeamTrendProps> = ({ recentMatches, teamId, limit = 5 }) => {
  // Sort matches by date (newest first)
  const sortedMatches = [...recentMatches]
    .filter((match) => match.iscompleted)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);

  if (sortedMatches.length === 0) {
    return <div className="text-sm text-gray-500">No recent matches</div>;
  }

  // Calculate current streak
  let currentStreak = 0;
  const isWinStreak = sortedMatches[0].winnerId === teamId;

  for (const match of sortedMatches) {
    const isWin = match.winnerId === teamId;

    if (isWin === isWinStreak) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Generate the trend display
  const _trend = sortedMatches
    .map((match) => {
      const isWin = match.winnerId === teamId;
      return isWin ? 'W' : 'L';
    })
    .join('-');

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <span className="text-sm font-medium mr-2">Current Streak:</span>
        <div className={`flex items-center ${isWinStreak ? 'text-green-500' : 'text-red-500'}`}>
          {isWinStreak ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          <span className="font-medium">
            {currentStreak > 0 ? `${isWinStreak ? 'W' : 'L'}${currentStreak}` : 'None'}
          </span>
        </div>
      </div>

      <div className="flex items-center">
        <span className="text-sm font-medium mr-2">Recent Matches:</span>
        <div className="flex space-x-1">
          {sortedMatches.map((match, index) => {
            const isWin = match.winnerId === teamId;
            return (
              <div
                key={index}
                className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${
                  isWin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isWin ? 'W' : 'L'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamTrend;
