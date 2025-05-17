
import React, { useState } from 'react';
import { PlayoffGame } from '@/services/brackets/types';
import GameScoreInput from './GameScoreInput';

interface GameScoreRowProps {
  game: PlayoffGame;
  gameNumber: number;
  team1Name: string;
  team2Name: string;
  onScoreChange: (team1Score: number, team2Score: number) => void;
}

const GameScoreRow: React.FC<GameScoreRowProps> = ({
  game,
  gameNumber,
  team1Name,
  team2Name,
  onScoreChange
}) => {
  const [team1Score, setTeam1Score] = useState<number>(game.team1Score || 0);
  const [team2Score, setTeam2Score] = useState<number>(game.team2Score || 0);

  const handleTeam1ScoreChange = (value: number) => {
    setTeam1Score(value);
    onScoreChange(value, team2Score);
  };

  const handleTeam2ScoreChange = (value: number) => {
    setTeam2Score(value);
    onScoreChange(team1Score, value);
  };

  return (
    <div className="flex items-center p-2 border rounded-md bg-card">
      <div className="font-semibold text-sm w-16">Game {gameNumber}</div>
      
      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{team1Name}</span>
          <GameScoreInput 
            value={team1Score} 
            onChange={handleTeam1ScoreChange} 
          />
        </div>
        
        <span className="text-gray-500">-</span>
        
        <div className="flex items-center gap-2">
          <GameScoreInput 
            value={team2Score} 
            onChange={handleTeam2ScoreChange} 
          />
          <span className="text-sm">{team2Name}</span>
        </div>
      </div>
    </div>
  );
};

export default GameScoreRow;
