
import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Save } from "lucide-react";

interface MatchScoreActionsProps {
  onAddGame: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hasValidationError: boolean;
  canAddGames: boolean;
  team1Wins: number;
  team2Wins: number;
}

const MatchScoreActions: React.FC<MatchScoreActionsProps> = ({
  onAddGame,
  onSave,
  onCancel,
  isSubmitting,
  hasValidationError,
  canAddGames,
  team1Wins,
  team2Wins
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddGame}
          disabled={!canAddGames}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Game
        </Button>
        
        <div className="text-sm">
          Score: <span className="font-bold">{team1Wins} - {team2Wins}</span>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSubmitting || hasValidationError}>
          {isSubmitting ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save Scores
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MatchScoreActions;
