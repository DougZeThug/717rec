
import { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BracketService, fetchBracketById, groupBracketMatchesByType, updateMatchResult } from "@/services/BracketService";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { BracketMatchesByType } from "@/services/brackets/types";
import { PlayoffBracket, PlayoffViewModel, Team } from "@/types";

/**
 * Unified hook for playoff bracket data and management
 */
export function usePlayoffViewModel(bracketId: string | null): PlayoffViewModel {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch teams data
  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await BracketService.supabase
        .from('teams')
        .select('*');
        
      if (error) throw error;
      return data as Team[];
    }
  });
  
  // Fetch bracket data
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) return null;
      
      const bracket = await fetchBracketById(bracketId);
      return bracket;
    },
    enabled: !!bracketId
  });
  
  // Process bracket data to separate winners, losers and finals matches
  const bracketMatchesByType: BracketMatchesByType | null = bracketQuery.data
    ? groupBracketMatchesByType(bracketQuery.data)
    : null;
  
  // Handle bracket deletion
  const handleDeleteBracket = async (
    bracketId: string, 
    bracketName: string
  ) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await BracketService.deleteBracket(bracketId);
      
      toast({
        title: "Bracket Deleted",
        description: `"${bracketName}" has been successfully deleted.`,
      });
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await invalidateMatchRelatedQueries(queryClient);
      
    } catch (error) {
      console.error("Error deleting bracket:", error);
      toast({
        title: "Error",
        description: "Failed to delete bracket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle updating match results
  const handleUpdateMatchResult = async (
    matchId: string, 
    winnerId: string, 
    team1Score: number, 
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number
  ) => {
    try {
      await updateMatchResult(
        matchId,
        winnerId,
        team1Score,
        team2Score,
        team1GameWins,
        team2GameWins
      );
      
      // Refetch bracket data after updating match
      bracketQuery.refetch();
      
      toast({
        title: "Match Updated",
        description: "Match score has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return {
    // Bracket data
    bracket: bracketQuery.data,
    isLoading: bracketQuery.isLoading,
    error: bracketQuery.error as Error | null,
    bracketMatchesByType,
    
    // Teams data
    teams: teamsQuery.data || [],
    teamsLoading: teamsQuery.isLoading,
    
    // Actions
    refetch: bracketQuery.refetch,
    deleteBracket: handleDeleteBracket,
    updateMatchResult: handleUpdateMatchResult
  };
}

// Re-export the BracketMatchesByType type for convenience
export type { BracketMatchesByType } from "@/services/brackets/types";
