import React, { useState } from 'react';

import { Match, Team } from '@/types';
import { LiveRegion } from '@/components/ui/live-region';

import MatchScoreItem from './MatchScoreItem';

interface MatchScoresListProps {
  matches: Match[];
  teams: Record<string, Team>;
  openItems: Record<string, boolean>;
  scores: Record<string, { team1Score: string; team2Score: string }>;
  onToggleItem: (id: string) => void;
  onScoreChange: (matchId: string, team: 'team1Score' | 'team2Score', value: string) => void;
  onSubmitScore: (
    matchId: string,
    team1GameWins: number,
    team2GameWins: number
  ) => Promise<boolean>;
  onDeleteMatch?: (matchId: string) => void;
}

const MatchScoresList = ({
  matches,
  teams,
  openItems,
  scores,
  onToggleItem,
  onScoreChange,
  onSubmitScore,
  onDeleteMatch,
}: MatchScoresListProps) => {
  const [announcement, setAnnouncement] = useState('');

  if (matches.length === 0) {
    return <div className="p-4 bg-muted rounded-md">All matches have scores submitted.</div>;
  }

  return (
    <div className="space-y-4">
      <LiveRegion message={announcement} />
      {matches.map((match) => (
        <MatchScoreItem
          key={match.id}
          match={match}
          teams={teams}
          isOpen={!!openItems[match.id]}
          team1Score={scores[match.id]?.team1Score || ''}
          team2Score={scores[match.id]?.team2Score || ''}
          onToggle={() => onToggleItem(match.id)}
          onScoreChange={(team, value) => onScoreChange(match.id, team, value)}
          onSubmitScore={async (team1GameWins, team2GameWins) => {
            const ok = await onSubmitScore(match.id, team1GameWins, team2GameWins);
            if (ok) {
              const t1 = teams[match.team1Id]?.name ?? 'Team 1';
              const t2 = teams[match.team2Id]?.name ?? 'Team 2';
              setAnnouncement(
                `Score submitted: ${t1} ${team1GameWins}, ${t2} ${team2GameWins}.`
              );
            }
            return ok;
          }}
          onDelete={onDeleteMatch}
        />
      ))}
    </div>
  );
};

export default MatchScoresList;
