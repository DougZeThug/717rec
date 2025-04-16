
import React from 'react';
import { Match, Team } from '@/types';
import MatchScoreItem from './MatchScoreItem';

interface MatchScoresListProps {
  matches: Match[];
  teams: Record<string, Team>;
  openItems: Record<string, boolean>;
  scores: Record<string, { team1Score: string, team2Score: string }>;
  onToggleItem: (id: string) => void;
  onScoreChange: (matchId: string, team: 'team1Score' | 'team2Score', value: string) => void;
  onSubmitScore: (matchId: string) => void;
}

const MatchScoresList = ({
  matches,
  teams,
  openItems,
  scores,
  onToggleItem,
  onScoreChange,
  onSubmitScore
}: MatchScoresListProps) => {
  if (matches.length === 0) {
    return <div className="p-4 bg-slate-50 rounded-md">All matches have scores submitted.</div>;
  }

  return (
    <div className="space-y-4">
      {matches.map(match => (
        <MatchScoreItem
          key={match.id}
          match={match}
          teams={teams}
          isOpen={!!openItems[match.id]}
          team1Score={scores[match.id]?.team1Score || ''}
          team2Score={scores[match.id]?.team2Score || ''}
          onToggle={() => onToggleItem(match.id)}
          onScoreChange={(team, value) => onScoreChange(match.id, team, value)}
          onSubmitScore={() => onSubmitScore(match.id)}
        />
      ))}
    </div>
  );
};

export default MatchScoresList;
