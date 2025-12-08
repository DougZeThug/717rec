import React from "react";
import { Team } from "@/types";
import { ScoreStepper } from "@/components/ui/score-stepper";

interface GameScoreInputProps {
  index: number;
  team: Team | null;
  score: number;
  label: string;
  onChange: (index: number, team: 1 | 2, score: number) => void;
  teamNumber: 1 | 2;
  opponentScore?: number;
}

const GameScoreInput: React.FC<GameScoreInputProps> = ({
  index,
  team,
  score,
  label,
  onChange,
  teamNumber,
  opponentScore = 0,
}) => {
  const handleScoreChange = (newScore: number) => {
    onChange(index, teamNumber, newScore);
  };

  return (
    <ScoreStepper
      value={score}
      onChange={handleScoreChange}
      label={label}
      teamLogo={team?.imageUrl || team?.logoUrl}
      teamName={team?.name}
      accentColor={teamNumber === 1 ? "blue" : "red"}
      size="md"
      showWinnerIndicator
      isWinning={score > opponentScore && score > 0}
    />
  );
};

export default React.memo(GameScoreInput);
