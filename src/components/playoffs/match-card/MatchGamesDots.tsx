import React from 'react';

import { cn } from '@/lib/utils';
import { PlayoffGame } from '@/types';

interface MatchGamesDotsProps {
  games: PlayoffGame[];
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
}

interface GameResultDotProps {
  winnerTeam: number;
  isTeam1Winner: boolean;
  isTeam2Winner: boolean;
}

const GameResultDot: React.FC<GameResultDotProps> = ({
  winnerTeam,
  isTeam1Winner,
  isTeam2Winner,
}) => {
  const team1WonGame = winnerTeam === 1;
  const team2WonGame = winnerTeam === 2;

  return (
    <div
      className={cn(
        'size-3 rounded-full',
        team1WonGame
          ? isTeam1Winner
            ? 'bg-green-500'
            : 'bg-blue-400'
          : team2WonGame
            ? isTeam2Winner
              ? 'bg-green-500'
              : 'bg-blue-400'
            : 'bg-gray-300 dark:bg-gray-600'
      )}
    />
  );
};

const MatchGamesDots: React.FC<MatchGamesDotsProps> = ({ games, team1Id, team2Id, winnerId }) => {
  if (!games || games.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border dark:border-border">
      <div className="text-xs font-medium mb-1 text-muted-foreground dark:text-muted-foreground">Games</div>
      <div className="flex justify-center gap-1">
        {games.map((game, index) => (
          <GameResultDot
            key={game.id || index}
            winnerTeam={game.winner === 'team1Score' ? 1 : 2}
            isTeam1Winner={winnerId === team1Id}
            isTeam2Winner={winnerId === team2Id}
          />
        ))}
      </div>
    </div>
  );
};

export default MatchGamesDots;
