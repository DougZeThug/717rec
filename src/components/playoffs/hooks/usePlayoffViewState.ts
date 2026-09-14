import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { bracketLog, errorLog } from '@/utils/logger';

import { usePlayoffHandlers } from './usePlayoffHandlers';
import { PlayoffPageData } from './usePlayoffPageData';

export function usePlayoffViewState(
  data: PlayoffPageData,
  handlers: ReturnType<typeof usePlayoffHandlers>,
  defaultTab = 'brackets'
) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [deletingBracket, setDeletingBracket] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleCreateBracket = () => {
    bracketLog('usePlayoffViewState: Create bracket clicked, setting dialog open to true');
    bracketLog('usePlayoffViewState: Current bracketDialogOpen state:', bracketDialogOpen);
    setBracketDialogOpen(true);
    bracketLog('usePlayoffViewState: Dialog open state should now be true');
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    bracketLog('usePlayoffViewState: Delete bracket requested:', bracketId, bracketName);
    setDeletingBracket({ id: bracketId, name: bracketName });
  };

  const handleConfirmDeleteBracket = async () => {
    if (!deletingBracket) return;

    bracketLog('usePlayoffViewState: Confirming bracket deletion:', deletingBracket);
    setIsDeleting(true);

    try {
      await data.deleteBracket(deletingBracket.id, deletingBracket.name);
      bracketLog('usePlayoffViewState: Bracket deleted successfully');

      // Close the dialog immediately after a successful delete, regardless of refresh
      setDeletingBracket(null);

      // Refresh the brackets list best-effort; do not misattribute a refresh failure
      // as a delete failure now that the bracket is already gone.
      try {
        await data.refetchBrackets();
      } catch (refetchError) {
        errorLog(
          'usePlayoffViewState: Bracket deleted, but failed to refresh brackets:',
          refetchError
        );
        const message = getUIErrorMessage(refetchError, 'Failed to refresh bracket list');
        toast({
          title: 'Bracket deleted',
          description: `Deleted, but list could not refresh: ${message}`,
          variant: 'default',
        });
      }
    } catch (error) {
      errorLog('usePlayoffViewState: Error deleting bracket:', error);
      const message = getUIErrorMessage(error, 'Failed to delete bracket');
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    bracketDialogOpen,
    setBracketDialogOpen,
    teamDialogOpen,
    setTeamDialogOpen,
    deletingBracket,
    setDeletingBracket,
    isDeleting,
    handleCreateBracket,
    handleDeleteBracket,
    handleConfirmDeleteBracket,
  };
}
