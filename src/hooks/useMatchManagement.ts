
import { useState } from "react";
import { Match, Team } from "@/types";
import { useMatchCreation } from "./useMatchCreation";
import { useMatchUpdates } from "./useMatchUpdates";

export const useMatchManagement = (initialMatches: Match[]) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  
  const {
    isFormOpen,
    setIsFormOpen,
    handleCreateMatch
  } = useMatchCreation(matches, setMatches);
  
  const {
    editingMatch,
    deleteMatchId,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch
  } = useMatchUpdates(matches, setMatches);

  return {
    matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch
  };
};
