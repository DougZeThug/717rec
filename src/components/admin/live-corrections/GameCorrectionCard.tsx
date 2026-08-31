import { Pencil, Trash2, Trophy } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { Tables } from '@/integrations/supabase/types';

type MatchRoundRow = Tables<'match_rounds'>;

export interface GameCorrectionCardProps {
  game: LiveGameDerived;
  rounds: MatchRoundRow[];
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  /** B-20: an archived season shows its rounds and offers no way to change them. */
  readOnly: boolean;
  onEditRound: (roundId: string) => void;
  onDeleteRound: (roundId: string) => void;
  onChangeWinner: (gameId: string) => void;
}

interface RoundRowProps {
  round: MatchRoundRow;
  team1Name: string;
  team2Name: string;
  readOnly: boolean;
  onEdit: (roundId: string) => void;
  onDelete: (roundId: string) => void;
}

const RoundRow: React.FC<RoundRowProps> = ({
  round,
  team1Name,
  team2Name,
  readOnly,
  onEdit,
  onDelete,
}) => (
  <li className="flex items-center justify-between py-2 text-sm gap-2">
    <div className="flex-1 min-w-0">
      <div className="font-medium">Round {round.round_number}</div>
      <div className="text-muted-foreground text-xs">
        {team1Name} {round.team1_score} – {round.team2_score} {team2Name}
      </div>
    </div>
    {!readOnly && (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(round.id)}
          aria-label={`Edit round ${round.round_number}`}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(round.id)}
          aria-label={`Delete round ${round.round_number}`}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
        </Button>
      </div>
    )}
  </li>
);

/** One game of a live-scored match: its totals, its winner, and its round log. */
export const GameCorrectionCard: React.FC<GameCorrectionCardProps> = ({
  game,
  rounds,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  readOnly,
  onEditRound,
  onDeleteRound,
  onChangeWinner,
}) => {
  const { game: row, totals } = game;
  const isCompleted = row.status === 'completed';
  const winnerName =
    row.winner_team_id === team1Id ? team1Name : row.winner_team_id === team2Id ? team2Name : null;
  const canChangeWinner = isCompleted && Boolean(team1Id) && Boolean(team2Id) && !readOnly;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          Game {row.game_number} · {team1Name} {totals.team1} – {totals.team2} {team2Name}
          {winnerName && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Winner: {winnerName}
            </span>
          )}
        </CardTitle>
        {canChangeWinner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChangeWinner(row.id)}
            className="gap-1.5"
          >
            <Trophy className="size-4" aria-hidden />
            Change winner
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rounds recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rounds.map((r) => (
              <RoundRow
                key={r.id}
                round={r}
                team1Name={team1Name}
                team2Name={team2Name}
                readOnly={readOnly}
                onEdit={onEditRound}
                onDelete={onDeleteRound}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
