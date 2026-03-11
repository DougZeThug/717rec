import { useState } from 'react';

export const usePlayoffState = () => {
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('view');
  const [deletingBracket, setDeletingBracket] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  return {
    // Bracket selection
    selectedBracketId,
    setSelectedBracketId,

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
  };
};
