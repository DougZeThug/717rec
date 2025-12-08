import React from "react";
import { Button } from "@/components/ui/button";
import { MinusCircle } from "lucide-react";
import { Team } from "@/types";
import GameScoreInput from "./GameScoreInput";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-muted/30 border border-border/50",
        "transition-colors duration-200"
      )}
    >
      {/* Game Number Badge */}
      <div className={cn(
        "flex-none w-8 h-8 flex items-center justify-center",
        "bg-primary/10 text-primary rounded-lg",
        "text-sm font-bold"
      )}>
        {index + 1}
      </div>
      
      {/* Score Inputs */}
      <div className="flex-1 flex items-center justify-center gap-4">
        <GameScoreInput
          index={index}
          team={team1}
          score={game.team1Score}
          label={team1?.name || "Team 1"}
          onChange={onScoreChange}
          teamNumber={1}
          opponentScore={game.team2Score}
        />
        
        <div className={cn(
          "flex items-center justify-center",
          "px-3 py-1.5 rounded-full",
          "bg-muted text-muted-foreground",
          "text-sm font-medium"
        )}>
          vs
        </div>
        
        <GameScoreInput
          index={index}
          team={team2}
          score={game.team2Score}
          label={team2?.name || "Team 2"}
          onChange={onScoreChange}
          teamNumber={2}
          opponentScore={game.team1Score}
        />
      </div>
      
      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemoveGame(index)}
        disabled={!canRemove}
        className={cn(
          "flex-none h-8 w-8 rounded-lg",
          "hover:bg-destructive/10 hover:text-destructive",
          "disabled:opacity-30"
        )}
        aria-label={`Remove game ${index + 1}`}
      >
        <MinusCircle className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};

export default React.memo(GameScoreRow);
