import { CheckCircle, MessageSquare } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import type { ApproveSubmissionInput, ScoreSubmission } from '@/hooks/useScoreSubmissions';
import { cn } from '@/lib/utils';
import { formatWithPattern } from '@/utils/formatDateSafe';

interface ApproveSubmissionDialogProps {
  submission: ScoreSubmission | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (input: ApproveSubmissionInput) => void;
  isSubmitting?: boolean;
}

/** Read a game-wins input, treating blank or bad text as 0. */
const parseGameWins = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Ask the admin for the result a score report describes, then approve.
 *
 * A submission carries only the reporter's free-text message, so the admin
 * reads it here and enters the real numbers. Confirming records the result
 * on the match and approves the submission together.
 */
const ApproveSubmissionDialog = ({
  submission,
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
}: ApproveSubmissionDialogProps) => {
  // The parent remounts this dialog per submission (via `key`), so the form
  // always starts empty for a new report.
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [team1GameWins, setTeam1GameWins] = useState('0');
  const [team2GameWins, setTeam2GameWins] = useState('0');

  if (!submission) return null;

  const team1Name = submission.match?.team1?.name ?? 'Team 1';
  const team2Name = submission.match?.team2?.name ?? 'Team 2';
  const matchDate = submission.match?.date;

  const team1Wins = parseGameWins(team1GameWins);
  const team2Wins = parseGameWins(team2GameWins);
  const negativeWins = team1Wins < 0 || team2Wins < 0;
  // The winner cannot have taken fewer games than the loser.
  const contradictsWinner =
    winner !== null && (winner === 1 ? team1Wins < team2Wins : team2Wins < team1Wins);
  const canConfirm = winner !== null && !negativeWins && !contradictsWinner && !isSubmitting;

  const handleConfirm = () => {
    if (winner === null || !canConfirm) return;
    onConfirm({
      submissionId: submission.id,
      matchId: submission.match_id,
      winner,
      team1GameWins: team1Wins,
      team2GameWins: team2Wins,
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record the result</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Read the report, then enter the result. This saves the match and approves the
            submission.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Which match this report is about */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <p className="font-medium text-sm text-center">
              {team1Name} vs {team2Name}
            </p>
            {matchDate && (
              <p className="text-xs text-muted-foreground text-center mt-1">
                {formatWithPattern(matchDate, "MMM d, yyyy 'at' h:mm a")}
                {submission.match?.location ? ` • ${submission.match.location}` : ''}
              </p>
            )}
          </div>

          {/* What the reporter said */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Reported by {submission.submitter_name}:
              </span>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm">{submission.message}</p>
            </div>
          </div>

          {/* Who won */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">
              Who won? <span className="text-destructive">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={winner === 1 ? 'default' : 'outline'}
                aria-pressed={winner === 1}
                onClick={() => setWinner(1)}
                className={cn('h-auto py-2 whitespace-normal')}
              >
                {team1Name}
              </Button>
              <Button
                type="button"
                variant={winner === 2 ? 'default' : 'outline'}
                aria-pressed={winner === 2}
                onClick={() => setWinner(2)}
                className={cn('h-auto py-2 whitespace-normal')}
              >
                {team2Name}
              </Button>
            </div>
          </fieldset>

          {/* Games each team won */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="team1-game-wins">{team1Name} games won</Label>
              <Input
                id="team1-game-wins"
                type="number"
                min={0}
                inputMode="numeric"
                value={team1GameWins}
                onChange={(event) => setTeam1GameWins(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="team2-game-wins">{team2Name} games won</Label>
              <Input
                id="team2-game-wins"
                type="number"
                min={0}
                inputMode="numeric"
                value={team2GameWins}
                onChange={(event) => setTeam2GameWins(event.target.value)}
              />
            </div>
          </div>

          {negativeWins && (
            <p className="text-sm text-destructive">Games won cannot be a negative number.</p>
          )}
          {contradictsWinner && (
            <p className="text-sm text-destructive">
              The winner cannot have fewer games won than the other team.
            </p>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            <CheckCircle className="size-4 mr-1" />
            {isSubmitting ? 'Saving...' : 'Record and approve'}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default ApproveSubmissionDialog;
