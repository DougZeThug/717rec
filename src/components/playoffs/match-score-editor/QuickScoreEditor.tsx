
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check } from "lucide-react";
import { PlayoffMatch, Team } from "@/types";
import { validateGameScore } from "@/hooks/matches/utils/matchValidationUtils";
import { nanoid } from "nanoid";

interface QuickScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => Promise<void>;
  onCancel: () => void;
}

interface ScoreOption {
  label: string;
  team1Wins: number;
  team2Wins: number;
  scores: { team1Score: number; team2Score: number }[];
}

const QuickScoreEditor: React.FC<QuickScoreEditorProps> = ({
  match,
  teams,
  onSave,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  
  // Score options for best-of-3 format
  const scoreOptions: ScoreOption[] = [
    {
      label: "2-0",
      team1Wins: 2,
      team2Wins: 0,
      scores: [
        { team1Score: 21, team2Score: 15 },
        { team1Score: 21, team2Score: 18 }
      ]
    },
    {
      label: "2-1",
      team1Wins: 2,
      team2Wins: 1,
      scores: [
        { team1Score: 21, team2Score: 15 },
        { team1Score: 18, team2Score: 21 },
        { team1Score: 21, team2Score: 17 }
      ]
    },
    {
      label: "1-2",
      team1Wins: 1,
      team2Wins: 2,
      scores: [
        { team1Score: 15, team2Score: 21 },
        { team1Score: 21, team2Score: 18 },
        { team1Score: 17, team2Score: 21 }
      ]
    },
    {
      label: "0-2",
      team1Wins: 0, 
      team2Wins: 2,
      scores: [
        { team1Score: 15, team2Score: 21 },
        { team1Score: 18, team2Score: 21 }
      ]
    }
  ];
  
  const handleOptionSelect = (option: ScoreOption) => {
    setSelectedOption(option.label);
    setErrorMessage(null);
  };
  
  const handleSubmit = async (option: ScoreOption) => {
    // Validate the score
    const validation = validateGameScore(option.team1Wins, option.team2Wins, match.bestOf);
    
    if (!validation.isValid) {
      setErrorMessage(validation.errorMessage || "Invalid score");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create games with proper IDs
      const games = option.scores.map(score => ({
        ...score,
        id: nanoid()
      }));
      
      // Determine match score (who won the match)
      const team1Score = option.team1Wins > option.team2Wins ? 1 : 0;
      const team2Score = option.team2Wins > option.team1Wins ? 1 : 0;
      
      // Pass the data to the parent component
      await onSave(
        match.id,
        team1Score,
        team2Score,
        games,
        option.team1Wins,
        option.team2Wins
      );
    } catch (error) {
      console.error("Error saving score:", error);
      setErrorMessage("Failed to save score");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {team1?.name || "TBD"} vs {team2?.name || "TBD"}
        </div>
        <div className="text-sm text-gray-500">
          Best of {match.bestOf}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scoreOptions.map(option => (
          <Button
            key={option.label}
            variant={selectedOption === option.label ? "default" : "outline"}
            className={`relative h-16 ${selectedOption === option.label ? "ring-2 ring-primary ring-offset-2" : ""}`}
            onClick={() => handleOptionSelect(option)}
            disabled={isSubmitting}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{option.label}</span>
              <span className="text-xs text-gray-500">
                {option.label.startsWith("2") ? team1?.name : team2?.name} wins
              </span>
            </div>
            {selectedOption === option.label && (
              <div className="absolute top-1 right-1">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
          </Button>
        ))}
      </div>
      
      {errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            const option = scoreOptions.find(o => o.label === selectedOption);
            if (option) {
              handleSubmit(option);
            } else {
              setErrorMessage("Please select a score option");
            }
          }}
          disabled={isSubmitting || !selectedOption}
        >
          Submit Score
        </Button>
      </div>
    </div>
  );
};

export default QuickScoreEditor;
