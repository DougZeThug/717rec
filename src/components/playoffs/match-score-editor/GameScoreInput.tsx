
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/types";

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
      <Label htmlFor={`team${teamNumber}-game-${index}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`team${teamNumber}-game-${index}`}
        type="number"
        min="0"
        value={score}
        onChange={(e) => onChange(index, teamNumber, parseInt(e.target.value) || 0)}
        className="mt-1"
      />
    </div>
  );
};

export default GameScoreInput;
