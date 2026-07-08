import { RotateCcw, Trophy } from 'lucide-react';
import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { MatchRoundRow } from '@/services/liveScoring/dbTypes';
import { computePlayerStatLines } from '@/utils/liveScoring/matchPlayerStats';
import { formatRatio } from '@/utils/liveScoring/pprCalc';

interface CompletedMatchReviewProps {
  team1Name: string;
  team2Name: string;
  winnerName: string | null;
  gameWins: { team1: number; team2: number };
  games: LiveGameDerived[];
  rounds: MatchRoundRow[];
  playerNames: Record<string, string>;
  isAdmin: boolean;
  isReopening: boolean;
  onReopen: () => void;
}

export const CompletedMatchReview: React.FC<CompletedMatchReviewProps> = ({
  team1Name,
  team2Name,
  winnerName,
  gameWins,
  games,
  rounds,
  playerNames,
  isAdmin,
  isReopening,
  onReopen,
}) => {
  const playerLines = computePlayerStatLines(rounds)
    .filter((line) => playerNames[line.playerId])
    .sort((a, b) => b.roundsThrown - a.roundsThrown);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6 text-center">
        <Trophy className="mx-auto mb-2 size-8 text-primary" aria-hidden />
        <h2 className="text-lg font-bold">
          {winnerName ? `${winnerName} wins the match` : 'Match complete'}
        </h2>
        <p className="font-display text-4xl font-bold tabular-nums">
          {gameWins.team1}–{gameWins.team2}
        </p>
        <p className="text-xs text-muted-foreground">
          {team1Name} vs {team2Name}
        </p>
      </div>

      {games.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Games</h3>
          <ul className="space-y-1 text-sm">
            {games.map((g) => (
              <li key={g.game.id} className="flex justify-between tabular-nums">
                <span>Game {g.game.game_number}</span>
                <span className="font-medium">
                  {g.totals.team1}–{g.totals.team2}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {playerLines.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Player stats</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-1 font-medium">Player</th>
                <th className="pb-1 text-right font-medium">Rounds</th>
                <th className="pb-1 text-right font-medium">Points</th>
                <th className="pb-1 text-right font-medium">PPR</th>
              </tr>
            </thead>
            <tbody>
              {playerLines.map((line) => (
                <tr key={line.playerId} className="tabular-nums">
                  <td className="py-0.5">{playerNames[line.playerId]}</td>
                  <td className="py-0.5 text-right">{line.roundsThrown}</td>
                  <td className="py-0.5 text-right">{line.pointsFor}</td>
                  <td className="py-0.5 text-right font-medium">{formatRatio(line.ppr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full gap-2 text-destructive"
              disabled={isReopening}
            >
              <RotateCcw className="size-4" aria-hidden />
              {isReopening ? 'Reopening…' : 'Reopen match (admin)'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reopen this match?</AlertDialogTitle>
              <AlertDialogDescription>
                The official result is removed and both teams' records are reverted. The scored
                games and rounds are kept so you can correct them and save the result again.
                Standings update immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onReopen}>Reopen match</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
