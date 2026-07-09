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
import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;
import { computePlayerStatLines } from '@/utils/liveScoring/matchPlayerStats';
import { buildPlayerTeamMap, computeMatchRecap } from '@/utils/liveScoring/matchRecap';
import { formatPercent, formatRatio, percentage } from '@/utils/liveScoring/pprCalc';

import { MatchRecapSummary } from './MatchRecapSummary';
import { RoundLog } from './RoundLog';

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
  /** Optional: player_id -> team side, used by the recap summary. */
  playerTeamMap?: Record<string, 1 | 2>;
  team1Id?: string | null;
  team2Id?: string | null;
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
  playerTeamMap,
  team1Id = null,
  team2Id = null,
}) => {
  // Keep every attributed line — a thrower may have left the roster since.
  const playerLines = computePlayerStatLines(rounds).sort(
    (a, b) => b.roundsThrown - a.roundsThrown
  );

  // Derive from games if caller didn't pass a map explicitly.
  const resolvedPlayerTeamMap =
    playerTeamMap ??
    buildPlayerTeamMap(
      games.flatMap((g) =>
        [...g.players.team1, ...g.players.team2].map((gp) => ({
          player_id: gp.player_id,
          team_id: gp.team_id,
        }))
      ),
      team1Id
    );

  const recap = computeMatchRecap({
    rounds,
    games,
    playerNames,
    playerTeamMap: resolvedPlayerTeamMap,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
  });

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

      <MatchRecapSummary recap={recap} />

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-1 pr-2 font-medium">Player</th>
                  <th className="px-2 pb-1 text-right font-medium">Rounds</th>
                  <th className="px-2 pb-1 text-right font-medium">Points</th>
                  <th className="px-2 pb-1 text-right font-medium">PPR</th>
                  <th className="px-2 pb-1 text-right font-medium" title="Bags in the hole">
                    Hole%
                  </th>
                  <th className="px-2 pb-1 text-right font-medium" title="Bags on the board">
                    Board%
                  </th>
                  <th className="pb-1 pl-2 text-right font-medium" title="Four-baggers">
                    4B
                  </th>
                </tr>
              </thead>
              <tbody>
                {playerLines.map((line) => (
                  <tr key={line.playerId} className="tabular-nums">
                    <td className="py-0.5 pr-2">{playerNames[line.playerId] ?? 'Former player'}</td>
                    <td className="px-2 py-0.5 text-right">{line.roundsThrown}</td>
                    <td className="px-2 py-0.5 text-right">{line.pointsFor}</td>
                    <td className="px-2 py-0.5 text-right font-medium">{formatRatio(line.ppr)}</td>
                    <td className="px-2 py-0.5 text-right">
                      {formatPercent(percentage(line.bagsIn, line.totalBags))}
                    </td>
                    <td className="px-2 py-0.5 text-right">
                      {formatPercent(percentage(line.bagsOn, line.totalBags))}
                    </td>
                    <td className="py-0.5 pl-2 text-right">
                      {line.totalBags > 0 ? line.fourBaggers : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                The official result is removed and both team records are reverted. The scored games
                and rounds are kept so you can correct them and save the result again. Standings
                update immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onReopen}>Reopen match</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {rounds.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Round-by-round</h3>
          {games.length > 1 ? (
            <div className="space-y-3">
              {games.map((g) => (
                <div key={g.game.id} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Game {g.game.game_number} · {g.totals.team1}–{g.totals.team2}
                  </div>
                  <RoundLog
                    rounds={g.rounds}
                    team1Name={team1Name}
                    team2Name={team2Name}
                    playerNames={playerNames}
                  />
                </div>
              ))}
            </div>
          ) : (
            <RoundLog
              rounds={rounds}
              team1Name={team1Name}
              team2Name={team2Name}
              playerNames={playerNames}
            />
          )}
        </div>
      )}
    </div>
  );
};
