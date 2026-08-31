import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

import { LoadingState } from '@/components/ui/loading-state';
import { useAdminCorrections } from '@/hooks/live-scoring/useAdminCorrections';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import { useSeasons } from '@/hooks/useSeasons';
import type { Tables } from '@/integrations/supabase/types';
import { TeamPlayersService } from '@/services/liveScoring/TeamPlayersService';

import { ArchivedSeasonBanner } from './ArchivedSeasonBanner';
import { ChangeGameWinnerDialog } from './ChangeGameWinnerDialog';
import { DeleteRoundDialog } from './DeleteRoundDialog';
import { EditRoundDialog } from './EditRoundDialog';
import { GameCorrectionCard } from './GameCorrectionCard';
import { ReopenAndResaveNotice } from './ReopenAndResaveNotice';

type MatchRoundRow = Tables<'match_rounds'>;

export interface MatchCorrectionsPanelProps {
  matchId: string;
}

/** Admin panel for editing rounds, deleting rounds, and changing game winners on a match. */
export const MatchCorrectionsPanel: React.FC<MatchCorrectionsPanelProps> = ({ matchId }) => {
  const { bundle, derived, isLoading, isNotEnabled } = useLiveMatch(matchId);
  const finalized = bundle?.match.iscompleted === true;

  // B-20: an archived season is frozen. Read it from this match's own season
  // rather than from the section's season filter, because a selected match stays
  // open when the filter changes. useSeasons is already cached by the section, so
  // this costs no extra request.
  const { data: seasons } = useSeasons();
  const matchSeason = (seasons ?? []).find((s) => s.id === bundle?.match.season_id) ?? null;
  const seasonArchived = matchSeason?.is_archived === true;

  const corrections = useAdminCorrections({ matchId, affectsStandings: finalized });

  // Store only IDs and derive the current row from the realtime-updated
  // bundle.rounds so open dialogs always reflect the latest data (and close
  // themselves if the round disappears). See NotificationsAdmin for the same
  // pattern.
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
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

  const editingRound: MatchRoundRow | null = editingRoundId
    ? (bundle?.rounds.find((r) => r.id === editingRoundId) ?? null)
    : null;
  const deletingRound: MatchRoundRow | null = deletingRoundId
    ? (bundle?.rounds.find((r) => r.id === deletingRoundId) ?? null)
    : null;

  // If the underlying round disappears from realtime data, the dialog's render
  // guards below (`editingRound && editingGame`, `deletingRound`) unmount it —
  // no effect needed. The stale ID stays in state harmlessly until the next
  // edit action overwrites it.

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
      {seasonArchived && <ArchivedSeasonBanner seasonName={matchSeason?.name ?? null} />}

      {/* Nothing can be edited into disagreeing on an archived season, so the
          finalized warning and its one-press fix belong only to a live one. */}
      {finalized && !seasonArchived && <ReopenAndResaveNotice matchId={matchId} />}

      {derived.games.map((g) => (
        <GameCorrectionCard
          key={g.game.id}
          game={g}
          rounds={bundle.rounds.filter((r) => r.game_id === g.game.id)}
          team1Id={team1Id}
          team2Id={team2Id}
          team1Name={team1Name}
          team2Name={team2Name}
          readOnly={seasonArchived}
          onEditRound={setEditingRoundId}
          onDeleteRound={setDeletingRoundId}
          onChangeWinner={setWinnerGameId}
        />
      ))}

      {editingRound && editingGame && (
        <EditRoundDialog
          open={!!editingRound}
          onOpenChange={(open) => !open && setEditingRoundId(null)}
          round={editingRound}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Players={editingGame.players.team1}
          team2Players={editingGame.players.team2}
          rosterById={rosterById}
          isSubmitting={corrections.updateRound.isPending}
          onSubmit={async (patch) => {
            await corrections.updateRound.mutateAsync({ roundId: editingRound.id, patch });
            setEditingRoundId(null);
          }}
        />
      )}

      {deletingRound && (
        <DeleteRoundDialog
          open={!!deletingRound}
          onOpenChange={(open) => !open && setDeletingRoundId(null)}
          roundNumber={deletingRound.round_number}
          gameNumber={
            derived.games.find((g) => g.game.id === deletingRound.game_id)?.game.game_number ?? 0
          }
          isDeleting={corrections.deleteRound.isPending}
          onConfirm={async () => {
            await corrections.deleteRound.mutateAsync(deletingRound.id);
            setDeletingRoundId(null);
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
