import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Pencil, Trash2, Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { useAdminCorrections } from '@/hooks/live-scoring/useAdminCorrections';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import type { Tables } from '@/integrations/supabase/types';
import { TeamPlayersService } from '@/services/liveScoring/TeamPlayersService';

import { ChangeGameWinnerDialog } from './ChangeGameWinnerDialog';
import { DeleteRoundDialog } from './DeleteRoundDialog';
import { EditRoundDialog } from './EditRoundDialog';

type MatchRoundRow = Tables<'match_rounds'>;

export interface MatchCorrectionsPanelProps {
  matchId: string;
}

export const MatchCorrectionsPanel: React.FC<MatchCorrectionsPanelProps> = ({ matchId }) => {
  const { bundle, derived, isLoading, isNotEnabled } = useLiveMatch(matchId);
  const finalized = bundle?.match.iscompleted === true;

  const corrections = useAdminCorrections({ matchId, affectsStandings: finalized });

  const [editingRound, setEditingRound] = useState<MatchRoundRow | null>(null);
  const [deletingRound, setDeletingRound] = useState<MatchRoundRow | null>(null);
  const [winnerGameId, setWinnerGameId] = useState<string | null>(null);

  const team1Id = bundle?.match.team1_id ?? null;
  const team2Id = bundle?.match.team2_id ?? null;

  const team1Roster = useQuery({
    queryKey: ['team-players', team1Id],
    queryFn: () => TeamPlayersService.fetchTeamPlayers(team1Id as string),
    enabled: !!team1Id,
  });
  const team2Roster = useQuery({
    queryKey: ['team-players', team2Id],
    queryFn: () => TeamPlayersService.fetchTeamPlayers(team2Id as string),
    enabled: !!team2Id,
  });

  const rosterById = useMemo(() => {
    const map = new Map<string, Tables<'team_players'>>();
    for (const p of team1Roster.data ?? []) map.set(p.id, p);
    for (const p of team2Roster.data ?? []) map.set(p.id, p);
    return map;
  }, [team1Roster.data, team2Roster.data]);

  if (isLoading) return <LoadingState variant="section" message="Loading match…" />;
  if (isNotEnabled || !bundle || !derived) {
    return <p className="text-sm text-muted-foreground">No live-scoring data for this match.</p>;
  }

  const team1Name = bundle.match.team1?.name ?? 'Team 1';
  const team2Name = bundle.match.team2?.name ?? 'Team 2';

  const editingGame = editingRound
    ? derived.games.find((g) => g.game.id === editingRound.game_id)
    : null;
  const winnerGame = winnerGameId ? derived.games.find((g) => g.game.id === winnerGameId) : null;

  return (
    <div className="space-y-4">
      {finalized && (
        <div className="flex gap-2 items-start rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" aria-hidden />
          <div>
            This match is <strong>finalized</strong>. Edits here will change round/game data
            immediately, but the official result & standings won&apos;t update until you reopen the
            match from the live view and re-finalize it.
          </div>
        </div>
      )}

      {derived.games.map((g) => {
        const gameRounds = bundle.rounds.filter((r) => r.game_id === g.game.id);
        const isCompleted = g.game.status === 'completed';
        const winnerName =
          g.game.winner_team_id === bundle.match.team1_id
            ? team1Name
            : g.game.winner_team_id === bundle.match.team2_id
              ? team2Name
              : null;

        return (
          <Card key={g.game.id}>
            <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                Game {g.game.game_number} · {team1Name} {g.totals.team1} – {g.totals.team2}{' '}
                {team2Name}
                {winnerName && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Winner: {winnerName}
                  </span>
                )}
              </CardTitle>
              {isCompleted && team1Id && team2Id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWinnerGameId(g.game.id)}
                  className="gap-1.5"
                >
                  <Trophy className="size-4" aria-hidden />
                  Change winner
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {gameRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rounds recorded.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {gameRounds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2 text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">Round {r.round_number}</div>
                        <div className="text-muted-foreground text-xs">
                          {team1Name} {r.team1_score} – {r.team2_score} {team2Name}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingRound(r)}
                          aria-label={`Edit round ${r.round_number}`}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRound(r)}
                          aria-label={`Delete round ${r.round_number}`}
                        >
                          <Trash2 className="size-4 text-destructive" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      {editingRound && editingGame && (
        <EditRoundDialog
          open={!!editingRound}
          onOpenChange={(open) => !open && setEditingRound(null)}
          round={editingRound}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Players={editingGame.players.team1}
          team2Players={editingGame.players.team2}
          rosterById={rosterById}
          isSubmitting={corrections.updateRound.isPending}
          onSubmit={async (patch) => {
            await corrections.updateRound.mutateAsync({ roundId: editingRound.id, patch });
            setEditingRound(null);
          }}
        />
      )}

      {deletingRound && (
        <DeleteRoundDialog
          open={!!deletingRound}
          onOpenChange={(open) => !open && setDeletingRound(null)}
          roundNumber={deletingRound.round_number}
          gameNumber={
            derived.games.find((g) => g.game.id === deletingRound.game_id)?.game.game_number ?? 0
          }
          isDeleting={corrections.deleteRound.isPending}
          onConfirm={async () => {
            await corrections.deleteRound.mutateAsync(deletingRound.id);
            setDeletingRound(null);
          }}
        />
      )}

      {winnerGame && team1Id && team2Id && (
        <ChangeGameWinnerDialog
          open={!!winnerGame}
          onOpenChange={(open) => !open && setWinnerGameId(null)}
          gameNumber={winnerGame.game.game_number}
          team1={{ id: team1Id, name: team1Name }}
          team2={{ id: team2Id, name: team2Name }}
          currentWinnerId={winnerGame.game.winner_team_id}
          totals={winnerGame.totals}
          isSubmitting={corrections.changeGameWinner.isPending}
          onConfirm={async (winnerTeamId) => {
            await corrections.changeGameWinner.mutateAsync({
              gameId: winnerGame.game.id,
              winnerTeamId,
              finalTotals: winnerGame.totals,
            });
            setWinnerGameId(null);
          }}
        />
      )}
    </div>
  );
};
