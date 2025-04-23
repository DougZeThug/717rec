
import React from "react";
import { PlayoffGame } from "@/types";

interface GamesListProps {
  games: PlayoffGame[];
  team1Id: string | null;
  team2Id: string | null;
}

const GamesList: React.FC<GamesListProps> = ({ games, team1Id, team2Id }) => {
  if (!games || games.length === 0) return null;
  
  return (
    <div className="mt-3 pt-3 border-t">
      <div className="text-sm font-semibold mb-2">Games</div>
      <div className="space-y-2">
        {games.map((game, index) => (
          <div key={game.id} className="flex justify-between items-center text-sm">
            <span>Game {index + 1}</span>
            <div>
              <span className={game.winner === team1Id ? "font-bold" : ""}>
                {game.team1Score}
              </span>
              {" - "}
              <span className={game.winner === team2Id ? "font-bold" : ""}>
                {game.team2Score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamesList;
