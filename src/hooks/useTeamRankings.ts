
import { useEffect, useState } from "react";
import { Team, Match, Ranking } from "@/types";
import { createRankingObject, sortRankings, updateRankChanges, saveRankingsToStorage } from "@/utils/rankingUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    refetchInterval: 60000, // Refetch every minute for updates
    staleTime: 30000, // Consider data stale after 30 seconds
  });
  
  // Fetch the latest team data
  const { data: latestTeams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, divisions(name)')
        .order('name');
        
      if (error) throw error;
      
      // Transform the data to match Team type
      return data.map((team): Team => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || null,
        imageUrl: team.image_url || null,
        players: Array.isArray(team.players) 
          ? team.players.map((playerName: string) => ({ name: playerName })) 
          : [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        created_at: team.created_at || new Date().toISOString(),
        division: team.division_id || null,
        divisionName: team.divisions?.name || null
      }));
    },
    refetchInterval: 60000, // Refetch every minute for updates
    staleTime: 30000, // Consider data stale after 30 seconds
  });
  
  // Calculate team rankings when teams or matches change
  useEffect(() => {
    const calculateRankingsEffect = async () => {
      const teamsToUse = latestTeams || teams;
      
      if (!teamsToUse || teamsToUse.length === 0) {
        setRankings([]);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Use latestMatches from query if available, otherwise fall back to matches prop
        const matchesToUse = latestMatches || matches;
        
        // Create ranking objects for each team asynchronously
        const rankingPromises = teamsToUse
          .filter(team => team !== null && team !== undefined)
          .map(team => createRankingObject(team, teamsToUse, matchesToUse, previousRankings));
          
        const unsortedRankings = await Promise.all(rankingPromises);
        
        // Sort rankings by default criteria (will be re-sorted in the component)
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
    
    calculateRankingsEffect();
  }, [latestTeams, latestMatches, teams, matches, previousRankings]);
  
  // Handle manual refresh of rankings
  const refreshRankings = () => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };
  
  return {
    rankings,
    isLoading: isLoading || matchesLoading || teamsLoading,
    refreshRankings
  };
};
