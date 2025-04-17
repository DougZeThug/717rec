
import { useState } from "react";
import { Match, Team } from "@/types";
import { useToast } from "@/components/ui/use-toast";

export const useMatchManagement = (initialMatches: Match[]) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const getTeamName = (teams: Team[], teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  const handleCreateMatch = (matchData: Omit<Match, "id">, teams: Team[]) => {
    const newMatch: Match = {
      ...matchData,
      id: Date.now().toString(),
    };
    
    setMatches([...matches, newMatch]);
    setIsFormOpen(false);
    
    toast({
      title: "Match Created",
      description: `Match between ${getTeamName(teams, newMatch.team1Id)} and ${getTeamName(teams, newMatch.team2Id)} has been scheduled.`,
    });

    if (newMatch.iscompleted && newMatch.winnerId && newMatch.loserId) {
      updateTeamRecords(newMatch.winnerId, newMatch.loserId, teams);
    }
  };

  const handleUpdateMatch = (matchData: Omit<Match, "id">, teams: Team[]) => {
    if (!editingMatch) return;
    
    const updatedMatches = matches.map(match => {
      if (match.id === editingMatch.id) {
        return {
          ...match,
          ...matchData
        };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    setEditingMatch(undefined);
    
    toast({
      title: "Match Updated",
      description: `Match details have been successfully updated.`,
    });

    const updatedMatch = { ...editingMatch, ...matchData };
    if (
      updatedMatch.iscompleted && 
      updatedMatch.winnerId && 
      updatedMatch.loserId &&
      (!editingMatch.iscompleted || 
        editingMatch.winnerId !== updatedMatch.winnerId)
    ) {
      updateTeamRecords(updatedMatch.winnerId, updatedMatch.loserId, teams);
    }
  };

  const handleDeleteMatch = (teams: Team[]) => {
    if (!deleteMatchId) return;
    
    const matchToDelete = matches.find(match => match.id === deleteMatchId);
    const updatedMatches = matches.filter(match => match.id !== deleteMatchId);
    
    setMatches(updatedMatches);
    setDeleteMatchId(null);
    
    if (matchToDelete && teams) {
      toast({
        title: "Match Deleted",
        description: `Match between ${getTeamName(teams, matchToDelete.team1Id)} and ${getTeamName(teams, matchToDelete.team2Id)} has been deleted.`,
        variant: "destructive"
      });
    }
  };

  const updateTeamRecords = (winnerId: string, loserId: string, teams: Team[]) => {
    const winnerName = getTeamName(teams, winnerId);
    const loserName = getTeamName(teams, loserId);
    
    toast({
      title: "Team Records Updated",
      description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
    });
  };

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
