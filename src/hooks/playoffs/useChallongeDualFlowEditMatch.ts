import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChallongeBidirectionalSync } from "@/services/ChallongeBidirectionalSync";
import type { PlayoffMatch } from "@/types/playoffs";
import type { PlayoffGame } from "@/hooks/matches/types/matchSubmissionTypes";

export const useChallongeDualFlowEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();

  const handleEditMatch = useCallback(async (matchId: string, quickEdit: boolean = false) => {
    console.log('🎯 handleEditMatch called with:', { matchId, quickEdit });
    
    try {
      // For Challonge direct display, we need to create a match object
      // This would typically come from the G-Loot match data
      const playoffMatch: PlayoffMatch = {
        id: matchId,
        bracket_id: '', // This would be populated from context
        round: 1,
        position: 1,
        team1Id: null,
        team2Id: null,
        winnerId: null,
        loserId: null,
        team1Score: null,
        team2Score: null,
        team1GameWins: null,
        team2GameWins: null,
        matchType: 'winners',
        bestOf: 3,
        team1Seed: null,
        team2Seed: null,
        nextWinMatchId: null,
        nextLoseMatchId: null,
        status: 'pending',
      };

      console.log('🎯 Setting up match for editing:', playoffMatch);
      
      setEditingMatch(playoffMatch);
      setIsQuickEdit(quickEdit);
      
    } catch (error) {
      console.error('🎯 Unexpected error in handleEditMatch:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCloseMatchEditor = useCallback(() => {
    console.log('🎯 handleCloseMatchEditor called');
    setEditingMatch(null);
    setIsQuickEdit(false);
  }, []);

  const handleSaveMatchScore = useCallback(async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => {
    console.log('🎯 handleSaveMatchScore called for dual-flow update:', {
      matchId,
      team1Score,
      team2Score,
      games,
      team1GameWins,
      team2GameWins
    });

    try {
      // Get Challonge mapping for this match
      const mapping = await ChallongeBidirectionalSync.getChallongeMapping(matchId);
      
      if (!mapping) {
        throw new Error('Could not find Challonge mapping for this match');
      }

      // Determine winner and loser
      const winnerId = team1GameWins > team2GameWins ? 'team1' : 'team2'; // This needs proper team ID mapping
      const loserId = team1GameWins > team2GameWins ? 'team2' : 'team1';

      // Create scores CSV for Challonge
      const scoresCsv = games.map(game => `${game.team1Score}-${game.team2Score}`).join(',');

      // Convert games to PlayoffGame format
      const playoffGames: PlayoffGame[] = games.map((game, index) => ({
        id: `${matchId}-game-${index + 1}`,
        matchId: matchId,
        gameNumber: index + 1,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        winnerId: game.team1Score > game.team2Score ? 'team1' : 'team2' // This needs proper team ID mapping
      }));

      // Update both systems
      await ChallongeBidirectionalSync.updateMatchInBothSystems({
        matchId,
        challongeMatchId: mapping.challongeMatchId,
        challongeTournamentId: mapping.challongeTournamentId,
        team1Score,
        team2Score,
        games: playoffGames,
        team1GameWins,
        team2GameWins,
        winnerId,
        loserId,
        scoresCsv
      });

      console.log('🎯 Dual-flow match update completed successfully');
      
      // Call the refetch function to update the UI
      if (refetchBrackets) {
        await refetchBrackets();
      }

      // Close the editor after successful save
      setEditingMatch(null);
      setIsQuickEdit(false);

      // Show success toast
      toast({
        title: "Success",
        description: "Match score saved to both Challonge and database.",
      });

    } catch (error) {
      console.error('🎯 Error in dual-flow handleSaveMatchScore:', error);
      toast({
        title: "Error",
        description: `Failed to save match score: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};