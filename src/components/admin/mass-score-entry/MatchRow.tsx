import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { scoreLog } from '@/utils/logger';

import MatchStatusSection from './components/MatchStatusSection';
import ScoreSection from './components/ScoreSection';
import TeamDisplay from './components/TeamDisplay';
import { MatchWithTeams } from './types';

interface MatchRowProps {
  match: MatchWithTeams;
  index: number;
  isSubmitting?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onScoreChange: (team1Score: number, team2Score: number) => void;
  onGameWinsChange: (team1GameWins: number, team2GameWins: number) => void;
  onMarkCompleted: (checked: boolean) => void;
  onClearError?: (matchId: string) => void;
  onDelete?: (matchId: string) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  index,
  isSubmitting: propIsSubmitting = false,
  hasError: propHasError = false,
  errorMessage,
  onScoreChange,
  onGameWinsChange,
  onMarkCompleted,
  onClearError,
  onDelete,
}) => {
  // Use match state for optimistic updates, fallback to props
  const isSubmitting = match.isSubmitting || propIsSubmitting;
  const hasError = match.submitError || propHasError;
  scoreLog(`MatchRow render for match ${match.id}:`, {
    matchId: match.id,
    index: index,
    isCompleted: match.iscompleted,
    scores: `${match.team1Score}-${match.team2Score}`,
    gameWins: `${match.team1_game_wins}-${match.team2_game_wins}`,
    isValid: match.isValid,
    isEdited: match.isEdited,
  });

  const handleCompletedChange = useCallback(
    (checked: boolean) => {
      scoreLog(
        `MatchRow: handleCompletedChange called with ${checked} for match ${match.id} at index ${index}`
      );
      onMarkCompleted(checked);
    },
    [match.id, index, onMarkCompleted]
  );

  const handleAutoComplete = useCallback(() => {
    scoreLog(`MatchRow: Auto-completing match ${match.id} at index ${index}`);
    onMarkCompleted(true);
  }, [match.id, index, onMarkCompleted]);

  const handleScoreChangeWrapper = useCallback(
    (scores: { team1Score: number; team2Score: number }) => {
      onScoreChange(scores.team1Score, scores.team2Score);
    },
    [onScoreChange]
  );

  const handleGameWinsChangeWrapper = useCallback(
    (gameWins: { team1GameWins: number; team2GameWins: number }) => {
      onGameWinsChange(gameWins.team1GameWins, gameWins.team2GameWins);
    },
    [onGameWinsChange]
  );

  const handleClearError = useCallback(() => {
    onClearError?.(match.id);
  }, [onClearError, match.id]);

  return (
    <div
      className={`p-4 rounded-lg bg-background border transition-colors ${
        isSubmitting
          ? 'border-primary/50 bg-primary/5'
          : hasError
            ? 'border-destructive'
            : 'border-border'
      }`}
    >
      <div className="space-y-4">
        {/* Submission Status Indicator */}
        {isSubmitting && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Submitting...</span>
          </div>
        )}
        {hasError && !isSubmitting && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Submission failed - please retry</span>
          </div>
        )}

        {/* Team Names Display - Stacked vertical layout */}
        <div className="flex items-start gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <TeamDisplay team={match.team1} align="left" />
            <span className="text-muted-foreground text-xs text-center py-0.5">vs</span>
            <TeamDisplay team={match.team2} align="right" />
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => {
                const realId = match.id.split('-index-')[0];
                onDelete(realId);
              }}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Score Section */}
        <ScoreSection
          match={match}
          onScoreChange={handleScoreChangeWrapper}
          onGameWinsChange={handleGameWinsChangeWrapper}
          onAutoComplete={handleAutoComplete}
          isSubmitting={isSubmitting}
          hasError={hasError}
          errorMessage={errorMessage}
          onClearError={handleClearError}
        />

        {/* Match Status & Completion Toggle combined */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <label
              className="text-sm font-medium cursor-pointer"
              onClick={() => handleCompletedChange(!match.iscompleted)}
            >
              Mark as Complete
            </label>
            <Switch
              checked={match.iscompleted}
              onCheckedChange={handleCompletedChange}
              disabled={isSubmitting}
              data-match-id={match.id}
              data-match-index={index}
            />
          </div>
          <MatchStatusSection
            isCompleted={match.iscompleted}
            onCompletedChange={handleCompletedChange}
            isEdited={match.isEdited}
            isValid={match.isValid}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchRow;
