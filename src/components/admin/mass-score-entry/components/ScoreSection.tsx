import { X } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { scoreLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';
import ScoreButtonGroup from './ScoreButtonGroup';

interface ScoreSectionProps {
  match: MatchWithTeams;
  onScoreChange: (scores: { team1Score: number; team2Score: number }) => void;
  onGameWinsChange: (gameWins: { team1GameWins: number; team2GameWins: number }) => void;
  onAutoComplete?: () => void;
  isSubmitting?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onClearError?: () => void;
}

const ScoreSection: React.FC<ScoreSectionProps> = ({
  match,
  onScoreChange,
  onGameWinsChange,
  onAutoComplete,
  isSubmitting = false,
  hasError = false,
  errorMessage,
  onClearError,
}) => {
  const handleScoreChange = (scores: {
    team1Score: number;
    team2Score: number;
    team1GameWins: number;
    team2GameWins: number;
  }) => {
    scoreLog(`ScoreSection: Score changed for match ${match.id}:`, scores);

    // Update scores
    onScoreChange({
      team1Score: scores.team1Score,
      team2Score: scores.team2Score,
    });

    // Update game wins
    onGameWinsChange({
      team1GameWins: scores.team1GameWins,
      team2GameWins: scores.team2GameWins,
    });
  };

  // This function will be called to auto-complete the match when a score is selected
  const handleAutoComplete = () => {
    scoreLog(`ScoreSection: Auto-completing match ${match.id} after score selection`);
    onAutoComplete?.();
  };

  return (
    <div className="space-y-2">
      {hasError && (
        <Alert variant="destructive" className="p-2">
          <div className="flex justify-between items-center">
            <AlertDescription className="text-sm">
              {errorMessage || 'Error submitting match score'}
            </AlertDescription>
            {onClearError && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClearError}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </Alert>
      )}

      <ScoreButtonGroup
        value={{
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          team1GameWins: match.team1_game_wins ?? 0,
          team2GameWins: match.team2_game_wins ?? 0,
        }}
        onChange={handleScoreChange}
        disabled={isSubmitting}
        onComplete={handleAutoComplete}
        matchId={match.id}
        isCompleted={match.iscompleted}
        matchDate={match.date?.toString()}
      />
    </div>
  );
};

export default ScoreSection;
