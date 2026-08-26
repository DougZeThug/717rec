import React, { useState } from 'react';

import ApproveSubmissionDialog from '@/components/admin/scores/ApproveSubmissionDialog';
import ScoreSubmissionsList from '@/components/admin/scores/ScoreSubmissionsList';
import UnresolvedMatchesList from '@/components/admin/scores/UnresolvedMatchesList';
import { LoadingState } from '@/components/ui/loading-state';
import { usePendingMatches } from '@/hooks/usePendingMatches';
import { ScoreSubmission, useScoreSubmissions } from '@/hooks/useScoreSubmissions';
import { Match } from '@/types';

const PendingMatchesSection = () => {
  const { submissions, isLoading, isApproving, handleApproveSubmission, handleRejectSubmission } =
    useScoreSubmissions();
  const {
    matches: unresolvedMatches,
    teams,
    isLoading: isLoadingMatches,
    handleApproveResult,
    handleMarkAsTie,
  } = usePendingMatches();

  // The submission the admin is entering a result for, if any.
  const [submissionToApprove, setSubmissionToApprove] = useState<ScoreSubmission | null>(null);

  if (isLoading || isLoadingMatches) {
    return <LoadingState variant="section" message="Loading submissions..." />;
  }

  // usePendingMatches already reports failures in a toast, so swallow the
  // rejection here to avoid an unhandled promise.
  const approveWinner = (match: Match, winner: 1 | 2) => {
    void handleApproveResult(match, winner).catch(() => undefined);
  };

  const markTie = (matchId: string) => {
    void handleMarkAsTie(matchId).catch(() => undefined);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Score submissions</h3>
          <p className="text-sm text-muted-foreground">
            Review score reports sent in by users. Approving asks you for the result.
          </p>
        </div>

        <ScoreSubmissionsList
          submissions={submissions}
          onApprove={setSubmissionToApprove}
          onReject={handleRejectSubmission}
        />
      </section>

      {unresolvedMatches.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Unresolved matches</h3>
            <p className="text-sm text-muted-foreground">
              These matches are finished but have no winner. Name the winner or record a tie.
            </p>
          </div>

          <UnresolvedMatchesList
            matches={unresolvedMatches}
            teams={teams}
            onApproveWinner={approveWinner}
            onMarkTie={markTie}
          />
        </section>
      )}

      <ApproveSubmissionDialog
        // Remount per submission so the form never carries the last one's numbers.
        key={submissionToApprove?.id ?? 'none'}
        submission={submissionToApprove}
        open={submissionToApprove !== null}
        onClose={() => setSubmissionToApprove(null)}
        onConfirm={(input) => {
          handleApproveSubmission(input);
          setSubmissionToApprove(null);
        }}
        isSubmitting={isApproving}
      />
    </div>
  );
};

export default PendingMatchesSection;
