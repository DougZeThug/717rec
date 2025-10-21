
import { useState } from 'react';
import { PlayoffPageData } from './usePlayoffPageData';
import { usePlayoffHandlers } from './usePlayoffHandlers';

export function usePlayoffViewState(
  data: PlayoffPageData, 
  handlers: ReturnType<typeof usePlayoffHandlers>,
  defaultTab: string = "brackets"
) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [deletingBracket, setDeletingBracket] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateBracket = () => {
    console.log('🎯 usePlayoffViewState: Create bracket clicked, setting dialog open to true');
    console.log('🎯 usePlayoffViewState: Current bracketDialogOpen state:', bracketDialogOpen);
    setBracketDialogOpen(true);
    console.log('🎯 usePlayoffViewState: Dialog open state should now be true');
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    console.log('🎯 usePlayoffViewState: Delete bracket requested:', bracketId, bracketName);
    setDeletingBracket({ id: bracketId, name: bracketName });
  };

  const handleConfirmDeleteBracket = async () => {
    if (!deletingBracket) return;
    
    console.log('🎯 usePlayoffViewState: Confirming bracket deletion:', deletingBracket);
    setIsDeleting(true);
    
    try {
      await data.deleteBracket(deletingBracket.id, deletingBracket.name);
      console.log('🎯 usePlayoffViewState: Bracket deleted successfully');
      
      // Clear selection if we deleted the currently selected bracket
      if (data.selectedBracketId === deletingBracket.id) {
        data.setSelectedBracketId(null);
      }
      
      // Refresh the brackets list
      await data.refetchBrackets();
    } catch (error) {
      console.error('🎯 usePlayoffViewState: Error deleting bracket:', error);
    } finally {
      setIsDeleting(false);
      setDeletingBracket(null);
    }
  };

  // Use the enhanced bracket creation handler from usePlayoffHandlers
  const handleBracketCreatedWithNavigation = async () => {
    try {
      // Use the handler that includes navigation
      await handlers.handleBracketCreatedWithNavigation();
      setBracketDialogOpen(false);
      console.log('🎯 usePlayoffViewState: Bracket creation and navigation completed');
    } catch (error) {
      console.error('🎯 usePlayoffViewState: Error in bracket creation flow:', error);
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
    handleBracketCreated: handleBracketCreatedWithNavigation
  };
}
