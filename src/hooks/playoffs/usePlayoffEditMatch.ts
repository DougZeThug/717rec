
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlayoffMatchUpdate } from "./usePlayoffMatchUpdate";
import { playoffLog, errorLog } from "@/utils/logger";
import type { PlayoffMatch, PlayoffBracket } from "@/utils/playoffs/playoffTypes";

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [currentBracket, setCurrentBracket] = useState<PlayoffBracket | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();
  
  // Use unified match update hook for routing
  const { updateMatch } = usePlayoffMatchUpdate(currentBracket);

  const handleEditMatch = useCallback(async (matchId: string, quickEdit: boolean = false) => {
    playoffLog('Edit match requested:', matchId);
    
    try {
      // Check if matchId is an integer (brackets-manager SQL) or UUID (playoff_matches)
      const isInteger = /^\d+$/.test(matchId);
      
      if (isInteger) {
        // Fetch from brackets-manager match table
        const { data: matchData, error } = await supabase
          .from('match')
          .select('*, stage:stage_id(*)')
          .eq('id', parseInt(matchId))
          .single();

        if (error || !matchData) {
          errorLog('Error fetching brackets-manager match:', error);
          toast({
            title: "Error",
            description: "Failed to load match data. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Check if match has both opponents
        if (!matchData.opponent1_id || !matchData.opponent2_id) {
          toast({
            title: "Match Locked",
            description: "This match is waiting for teams to be determined from previous matches.",
          });
          return;
        }

        // Get bracket info
        const stageData = matchData.stage as any;
        const bracketId = stageData?.tournament_id;
        
        if (!bracketId) {
          toast({
            title: "Error",
            description: "Could not determine bracket for this match.",
            variant: "destructive",
          });
          return;
        }

        setCurrentBracket({
          id: bracketId,
          uses_brackets_manager: true,
          format: 'Single Elimination',
          state: 'in_progress'
        } as PlayoffBracket);

        // Convert brackets-manager match to PlayoffMatch format
        const playoffMatch: PlayoffMatch = {
          id: matchData.id.toString(),
          bracket_id: bracketId,
          round: matchData.round_id || 1,
          position: matchData.number || 1,
          team1Id: matchData.opponent1_id?.toString(),
          team2Id: matchData.opponent2_id?.toString(),
          winnerId: null,
          loserId: null,
          team1Score: matchData.opponent1_score || 0,
          team2Score: matchData.opponent2_score || 0,
          team1GameWins: matchData.opponent1_score || 0,
          team2GameWins: matchData.opponent2_score || 0,
          matchType: 'winners',
          bestOf: matchData.child_count || 3,
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          status: matchData.status === 4 ? 'completed' : matchData.status === 3 ? 'in_progress' : 'pending',
        };

        playoffLog('Loaded brackets-manager match:', playoffMatch.id);
        setEditingMatch(playoffMatch);
        setIsQuickEdit(quickEdit);
        
      } else {
        // Fetch from playoff_matches table (UUID)
        const { data: matchData, error } = await supabase
          .from('playoff_matches')
          .select(`
            *,
            bracket:brackets!playoff_matches_bracket_id_fkey(id, uses_brackets_manager)
          `)
          .eq('id', matchId)
          .single();

        if (error) {
          errorLog('Error fetching playoff match:', error);
          toast({
            title: "Error",
            description: "Failed to load match data. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (!matchData) {
          errorLog('Match not found:', matchId);
          toast({
            title: "Error", 
            description: "Match not found.",
            variant: "destructive",
          });
          return;
        }

        // Check if match can be edited
        if (!matchData.team1_id || !matchData.team2_id) {
          toast({
            title: "Match Locked",
            description: "This match is waiting for teams to be determined from previous matches.",
          });
          return;
        }

        // Store bracket info for routing
        setCurrentBracket({
          id: matchData.bracket_id,
          uses_brackets_manager: (matchData.bracket as any)?.uses_brackets_manager || false,
          format: 'Single Elimination',
          state: 'in_progress'
        } as PlayoffBracket);

        // Convert database match to PlayoffMatch format
        const playoffMatch: PlayoffMatch = {
          id: matchData.id,
          bracket_id: matchData.bracket_id,
          round: matchData.round,
          position: matchData.position,
          team1Id: matchData.team1_id,
          team2Id: matchData.team2_id,
          winnerId: matchData.winner_id,
          loserId: matchData.loser_id,
          team1Score: matchData.team1_score,
          team2Score: matchData.team2_score,
          team1GameWins: null,
          team2GameWins: null,
          matchType: matchData.match_type,
          bestOf: matchData.best_of || 3,
          team1Seed: matchData.team1_seed,
          team2Seed: matchData.team2_seed,
          nextWinMatchId: matchData.next_win_match_id,
          nextLoseMatchId: matchData.next_lose_match_id,
          status: (matchData.status as "pending" | "in_progress" | "completed") || 'pending',
        };

        playoffLog('Loaded playoff match:', playoffMatch.id);
        setEditingMatch(playoffMatch);
        setIsQuickEdit(quickEdit);
      }
      
    } catch (error) {
      errorLog('Unexpected error in handleEditMatch:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCloseMatchEditor = useCallback(() => {
    playoffLog('Match editor closed');
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
    playoffLog('Saving match score:', { matchId, team1GameWins, team2GameWins });

    try {
      // Use unified update hook (routes to brackets-manager or legacy)
      await updateMatch(
        matchId,
        team1Score,
        team2Score,
        games,
        team1GameWins,
        team2GameWins
      );
      
      // Refresh UI
      if (refetchBrackets) {
        await refetchBrackets();
      }

      // Close editor
      setEditingMatch(null);
      setIsQuickEdit(false);

    } catch (error) {
      errorLog('Error saving match score:', error);
      toast({
        title: "Error",
        description: "Failed to save match score. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [updateMatch, currentBracket, toast]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};
