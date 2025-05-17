
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/types";
import { cn } from "@/lib/utils";

interface GameScoreInputProps {
  index: number;
  team: Team | null;
  score: number;
  label: string;
  onChange: (index: number, team: 1 | 2, score: number) => void;
  teamNumber: 1 | 2;
}

const GameScoreInput: React.FC<GameScoreInputProps> = ({
  index,
  team,
  score,
  label,
  onChange,
  teamNumber,
}) => {
  return (
    <div className="flex-1">
      <Label 
        htmlFor={`team${teamNumber}-game-${index}`} 
        className="text-xs flex items-center"
      >
        {team?.imageUrl || team?.logoUrl ? (
          <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-200 mr-1">
            <img 
              src={team.imageUrl || team.logoUrl} 
              alt={team.name} 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : null}
        <span className="truncate">{label}</span>
      </Label>
      <Input
        id={`team${teamNumber}-game-${index}`}
        type="number"
        min="0"
        value={score}
        onChange={(e) => onChange(index, teamNumber, parseInt(e.target.value) || 0)}
        className={cn(
          "mt-1",
          teamNumber === 1 ? "border-blue-200 focus:border-blue-300" : "border-red-200 focus:border-red-300"
        )}
      />
    </div>
  );
};

export default GameScoreInput;
