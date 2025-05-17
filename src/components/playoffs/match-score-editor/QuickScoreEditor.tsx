
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickScoreOption {
  label: string;
  team1Wins: number;
  team2Wins: number;
}

interface QuickScoreEditorProps {
  team1Name: string;
  team2Name: string;
  onSubmitScore: (team1Wins: number, team2Wins: number) => void;
  disabled?: boolean;
}

// Best-of-3 preset score options
const SCORE_OPTIONS: QuickScoreOption[] = [
  { label: "2-0", team1Wins: 2, team2Wins: 0 },
  { label: "2-1", team1Wins: 2, team2Wins: 1 },
  { label: "1-2", team1Wins: 1, team2Wins: 2 },
  { label: "0-2", team1Wins: 0, team2Wins: 2 },
];

const QuickScoreEditor: React.FC<QuickScoreEditorProps> = ({
  team1Name,
  team2Name,
  onSubmitScore,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground mb-2">
          Select the final score to submit match result
        </p>
        <div className="flex justify-center gap-2">
          <span className="font-medium">{team1Name}</span>
          <span>vs</span>
          <span className="font-medium">{team2Name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SCORE_OPTIONS.map((option) => (
          <ScoreButton 
            key={option.label}
            option={option}
            onClick={() => onSubmitScore(option.team1Wins, option.team2Wins)}
            disabled={disabled}
            team1Name={team1Name}
            team2Name={team2Name}
          />
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center mt-4">
        Click on a score to immediately submit the result
      </div>
    </div>
  );
};

interface ScoreButtonProps {
  option: QuickScoreOption;
  onClick: () => void;
  disabled?: boolean;
  team1Name: string;
  team2Name: string;
}

const ScoreButton: React.FC<ScoreButtonProps> = ({
  option,
  onClick,
  disabled,
  team1Name,
  team2Name
}) => {
  // Determine winner for visual styling
  const team1IsWinner = option.team1Wins > option.team2Wins;
  const team2IsWinner = option.team2Wins > option.team1Wins;

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="lg"
      variant={team1IsWinner ? "default" : team2IsWinner ? "secondary" : "outline"}
      className={cn(
        "flex flex-col p-4 h-auto w-full transition-all",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="text-xl font-bold mb-1">{option.label}</span>
      <span className="text-xs opacity-80">
        {team1IsWinner ? team1Name : team2IsWinner ? team2Name : "Tie"} wins
      </span>
    </Button>
  );
};

export default QuickScoreEditor;
