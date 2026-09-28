import { useEffect, useRef, useState } from 'react';

import { Match, Team } from '@/types';

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
    handleUpdateMatch: updateEditingMatch,
    handleDeleteMatch,
  } = useMatchUpdates(matches, setMatches);

  // Counts the times the form has been opened. Cancel stays live while a save
  // runs, so an admin can close the form and open another match before the
  // first save lands; that save belongs to the earlier opening.
  const formOpenings = useRef(0);
  const openOrCloseForm = (open: boolean) => {
    if (open) formOpenings.current += 1;
    setIsFormOpen(open);
  };

  // A saved edit closes the form, the way a saved create already closes it
  // inside useMatchCreation. The open flag lives there and the edit target in
  // useMatchUpdates, so this is the one place that holds both. Left open, the
  // form offered its submit button again, one press from a second write. A
  // failed save returns false and keeps the form open with the input in it,
  // and a save from an earlier opening leaves the form now on screen alone.
  const handleUpdateMatch = async (matchData: Omit<Match, 'id'>, teams: Team[]) => {
    const opening = formOpenings.current;
    const updated = await updateEditingMatch(matchData, teams);
    if (updated && formOpenings.current === opening) setIsFormOpen(false);
    return updated;
  };

  return {
    matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    isDeleting,
    isUpdating,
    isCreating,
    setEditingMatch,
    setIsFormOpen: openOrCloseForm,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch,
  };
};
