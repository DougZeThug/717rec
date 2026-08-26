import React, { useState } from 'react';

import ApproveSubmissionDialog from '@/components/admin/scores/ApproveSubmissionDialog';
import ScoreSubmissionsList from '@/components/admin/scores/ScoreSubmissionsList';
import { LoadingState } from '@/components/ui/loading-state';
import { ScoreSubmission, useScoreSubmissions } from '@/hooks/useScoreSubmissions';

const PendingMatchesSection = () => {
  const { submissions, isLoading, isApproving, handleApproveSubmission, handleRejectSubmission } =
    useScoreSubmissions();
  // The submission the admin is entering a result for, if any.
  const [submissionToApprove, setSubmissionToApprove] = useState<ScoreSubmission | null>(null);

  if (isLoading) {
    return <LoadingState variant="section" message="Loading submissions..." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Review score submissions reported by users.
      </p>

      <ScoreSubmissionsList
        submissions={submissions}
        onApprove={setSubmissionToApprove}
        onReject={handleRejectSubmission}
      />

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
