import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isMatchCompleted } from '@/utils/matchStatus';

import { formatLeagueNight, leagueNightKey } from './leagueNight';

interface MatchSummaryCardProps {
  match: {
    id: string;
    date?: string | null;
    season_id?: string | null;
    gameCount: number;
    roundCount: number;
    iscompleted?: boolean | null;
    team1?: { name?: string | null } | null;
    team2?: { name?: string | null } | null;
  };
  isSelected: boolean;
  isArchivedSeason: boolean;
  onSelect: (matchId: string) => void;
}

/** One match in the corrections list: who played, which night, and how much was scored. */
const MatchSummaryCard: React.FC<MatchSummaryCardProps> = ({
  match,
  isSelected,
  isArchivedSeason,
  onSelect,
}) => {
  const nightKey = leagueNightKey(match.date);

  return (
    <Card
      className={
        isSelected
          ? 'border-primary ring-1 ring-primary/40 cursor-pointer'
          : 'cursor-pointer hover:border-primary/40'
      }
    >
      <button
        type="button"
        onClick={() => onSelect(match.id)}
        className="w-full text-left"
        aria-pressed={isSelected}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {match.team1?.name ?? 'Team 1'} vs {match.team2?.name ?? 'Team 2'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-0.5">
          <div>{nightKey ? formatLeagueNight(nightKey) : 'No date'}</div>
          <div>
            {match.gameCount} game{match.gameCount === 1 ? '' : 's'} · {match.roundCount} round
            {match.roundCount === 1 ? '' : 's'}
            {isMatchCompleted(match) ? ' · final' : ''}
            {isArchivedSeason ? ' · archived, read-only' : ''}
          </div>
        </CardContent>
      </button>
    </Card>
  );
};

export default MatchSummaryCard;
