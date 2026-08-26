import { CheckCircle } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import type { ApproveSubmissionInput, ScoreSubmission } from '@/hooks/useScoreSubmissions';

import {
  GameWinsFields,
  MatchSummary,
  SubmissionMessage,
  WinnerPicker,
} from './ApproveSubmissionDialogParts';

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
 *
 * The form is drawn by the small components in `ApproveSubmissionDialogParts`.
 * All state and all validation stay here.
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
          <MatchSummary
            team1Name={team1Name}
            team2Name={team2Name}
            date={submission.match?.date}
            location={submission.match?.location}
          />

          <SubmissionMessage
            submitterName={submission.submitter_name}
            message={submission.message}
          />

          <WinnerPicker
            team1Name={team1Name}
            team2Name={team2Name}
            winner={winner}
            onPick={setWinner}
          />

          <GameWinsFields
            team1Name={team1Name}
            team2Name={team2Name}
            team1GameWins={team1GameWins}
            team2GameWins={team2GameWins}
            onTeam1Change={setTeam1GameWins}
            onTeam2Change={setTeam2GameWins}
          />

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
