import { Handshake, Trophy } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Match, Team } from '@/types';
import { formatWithPattern } from '@/utils/formatDateSafe';

interface UnresolvedMatchesListProps {
  matches: Match[];
  teams: Record<string, Team>;
  onApproveWinner: (match: Match, winner: 1 | 2) => void;
  onMarkTie: (matchId: string) => void;
  disabled?: boolean;
  /** Every match whose result is being written; their own actions are locked. */
  resolvingMatchIds?: ReadonlySet<string>;
}

/**
 * Completed matches that carry no winner yet.
 *
 * An admin either names the winning team or records the match as a tie.
 * Both actions write through the atomic, idempotent RPCs in
 * `usePendingMatches`.
 *
 * A match being written locks its own three actions and no others, so the admin
 * cannot send "team 1 won" and "it was a tie" for the same match while still
 * clearing the rest of the queue. It is a set rather than one id because several
 * matches can be mid-write at once, and a single id would unlock the earlier one.
 */
const UnresolvedMatchesList = ({
  matches,
  teams,
  onApproveWinner,
  onMarkTie,
  disabled = false,
  resolvingMatchIds,
}: UnresolvedMatchesListProps) => {
  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const team1Name = teams[match.team1Id]?.name || 'Team 1';
        const team2Name = teams[match.team2Id]?.name || 'Team 2';
        const team1GameWins = match.team1_game_wins ?? 0;
        const team2GameWins = match.team2_game_wins ?? 0;
        const locked = disabled || Boolean(resolvingMatchIds?.has(match.id));

        return (
          <Card key={match.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium">
                  {team1Name} vs {team2Name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {match.date && formatWithPattern(match.date, "MMM d, yyyy 'at' h:mm a")}
                  {match.location ? ` • ${match.location}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Games won: {team1Name} {team1GameWins} — {team2Name} {team2GameWins}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={locked}
                  onClick={() => onApproveWinner(match, 1)}
                  className="h-auto py-2 whitespace-normal"
                >
                  <Trophy className="size-4 mr-1 shrink-0" />
                  {team1Name} won
                </Button>
                <Button
                  size="sm"
                  disabled={locked}
                  onClick={() => onApproveWinner(match, 2)}
                  className="h-auto py-2 whitespace-normal"
                >
                  <Trophy className="size-4 mr-1 shrink-0" />
                  {team2Name} won
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => onMarkTie(match.id)}
                  className="h-auto py-2 whitespace-normal"
                >
                  <Handshake className="size-4 mr-1 shrink-0" />
                  It was a tie
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UnresolvedMatchesList;
