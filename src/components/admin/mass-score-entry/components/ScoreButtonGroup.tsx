
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScoreOption {
  team1Score: number;
  team2Score: number;
  label: string;
}

const SCORE_OPTIONS: ScoreOption[] = [
  { team1Score: 2, team2Score: 0, label: "2–0" },
  { team1Score: 2, team2Score: 1, label: "2–1" },
  { team1Score: 0, team2Score: 2, label: "0–2" },
  { team1Score: 1, team2Score: 2, label: "1–2" },
];

interface ScoreButtonGroupProps {
  value: { team1Score: number | null; team2Score: number | null } | null;
  onChange: (scores: { team1Score: number; team2Score: number }) => void;
  disabled?: boolean;
}

const ScoreButtonGroup: React.FC<ScoreButtonGroupProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const isSelected = (option: ScoreOption) =>
    value?.team1Score === option.team1Score && 
    value?.team2Score === option.team2Score;

  return (
    <div className="flex gap-2 flex-wrap">
      {SCORE_OPTIONS.map((option) => (
        <Button
          key={option.label}
          onClick={() => onChange(option)}
          variant="outline"
          size="lg"
          className={cn(
            "min-w-[70px] text-base font-medium transition-all",
            isSelected(option) 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-primary/10"
          )}
          disabled={disabled}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};

export default ScoreButtonGroup;
