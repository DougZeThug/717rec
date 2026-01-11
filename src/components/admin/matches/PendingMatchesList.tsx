import React from 'react';

import { Match, Team } from '@/types';

import MatchApprovalItem from './MatchApprovalItem';

interface PendingMatchesListProps {
  matches: Match[];
  teams: Record<string, Team>;
  openItems: Record<string, boolean>;
  onToggleItem: (id: string) => void;
  onApproveResult: (match: Match, winnerTeamIndex: 1 | 2) => void;
  onMarkAsTie: (matchId: string) => void;
}

const PendingMatchesList = ({
  matches,
  teams,
  openItems,
  onToggleItem,
  onApproveResult,
  onMarkAsTie,
}: PendingMatchesListProps) => {
  if (matches.length === 0) {
    return <div className="p-4 bg-slate-50 rounded-md">No pending matches to approve.</div>;
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchApprovalItem
          key={match.id}
          match={match}
          teams={teams}
          isOpen={!!openItems[match.id]}
          onToggle={() => onToggleItem(match.id)}
          onApproveResult={onApproveResult}
          onMarkAsTie={onMarkAsTie}
        />
      ))}
    </div>
  );
};

export default PendingMatchesList;
