
import { useEffect, useState } from "react";
import { Team, Match, Ranking } from "@/types";
import { sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";
import { calculateStreak } from "@/utils/rankingUtils/calculateStreak";
import { calculateHeadToHead } from "@/utils/rankingUtils/calculateHeadToHead";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Load previous rankings from localStorage
  useEffect(() => {
    const loadPreviousRankings = () => {
      try {
        const storedRankings = localStorage.getItem('previousRankings');
        if (storedRankings) {
          setPreviousRankings(JSON.parse(storedRankings));
        }
      } catch (error) {
        console.error('Error loading previous rankings:', error);
        setPreviousRankings({});
      }
    };
    
    loadPreviousRankings();
  }, []);
  
  // Fetch the latest match data
  const { data: latestMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      // Transform data to Match type
      return data.map((match): Match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date,
        location: match.location || '',
        iscompleted: match.iscompleted,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        team1_game_wins: match.team1_game_wins,
        team2_game_wins: match.team2_game_wins,
        round_number: match.round_number,
        position: match.position,
        bracket_id: match.bracket_id,
        match_type: match.match_type,
        next_match_id: match.next_match_id,
        next_loser_match_id: match.next_loser_match_id,
        best_of: match.best_of
      }));
    },
    staleTime: 10000,
  });
  
  // Fetch the latest team data from v_team_details which now includes power_score and sos
  const { data: latestTeams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_team_details')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      // Prevent duplicate rows by using a Map with team_id as key
      const uniqueTeams = new Map<string, any>();
      
      data.forEach(team => {
        if (!uniqueTeams.has(team.team_id)) {
          uniqueTeams.set(team.team_id, team);
        }
      });
      
      console.log(`Fetched ${data.length} team records, found ${uniqueTeams.size} unique teams`);
      
      // Transform the data to match Team type
      return Array.from(uniqueTeams.values()).map((team): Team => ({
        id: team.team_id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
        imageUrl: team.image_url || null,
        players: Array.isArray(team.players) ? team.players : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        game_wins: team.game_wins || 0,
        game_losses: team.game_losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division: team.division_id || null,
        divisionName: team.divisionname || null,
        // Use database-calculated SOS
        sos: typeof team.sos === 'number' ? team.sos : 
             typeof team.sos === 'string' ? parseFloat(team.sos) : 0,
        // Use database-calculated power_score
        power_score: typeof team.power_score === 'number' ? team.power_score : 
                    typeof team.power_score === 'string' ? parseFloat(team.power_score) : 0,
        // Map close_match_losses if available
        close_match_losses: typeof team.close_match_losses === 'string' ? 
                           parseInt(team.close_match_losses) : 
                           typeof team.close_match_losses === 'number' ? 
                           team.close_match_losses : 0
      }));
    },
    staleTime: 10000,
  });
  
  // Create ranking objects from teams data
  useEffect(() => {
    const createRankings = async () => {
      const teamsToUse = latestTeams || teams;
      
      if (!teamsToUse || teamsToUse.length === 0) {
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        const matchesToUse = latestMatches || matches;
        
        const unsortedRankings = await Promise.all(teamsToUse.map(team => {
          // Create a ranking object for each team using database-calculated values
          // for power_score and sos
          const winPercentage = calculateWinPercentage(team.wins || 0, team.losses || 0);
          const streak = calculateStreak(team.id, matchesToUse);
          const headToHead = calculateHeadToHead(team.id, teamsToUse, matchesToUse);
          const previousRank = previousRankings[team.id];
          
          // Calculate game level stats
          const totalGames = (team.game_wins || 0) + (team.game_losses || 0);
          const gameWinPercentage = totalGames > 0 ? (team.game_wins || 0) / totalGames : 0;
          
          return {
            teamId: team.id,
            teamName: team.name || 'Unknown Team',
            logoUrl: team.logoUrl,
            imageUrl: team.imageUrl,
            wins: team.wins || 0,
            losses: team.losses || 0,
            winPercentage,
            divisionName: team.divisionName,
            // Use database-calculated SOS value
            sos: team.sos,
            streak,
            headToHead,
            previousRank,
            rankChange: previousRank !== undefined ? 0 : undefined,
            gamesWon: team.game_wins || 0,
            gamesLost: team.game_losses || 0,
            gameWinPercentage,
            // Use database-calculated power score
            powerScore: team.power_score,
            closeMatchLosses: team.close_match_losses || 0
          };
        }));
        
        // Sort the rankings by power score
        const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');
        
        // Update rank changes
        const finalRankings = updateRankChanges(sortedRankings);
        
        setRankings(finalRankings);
        
        // Save current rankings to localStorage for future comparison
        saveRankingsToStorage(finalRankings);
      } catch (error) {
        console.error('Error calculating rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    createRankings();
  }, [latestTeams, latestMatches, teams, matches, previousRankings]);
  
  return {
    rankings,
    isLoading: isLoading || matchesLoading || teamsLoading,
    refreshRankings: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    }
  };
};
