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

import type { ScoreOption } from '../mass-score-entry/components/types';
import { MatchSummary, ResultPicker, SubmissionMessage } from './ApproveSubmissionDialogParts';

interface ApproveSubmissionDialogProps {
  submission: ScoreSubmission | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (input: ApproveSubmissionInput) => void;
  isSubmitting?: boolean;
}

/**
 * Ask the admin for the result a score report describes, then approve.
 *
 * A submission carries only the reporter's free-text message, so the admin
 * reads it here and picks the real result. Confirming records the result on
 * the match and approves the submission together.
 *
 * The result comes from the same four best-of-three options the admin Scores
 * tab offers, so an impossible score cannot be submitted.
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
  const [result, setResult] = useState<ScoreOption | null>(null);

  if (!submission) return null;

  const team1Name = submission.match?.team1?.name ?? 'Team 1';
  const team2Name = submission.match?.team2?.name ?? 'Team 2';
  const canConfirm = result !== null && !isSubmitting;

  const handleConfirm = () => {
    if (result === null || isSubmitting) return;
    onConfirm({
      submissionId: submission.id,
      matchId: submission.match_id,
      winner: result.team1Score === 1 ? 1 : 2,
      team1GameWins: result.team1GameWins,
      team2GameWins: result.team2GameWins,
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

          <ResultPicker
            team1Name={team1Name}
            team2Name={team2Name}
            selectedLabel={result?.label ?? null}
            onSelect={setResult}
          />
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
