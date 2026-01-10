import { useTheme } from 'next-themes';
import React from 'react';

import { cn } from '@/lib/utils';
import { PlayoffGame } from '@/types';

interface GamesListProps {
  games: PlayoffGame[];
  team1Id: string | null;
  team2Id: string | null;
}

const GamesList: React.FC<GamesListProps> = ({ games, team1Id, team2Id }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  if (!games || games.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="text-sm font-semibold mb-2">Games</div>
      <div className="space-y-2">
        {games.map((game, index) => (
          <div
            key={game.id}
            className={cn(
              'flex justify-between items-center text-sm p-2 rounded-md',
              isLight ? 'bg-gray-50' : 'bg-gray-800/30'
            )}
          >
            <span className="font-medium">Game {index + 1}</span>
            <div className="flex items-center">
              <span className={cn('tabular-nums', game.winner === 'team1Id' ? 'font-bold' : '')}>
                {game.team1Score}
              </span>

              <span className="mx-1 text-gray-400">-</span>

              <span className={cn('tabular-nums', game.winner === 'team2Id' ? 'font-bold' : '')}>
                {game.team2Score}
              </span>

              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                {game.winner === 'team1Id'
                  ? 'Team 1 won'
                  : game.winner === 'team2Id'
                    ? 'Team 2 won'
                    : 'Draw'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamesList;
