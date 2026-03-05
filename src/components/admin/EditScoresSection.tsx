import React, { useState } from 'react';

import MatchScoresList from '@/components/admin/scores/MatchScoresList';
import DeleteMatchDialog from '@/components/schedule/DeleteMatchDialog';
import { useToast } from '@/hooks/useToast';
import { useUncompletedMatches } from '@/hooks/useUncompletedMatches';
import { deleteMatch, upsertTeamSeasonStats } from '@/services/matches/MatchWriteService';
import { reverseTeamStats } from '@/hooks/matches/updates/utils/statReversalUtils';
import { useQueryClient } from '@tanstack/react-query';
import { errorLog } from '@/utils/logger';

const EditScoresSection = () => {
  const {
    matches,
    teams,
    isLoading,
    openItems,
    scores,
    toggleItem,
    handleScoreChange,
    handleSubmitScore,
  } = useUncompletedMatches();

  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteConfirm = async () => {
    if (!deleteMatchId) return;

    setIsDeleting(true);
    try {
      const matchToDelete = matches.find((m) => m.id === deleteMatchId);

      // If match was completed, reverse the team stats first
      if (matchToDelete?.iscompleted && matchToDelete.winnerId && matchToDelete.loserId) {
        const winnerGameWins =
          matchToDelete.winnerId === matchToDelete.team1Id
            ? matchToDelete.team1_game_wins || 0
            : matchToDelete.team2_game_wins || 0;
        const loserGameWins =
          matchToDelete.loserId === matchToDelete.team1Id
            ? matchToDelete.team1_game_wins || 0
            : matchToDelete.team2_game_wins || 0;

        await reverseTeamStats(
          matchToDelete.winnerId,
          matchToDelete.loserId,
          winnerGameWins,
          loserGameWins,
        );
      }

      await deleteMatch(deleteMatchId);
      await upsertTeamSeasonStats();

      toast({
        title: 'Match Deleted',
        description: 'Match has been successfully deleted.',
        variant: 'destructive',
      });

      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    } catch (error) {
      errorLog('Error deleting match:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete match. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteMatchId(null);
    }
  };

  if (isLoading) {
    return <div>Loading uncompleted matches...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        Submit scores for matches that have been completed. This will automatically update team
        records.
      </p>

      <MatchScoresList
        matches={matches}
        teams={teams}
        openItems={openItems}
        scores={scores}
        onToggleItem={toggleItem}
        onScoreChange={handleScoreChange}
        onSubmitScore={(matchId, team1Score, team2Score) =>
          handleSubmitScore({
            matchId,
            team1Score,
            team2Score,
          })
        }
        onDeleteMatch={(matchId) => setDeleteMatchId(matchId)}
      />

      <DeleteMatchDialog
        isOpen={!!deleteMatchId}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default EditScoresSection;
