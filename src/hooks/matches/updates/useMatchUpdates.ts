import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Match } from '@/types';

import { useMatchDelete } from './useMatchDelete';
import { useMatchUpdate } from './useMatchUpdate';
import { invalidateAllDataQueries } from './utils/queryInvalidation';

/**
 * Manages match updates and deletions
 *
 * This hook provides state management and handlers for editing and deleting matches.
 * It coordinates between the update and delete sub-hooks and manages shared state.
 *
 * @param matches - Current array of matches
 * @param setMatches - Function to update the matches array
 * @returns Object containing state and handlers for match updates/deletions
 */
export const useMatchUpdates = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { handleUpdateMatch } = useMatchUpdate({
    matches,
    setMatches,
    editingMatch,
    setEditingMatch,
  });

  const { handleDeleteMatch } = useMatchDelete({
    matches,
    setMatches,
    deleteMatchId,
    setDeleteMatchId,
    setIsDeleting,
  });

  return {
    editingMatch,
    deleteMatchId,
    isDeleting,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch,
    invalidateAllDataQueries: () => invalidateAllDataQueries(queryClient),
  };
};
