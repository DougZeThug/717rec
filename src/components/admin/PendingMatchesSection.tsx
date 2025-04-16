
import React from 'react';
import { usePendingMatches } from "@/hooks/usePendingMatches";
import PendingMatchesList from "@/components/admin/matches/PendingMatchesList";

const PendingMatchesSection = () => {
  const {
    matches,
    teams,
    isLoading,
    openItems,
    toggleItem,
    handleApproveResult,
    handleMarkAsTie
  } = usePendingMatches();

  if (isLoading) {
    return <div>Loading pending matches...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Review and approve match results, or mark them as ties.
      </p>
      
      <PendingMatchesList 
        matches={matches}
        teams={teams}
        openItems={openItems}
        onToggleItem={toggleItem}
        onApproveResult={handleApproveResult}
        onMarkAsTie={handleMarkAsTie}
      />
    </div>
  );
};

export default PendingMatchesSection;
