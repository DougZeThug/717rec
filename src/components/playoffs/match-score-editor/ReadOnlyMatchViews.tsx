import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { MatchStatusBadge } from './MatchStatusBadge';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import type { ByeEligibility } from './useMatchEditorState';

// What a signed-out visitor or a non-admin sees instead of the score editors:
// scores as plain text, no Save, no status buttons. Kept apart from the editors
// so each file stays shallow and the admin markup stays untouched.

interface AccessNoticeProps {
  accessLoading?: boolean;
  accessCheckFailed?: boolean;
  onRetryAccessCheck?: () => void;
}

export interface ReadOnlyGame {
  id: number;
  number: number;
  opponent1_score: number | null;
  opponent2_score: number | null;
}

/** Game-by-game scores, the same for an admin and a visitor. */
export const GamesList: React.FC<{ games: ReadOnlyGame[] }> = ({ games }) => {
  if (games.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>Games</Label>
      <div className="space-y-1 text-sm text-muted-foreground">
        {games.map((game) => (
          <div key={game.id} className="flex justify-between">
            <span>Game {game.number}:</span>
            <span>
              {game.opponent1_score ?? '-'} - {game.opponent2_score ?? '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** One team's name with its score, as text. */
const ScoreRow: React.FC<{ name: string; score: number; className?: string }> = ({
  name,
  score,
  className,
}) => (
  <div className={cn('flex justify-between gap-2', className)}>
    <span>{name}</span>
    <span className="font-semibold">{score}</span>
  </div>
);

interface ReadOnlyRegularViewProps extends AccessNoticeProps {
  opponent1Name: string;
  opponent2Name: string;
  opponent1Score: number;
  opponent2Score: number;
  games: ReadOnlyGame[];
  status?: number;
  onClose: () => void;
}

/** A regular match, read-only. */
export const ReadOnlyRegularView: React.FC<ReadOnlyRegularViewProps> = ({
  opponent1Name,
  opponent2Name,
  opponent1Score,
  opponent2Score,
  games,
  status,
  onClose,
  accessLoading,
  accessCheckFailed,
  onRetryAccessCheck,
}) => (
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Match Score</DialogTitle>
      <DialogDescription className="sr-only">
        Scores for this match. Only admins can change them.
      </DialogDescription>
    </DialogHeader>

    <MatchStatusBadge status={status} readOnly />

    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <ScoreRow name={opponent1Name} score={opponent1Score} />
        <ScoreRow name={opponent2Name} score={opponent2Score} />
      </div>

      <GamesList games={games} />
    </div>

    <ReadOnlyNotice
      accessLoading={accessLoading}
      accessCheckFailed={accessCheckFailed}
      onRetryAccessCheck={onRetryAccessCheck}
    />
    <div className="flex justify-end">
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  </DialogContent>
);

interface ReadOnlyByeViewProps extends AccessNoticeProps {
  winnerName: string;
  winnerScore: number;
  byeEligible: ByeEligibility | null;
  status?: number;
  onClose: () => void;
}

/** A BYE match, read-only: no status buttons, no score box, no Award Win. */
export const ReadOnlyByeView: React.FC<ReadOnlyByeViewProps> = ({
  winnerName,
  winnerScore,
  byeEligible,
  status,
  onClose,
  accessLoading,
  accessCheckFailed,
  onRetryAccessCheck,
}) => (
  <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] supports-[height:90dvh]:max-h-[90dvh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-base sm:text-lg">Match Forfeit - BYE</DialogTitle>
      <DialogDescription className="sr-only">
        Scores for this match. Only admins can change them.
      </DialogDescription>
    </DialogHeader>

    <MatchStatusBadge status={byeEligible?.currentStatus ?? status} readOnly />

    <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
      <div className="text-center py-2 sm:py-4">
        <p className="text-lg sm:text-xl font-semibold px-2">{winnerName} wins by walkover</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">Opponent: BYE</p>
      </div>
      <ScoreRow name={`${winnerName} Score (Games Won)`} score={winnerScore} className="text-sm" />
    </div>

    <ReadOnlyNotice
      accessLoading={accessLoading}
      accessCheckFailed={accessCheckFailed}
      onRetryAccessCheck={onRetryAccessCheck}
    />
    <div className="flex flex-col sm:flex-row justify-end gap-2">
      <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
        Close
      </Button>
    </div>
  </DialogContent>
);
