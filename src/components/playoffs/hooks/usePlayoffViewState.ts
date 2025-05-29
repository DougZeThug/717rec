
import { useState } from 'react';
import { PlayoffPageData } from "./usePlayoffPageData";
import { PlayoffHandlers } from "./usePlayoffHandlers";

export interface PlayoffViewState {
  // Dialog states
  teamDialogOpen: boolean;
  setTeamDialogOpen: (open: boolean) => void;
  bracketDialogOpen: boolean;
  setBracketDialogOpen: (open: boolean) => void;
  
  // Tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Deletion states
  deletingBracket: { id: string; name: string } | null;
  setDeletingBracket: (bracket: { id: string; name: string } | null) => void;
  isDeleting: boolean;
  setIsDeleting: (deleting: boolean) => void;
  
  // Computed handlers
  handleCreateBracket: () => void;
  handleDeleteBracket: (bracketId: string, bracketName: string) => void;
  handleConfirmDeleteBracket: () => Promise<void>;
}

export function usePlayoffViewState(
  data: PlayoffPageData, 
  handlers: PlayoffHandlers,
  initialTab: string = "view"
): PlayoffViewState {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [deletingBracket, setDeletingBracket] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateBracket = () => {
    setBracketDialogOpen(true);
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    setDeletingBracket({ id: bracketId, name: bracketName });
  };
  
  const handleConfirmDeleteBracket = async () => {
    if (!deletingBracket) return;
    
    await data.deleteBracket(
      deletingBracket.id,
      deletingBracket.name,
    );
    
    // Reset selected bracket if we're deleting the current one
    if (data.selectedBracketId === deletingBracket.id) {
      data.setSelectedBracketId(null);
    }
    
    setDeletingBracket(null);
  };

  return {
    // Dialog states
    teamDialogOpen,
    setTeamDialogOpen,
    bracketDialogOpen,
    setBracketDialogOpen,
    
    // Tab state
    activeTab,
    setActiveTab,
    
    // Deletion states
    deletingBracket,
    setDeletingBracket,
    isDeleting,
    setIsDeleting,
    
    // Computed handlers
    handleCreateBracket,
    handleDeleteBracket,
    handleConfirmDeleteBracket
  };
}
