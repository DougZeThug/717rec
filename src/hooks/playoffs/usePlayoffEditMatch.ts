
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PlayoffMatch, PlayoffGame } from "@/types/playoffs";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { BracketService } from "@/services/BracketService";

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
      // Find which team has more game wins to determine the winner
      const winnerId = editingMatch ? 
        (team1GameWins > team2GameWins ? editingMatch.team1Id : editingMatch.team2Id) : 
        null;
        
      if (!winnerId) {
        throw new Error("Cannot determine winner");
      }

      // Format the games for storage
      const formattedGames: PlayoffGame[] = games.map((g, idx) => ({
        id: `${matchId}-game-${idx + 1}`,
        matchId,
        gameNumber: idx + 1,
        team1Score: g.team1Score,
        team2Score: g.team2Score,
        winnerId: g.team1Score > g.team2Score ? editingMatch?.team1Id : editingMatch?.team2Id,
        winner: g.team1Score > g.team2Score ? 'team1Score' : 'team2Score'
      }));
      
      // Use the BracketService to update the match
      await BracketService.updateMatchScore(
        matchId,
        winnerId,
        team1Score,
        team2Score,
        team1GameWins,
        team2GameWins,
        formattedGames
      );
      
      toast({
        title: "Score Saved",
        description: "Match score has been updated successfully.",
      });
      
      // Refresh the brackets data
      await queryClient.invalidateQueries({ queryKey: ['bracket'] });
      await invalidateMatchRelatedQueries(queryClient);
      
      if (refetchBrackets) {
        await refetchBrackets();
      }
      
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
