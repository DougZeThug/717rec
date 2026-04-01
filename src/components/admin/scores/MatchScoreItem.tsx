import { AlertCircle, ChevronDown, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import { Input } from '@/components/ui/input';
import { validateGameScore } from '@/hooks/matches/utils/matchValidationUtils';
import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import { Match, Team } from '@/types';
import { imageErrorLog } from '@/utils/logger';

interface MatchScoreItemProps {
  match: Match;
  teams: Record<string, Team>;
  isOpen: boolean;
  team1Score: string;
  team2Score: string;
  onToggle: () => void;
  onScoreChange: (team: 'team1Score' | 'team2Score', value: string) => void;
  onSubmitScore: (team1GameWins: number, team2GameWins: number) => Promise<boolean>;
  onDelete?: (matchId: string) => void;
}

const MatchScoreItem = ({
  match,
  teams,
  isOpen,
  team1Score: _team1Score,
  team2Score: _team2Score,
  onToggle,
  onScoreChange: _onScoreChange,
  onSubmitScore,
  onDelete,
}: MatchScoreItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [team1GameWins, setTeam1GameWins] = React.useState(
    match.team1_game_wins?.toString() || '0'
  );
  const [team2GameWins, setTeam2GameWins] = React.useState(
    match.team2_game_wins?.toString() || '0'
  );
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const validateScores = () => {
    const team1Wins = parseInt(team1GameWins) || 0;
    const team2Wins = parseInt(team2GameWins) || 0;
    const bestOf = match.best_of || 3;

    const validation = validateGameScore(team1Wins, team2Wins, bestOf);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid score combination');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateScores()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const team1Wins = parseInt(team1GameWins) || 0;
      const team2Wins = parseInt(team2GameWins) || 0;

      await onSubmitScore(team1Wins, team2Wins);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className="border rounded-md overflow-hidden"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-secondary">
        <div className="flex items-center">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <div className="flex items-center">
            <div className="w-6 h-6 rounded overflow-hidden bg-muted mr-2">
              {teams[match.team1Id]?.imageUrl && (
                <img
                  src={teams[match.team1Id].imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    imageErrorLog(teams[match.team1Id].name, teams[match.team1Id].imageUrl);
                    (e.target as HTMLImageElement).src = FALLBACK_TEAM_IMAGE;
                  }}
                />
              )}
            </div>
            <span>{teams[match.team1Id]?.name || 'Team 1'} vs</span>
            <div className="w-6 h-6 rounded overflow-hidden bg-muted mx-2">
              {teams[match.team2Id]?.imageUrl && (
                <img
                  src={teams[match.team2Id].imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    imageErrorLog(teams[match.team2Id].name, teams[match.team2Id].imageUrl);
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                  }}
                />
              )}
            </div>
            <span>{teams[match.team2Id]?.name || 'Team 2'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {new Date(match.date || '').toLocaleDateString()}
          </span>
          {onDelete && (
            <div onClick={(e) => e.stopPropagation()}>
              <DestructiveIconButton
                onClick={() => onDelete(match.id)}
                title="Delete match"
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
              />
            </div>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 border-t bg-secondary">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium mb-1">
                {teams[match.team1Id]?.name || 'Team 1'} Game Wins
              </p>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={team1GameWins}
                onChange={(e) => setTeam1GameWins(e.target.value)}
                placeholder="Enter game wins"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                {teams[match.team2Id]?.name || 'Team 2'} Game Wins
              </p>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={team2GameWins}
                onChange={(e) => setTeam2GameWins(e.target.value)}
                placeholder="Enter game wins"
              />
            </div>
          </div>

          {match.best_of && match.best_of > 1 && (
            <div className="mb-4 text-sm text-muted-foreground">
              Best of {match.best_of} - First to {Math.ceil(match.best_of / 2)} wins
            </div>
          )}

          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start">
              <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting || !!validationError}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Result'
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MatchScoreItem;
