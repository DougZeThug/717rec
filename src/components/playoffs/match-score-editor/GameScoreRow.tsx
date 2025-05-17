
import React from "react";
import { Button } from "@/components/ui/button";
import { MinusCircle } from "lucide-react";
import { Team } from "@/types";
import GameScoreInput from "./GameScoreInput";

interface GameScoreRowProps {
  index: number;
  game: { team1Score: number; team2Score: number };
  team1: Team | null;
  team2: Team | null;
  onScoreChange: (index: number, team: 1 | 2, score: number) => void;
  onRemoveGame: (index: number) => void;
  canRemove: boolean;
}

const GameScoreRow: React.FC<GameScoreRowProps> = ({
  index,
  game,
  team1,
  team2,
  onScoreChange,
  onRemoveGame,
  canRemove
}) => {
  return (
    <div className="flex items-center space-x-2 mb-3">
      <GameScoreInput
        index={index}
        team={team1}
        score={game.team1Score}
        label={team1?.name || "Team 1"}
        onChange={onScoreChange}
        teamNumber={1}
      />
      
      <div className="flex items-center justify-center h-full pt-4">
        <span className="text-gray-500">vs</span>
      </div>
      
      <GameScoreInput
        index={index}
        team={team2}
        score={game.team2Score}
        label={team2?.name || "Team 2"}
        onChange={onScoreChange}
        teamNumber={2}
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemoveGame(index)}
        disabled={!canRemove}
        className="mt-4"
      >
        <MinusCircle className="h-5 w-5 text-red-500" />
      </Button>
    </div>
  );
};

export default GameScoreRow;
