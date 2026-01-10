import React from 'react';

import ScoreSubmissionsList from '@/components/admin/scores/ScoreSubmissionsList';
import { LoadingState } from '@/components/ui/loading-state';
import { useScoreSubmissions } from '@/hooks/useScoreSubmissions';

const PendingMatchesSection = () => {
  const { submissions, isLoading, handleApproveSubmission, handleRejectSubmission } =
    useScoreSubmissions();

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
        onApprove={handleApproveSubmission}
        onReject={handleRejectSubmission}
      />
    </div>
  );
};

export default PendingMatchesSection;
