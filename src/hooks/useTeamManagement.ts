import { useCallback, useState } from 'react';

import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/useToast';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

export function useTeamManagement() {
  const { teams, isLoading, error, fetchTeams, updateTeam, deleteTeam } = useTeams();
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleUpdateTeam = useCallback(
    async (teamData: Omit<Team, 'id' | 'created_at'>) => {
      if (!teamToEdit) return;
      const updatingTeamId = teamToEdit.id;
      try {
        await updateTeam(updatingTeamId, teamData);
        setTeamToEdit((current) => {
          if (current?.id === updatingTeamId) {
            return null;
          }
          return current;
        });
      } catch (error) {
        errorLog('Error updating team:', error);
      }
    },
    [teamToEdit, updateTeam]
  );

  const handleDeleteTeam = useCallback(async () => {
    if (!deleteTeamId) return;

    setIsDeleting(true);
    try {
      await deleteTeam(deleteTeamId);
      setDeleteTeamId(null);
      toast({
        title: 'Team Deleted',
        description: 'The team has been successfully deleted.',
      });
    } catch (error) {
      errorLog('Error deleting team:', error);
      toast({
        title: 'Deletion Failed',
        description: 'There was a problem deleting the team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTeamId, deleteTeam, toast]);

  return {
    teams,
    isLoading,
    error,
    refetch: fetchTeams,
    teamToEdit,
    setTeamToEdit,
    deleteTeamId,
    setDeleteTeamId,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
  };
}
