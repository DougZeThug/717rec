import { PlusCircle, Save, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

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

type ScoreFooterProps = Pick<
  MatchScoreActionsProps,
  'onSave' | 'onCancel' | 'isSubmitting' | 'hasValidationError'
>;

const ScoreFooter: React.FC<ScoreFooterProps> = ({
  onSave,
  onCancel,
  isSubmitting,
  hasValidationError,
}) => (
  <div className="sticky bottom-0 -mb-2 bg-background pt-2 pb-2 border-t">
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        <X className="size-4 mr-1" />
        Cancel
      </Button>
      <Button
        onClick={onSave}
        disabled={isSubmitting || hasValidationError}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>Saving...</>
        ) : (
          <>
            <Save className="size-4 mr-1" />
            Save Scores
          </>
        )}
      </Button>
    </div>
  </div>
);

const MatchScoreActions: React.FC<MatchScoreActionsProps> = ({
  onAddGame,
  onSave,
  onCancel,
  isSubmitting,
  hasValidationError,
  canAddGames,
  team1Wins,
  team2Wins,
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
          <PlusCircle className="size-4 mr-1" />
          Add Game
        </Button>

        <div className="text-sm">
          Score:{' '}
          <span className="font-bold">
            {team1Wins} - {team2Wins}
          </span>
        </div>
      </div>

      <ScoreFooter
        onSave={onSave}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        hasValidationError={hasValidationError}
      />
    </div>
  );
};

export default MatchScoreActions;
