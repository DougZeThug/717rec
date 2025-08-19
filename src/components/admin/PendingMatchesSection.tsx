
import React from 'react';
import { useScoreSubmissions } from "@/hooks/useScoreSubmissions";
import ScoreSubmissionsList from "@/components/admin/scores/ScoreSubmissionsList";

const PendingMatchesSection = () => {
  const {
    submissions,
    isLoading,
    handleApproveSubmission,
    handleRejectSubmission
  } = useScoreSubmissions();

  if (isLoading) {
    return <div>Loading score submissions...</div>;
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
