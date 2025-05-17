
import React from 'react';
import { PlayoffGame } from '@/services/brackets/types';
import GameScoreRow from './GameScoreRow';

interface GamesListProps {
  games: PlayoffGame[];
  setGames: React.Dispatch<React.SetStateAction<PlayoffGame[]>>;
  team1Name: string;
  team2Name: string;
}

const GamesList: React.FC<GamesListProps> = ({ games, setGames, team1Name, team2Name }) => {
  // Update a specific game's score
  const updateGameScore = (gameIndex: number, team1Score: number, team2Score: number) => {
    setGames(currentGames => {
      const updatedGames = [...currentGames];
      const gameToUpdate = { ...updatedGames[gameIndex] };
      
      gameToUpdate.team1Score = team1Score;
      gameToUpdate.team2Score = team2Score;
      
      // Determine winner based on scores
      if (team1Score > team2Score) {
        gameToUpdate.winnerId = 'team1Id'; // This is a placeholder, will be replaced with actual ID
      } else if (team2Score > team1Score) {
        gameToUpdate.winnerId = 'team2Id'; // This is a placeholder, will be replaced with actual ID
      } else {
        gameToUpdate.winnerId = null; // Tie or incomplete
      }
      
      updatedGames[gameIndex] = gameToUpdate;
      return updatedGames;
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-center text-muted-foreground mb-3">
        Enter the score for each game
      </div>
      
      {games.map((game, index) => (
        <GameScoreRow
          key={game.id || index}
          game={game}
          gameNumber={index + 1}
          team1Name={team1Name}
          team2Name={team2Name}
          onScoreChange={(team1Score, team2Score) => 
            updateGameScore(index, team1Score, team2Score)
          }
        />
      ))}
      
      <div className="text-xs text-muted-foreground text-center mt-4">
        First team to win majority of games wins the match
      </div>
    </div>
  );
};

export default GamesList;
