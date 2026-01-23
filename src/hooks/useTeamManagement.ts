import { useCallback, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { useTeams } from '@/hooks/useTeams';
import { Team } from '@/types';
import { errorLog } from '@/utils/logger';

export function useTeamManagement() {
  const { teams, isLoading, fetchTeams, updateTeam, deleteTeam } = useTeams();
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleUpdateTeam = useCallback(
    async (teamData: Omit<Team, 'id' | 'created_at'>) => {
      if (!teamToEdit) return;
      try {
        await updateTeam(teamToEdit.id, teamData);
        setTeamToEdit(null);
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchTeams();
      toast({
        title: 'Teams Refreshed',
        description: 'Team list has been refreshed successfully.',
      });
    } catch (error) {
      errorLog('Error refreshing teams:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTeams, toast]);

  return {
    teams,
    isLoading,
    teamToEdit,
    setTeamToEdit,
    deleteTeamId,
    setDeleteTeamId,
    isFormOpen,
    setIsFormOpen,
    isRefreshing,
    isDeleting,
    handleUpdateTeam,
    handleDeleteTeam,
    handleRefresh,
  };
}
