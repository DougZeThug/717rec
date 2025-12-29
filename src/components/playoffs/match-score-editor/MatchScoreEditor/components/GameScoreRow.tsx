import React from "react";
import { MinusCircle } from "lucide-react";
import { Team } from "@/types";
import GameScoreInput from "./GameScoreInput";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DestructiveIconButton } from "@/components/ui/destructive-icon-button";

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
      <DestructiveIconButton
        onClick={() => onRemoveGame(index)}
        disabled={!canRemove}
        title={`Remove game ${index + 1}`}
        icon={<MinusCircle className="h-4 w-4 text-destructive" />}
        className="flex-none h-8 w-8 rounded-lg"
      />
    </motion.div>
  );
};

export default React.memo(GameScoreRow);
