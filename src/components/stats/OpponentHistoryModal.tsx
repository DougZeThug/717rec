import { Calendar, MapPin } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { useOpponentHistory } from '@/hooks/useHeadToHead';
import type { OpponentHistory } from '@/types/headToHead';
import { formatWithPattern } from '@/utils/formatDateSafe';

interface OpponentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  opponentId: string;
  opponentName: string;
}

type HistoryMatch = OpponentHistory['matches'][number];

interface SummaryStatCardProps {
  value: React.ReactNode;
  valueClassName: string;
  label: string;
}

const SummaryStatCard: React.FC<SummaryStatCardProps> = ({ value, valueClassName, label }) => (
  <Card>
    <CardContent className="p-4 text-center">
      <div className={valueClassName}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

const MatchDateAndLocation: React.FC<{ match: HistoryMatch }> = ({ match }) => (
  <div className="text-sm text-muted-foreground flex items-center space-x-2">
    <Calendar className="size-3" />
    <span>{formatWithPattern(match.date, 'MMM d, yyyy')}</span>
    {match.location && (
      <>
        <MapPin className="size-3" />
        <span>{match.location}</span>
      </>
    )}
  </div>
);

const MatchTeamsAndDate: React.FC<{ match: HistoryMatch; result: string }> = ({
  match,
  result,
}) => (
  <div className="flex items-center space-x-4">
    <Badge variant={result === 'W' ? 'default' : 'secondary'}>{result}</Badge>
    <div>
      <div className="font-medium">
        {match.team1_name} vs {match.team2_name}
      </div>
      <MatchDateAndLocation match={match} />
    </div>
  </div>
);

const MatchScores: React.FC<{ match: HistoryMatch }> = ({ match }) => (
  <div className="text-right">
    <div className="font-bold">
      {match.team1_score} - {match.team2_score}
    </div>
    <div className="text-sm text-muted-foreground">
      Games: {match.team1_game_wins} - {match.team2_game_wins}
    </div>
  </div>
);

const MatchHistoryCard: React.FC<{ match: HistoryMatch; result: string }> = ({ match, result }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <MatchTeamsAndDate match={match} result={result} />
        <MatchScores match={match} />
      </div>
    </CardContent>
  </Card>
);

export const OpponentHistoryModal: React.FC<OpponentHistoryModalProps> = ({
  isOpen,
  onClose,
  teamId,
  opponentId,
  opponentName,
}) => {
  const { data: history, isLoading } = useOpponentHistory(teamId, opponentId);

  if (!history?.summary) return null;

  const { summary, matches } = history;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] supports-[height:80dvh]:max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Head-to-Head vs {opponentName}</DialogTitle>
          <DialogDescription className="sr-only">
            Every match this team has played against {opponentName}.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryStatCard
            valueClassName="text-2xl font-bold text-primary"
            value={summary.matches_played}
            label="Matches"
          />
          <SummaryStatCard
            valueClassName="text-2xl font-bold text-emerald-600"
            value={summary.wins}
            label="Wins"
          />
          <SummaryStatCard
            valueClassName="text-2xl font-bold text-rose-600"
            value={summary.losses}
            label="Losses"
          />
          <SummaryStatCard
            valueClassName="text-2xl font-bold text-primary"
            value={<>{Number(summary.win_pct).toFixed(1)}%</>}
            label="Win Rate"
          />
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <SummaryStatCard
            valueClassName="text-xl font-bold text-emerald-600"
            value={
              <>
                {summary.game_wins} - {summary.game_losses}
              </>
            }
            label="Game Record"
          />
          <SummaryStatCard
            valueClassName="text-xl font-bold text-primary"
            value={
              <>
                {summary.game_wins + summary.game_losses > 0
                  ? ((summary.game_wins / (summary.game_wins + summary.game_losses)) * 100).toFixed(
                      1
                    )
                  : '0.0'}
                %
              </>
            }
            label="Game Win Rate"
          />
        </div>

        {/* Recent Matches */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Matches</h3>
          {isLoading ? (
            <LoadingState variant="section" message="Loading matches..." />
          ) : matches.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No matches found</div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                // Compare ids, never names: two teams may share a name, and a
                // name comparison then reads every result as a loss. Correct
                // whichever side of the fixture the viewing team is on.
                const result =
                  match.winner_id == null ? 'T' : match.winner_id === teamId ? 'W' : 'L';
                return <MatchHistoryCard key={match.id} match={match} result={result} />;
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
