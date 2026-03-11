import React from 'react';

import { animations } from '@/styles/design-system';
import { Team } from '@/types';

import { GameData } from '../types';
import GameScoreRow from './GameScoreRow';

interface GamesScoresListProps {
  games: GameData[];
  team1: Team | null;
  team2: Team | null;
  onScoreChange: (index: number, team: 1 | 2, score: number) => void;
  onRemoveGame: (index: number) => void;
  canRemoveGame: boolean;
}

const GameScoresList: React.FC<GamesScoresListProps> = ({
  games,
  team1,
  team2,
  onScoreChange,
  onRemoveGame,
  canRemoveGame,
}) => {
  return (
    <div>
      {games.map((game, index) => (
        <div
          key={index}
          className={animations.fadeIn}
          style={{ animationDelay: `${(index + 1) * 0.1}s` }}
        >
          <GameScoreRow
            index={index}
            game={game}
            team1={team1}
            team2={team2}
            onScoreChange={onScoreChange}
            onRemoveGame={onRemoveGame}
            canRemove={canRemoveGame}
          />
        </div>
      ))}
    </div>
  );
};

export default React.memo(GameScoresList);
