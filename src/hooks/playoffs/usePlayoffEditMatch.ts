
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PlayoffMatch } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleEditMatch = (matchId: string, quickEdit: boolean = false) => {
    // This function is intended to be used with a bracket object from the parent component
    return (bracket: any) => {
      if (!bracket) return;
      
      const match = bracket.matches.find((m: any) => m.id === matchId);
      if (!match) {
        toast({
          title: "Error",
          description: `Match not found: ${matchId}`,
          variant: "destructive"
        });
        return;
      }
      
      setEditingMatch(match);
      setIsQuickEdit(quickEdit);
    };
  };

  const handleCloseMatchEditor = () => {
    setEditingMatch(null);
    setIsQuickEdit(false);
  };
  
  const handleSaveMatchScore = async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number; }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => {
    try {
      // Here we would save the match score to the database
      // This is just a placeholder for now
      console.log("Saving match score", {
        matchId,
        team1Score,
        team2Score,
        games,
        team1GameWins,
        team2GameWins
      });
      
      toast({
        title: "Score Saved",
        description: "Match score has been updated successfully.",
      });
      
      // Refresh the brackets data
      await refetchBrackets();
      handleCloseMatchEditor();
    } catch (error) {
      console.error("Error saving match score:", error);
      toast({
        title: "Error",
        description: "Failed to save match score. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};
