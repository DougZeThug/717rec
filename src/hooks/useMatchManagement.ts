import { useEffect, useState } from 'react';

import { Match } from '@/types';

import { useMatchCreation } from './useMatchCreation';
import { useMatchUpdates } from './useMatchUpdates';

export const useMatchManagement = (initialMatches: Match[]) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  // Update matches when initialMatches changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    setMatches(initialMatches);
  }, [initialMatches]);

  const { isFormOpen, setIsFormOpen, handleCreateMatch, isCreating } = useMatchCreation(
    matches,
    setMatches
  );

  const {
    editingMatch,
    deleteMatchId,
    isDeleting,
    isUpdating,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch,
  } = useMatchUpdates(matches, setMatches);

  return {
    matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    isDeleting,
    isUpdating,
    isCreating,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch,
  };
};
