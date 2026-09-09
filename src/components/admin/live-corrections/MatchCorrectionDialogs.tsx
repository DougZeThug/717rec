import React from 'react';

import type { useAdminCorrections } from '@/hooks/live-scoring/useAdminCorrections';
import type { LiveMatchDerived } from '@/hooks/live-scoring/useLiveMatch';
import type { Tables } from '@/integrations/supabase/types';

import { ChangeGameWinnerDialog } from './ChangeGameWinnerDialog';
import { DeleteRoundDialog } from './DeleteRoundDialog';
import { EditRoundDialog } from './EditRoundDialog';

type MatchRoundRow = Tables<'match_rounds'>;

export interface CorrectionSelection {
  editingRoundId: string | null;
  deletingRoundId: string | null;
  winnerGameId: string | null;
}

interface MatchCorrectionDialogsProps {
  selection: CorrectionSelection;
  clearSelection: (which: keyof CorrectionSelection) => void;
  rounds: MatchRoundRow[];
  derived: LiveMatchDerived;
  team1: { id: string | null; name: string };
  team2: { id: string | null; name: string };
  rosterById: Map<string, Tables<'team_players'>>;
  corrections: ReturnType<typeof useAdminCorrections>;
}

/**
 * The three correction dialogs, none of which is open most of the time.
 *
 * Each one is found from the live `rounds` and `derived.games` by id rather
 * than held in state, so a round that disappears from realtime data unmounts
 * its dialog instead of showing a stale copy.
 */
export const MatchCorrectionDialogs: React.FC<MatchCorrectionDialogsProps> = ({
  selection,
  clearSelection,
  rounds,
  derived,
  team1,
  team2,
  rosterById,
  corrections,
}) => {
  const { editingRoundId, deletingRoundId, winnerGameId } = selection;

  const editingRound = rounds.find((r) => r.id === editingRoundId) ?? null;
  const deletingRound = rounds.find((r) => r.id === deletingRoundId) ?? null;
  const winnerGame = derived.games.find((g) => g.game.id === winnerGameId) ?? null;
  const editingGame = editingRound
    ? (derived.games.find((g) => g.game.id === editingRound.game_id) ?? null)
    : null;

  return (
    <>
      {editingRound && editingGame && (
        <EditRoundDialog
          open
          onOpenChange={(open) => !open && clearSelection('editingRoundId')}
          round={editingRound}
          team1Name={team1.name}
          team2Name={team2.name}
          team1Players={editingGame.players.team1}
          team2Players={editingGame.players.team2}
          rosterById={rosterById}
          isSubmitting={corrections.updateRound.isPending}
          onSubmit={async (patch) => {
            await corrections.updateRound.mutateAsync({ roundId: editingRound.id, patch });
            clearSelection('editingRoundId');
          }}
        />
      )}

      {deletingRound && (
        <DeleteRoundDialog
          open
          onOpenChange={(open) => !open && clearSelection('deletingRoundId')}
          roundNumber={deletingRound.round_number}
          gameNumber={
            derived.games.find((g) => g.game.id === deletingRound.game_id)?.game.game_number ?? 0
          }
          isDeleting={corrections.deleteRound.isPending}
          onConfirm={async () => {
            await corrections.deleteRound.mutateAsync(deletingRound.id);
            clearSelection('deletingRoundId');
          }}
        />
      )}

      {winnerGame && team1.id && team2.id && (
        <ChangeGameWinnerDialog
          open
          onOpenChange={(open) => !open && clearSelection('winnerGameId')}
          gameNumber={winnerGame.game.game_number}
          team1={{ id: team1.id, name: team1.name }}
          team2={{ id: team2.id, name: team2.name }}
          currentWinnerId={winnerGame.game.winner_team_id}
          totals={winnerGame.totals}
          isSubmitting={corrections.changeGameWinner.isPending}
          onConfirm={async (winnerTeamId) => {
            await corrections.changeGameWinner.mutateAsync({
              gameId: winnerGame.game.id,
              winnerTeamId,
              finalTotals: winnerGame.totals,
            });
            clearSelection('winnerGameId');
          }}
        />
      )}
    </>
  );
};
