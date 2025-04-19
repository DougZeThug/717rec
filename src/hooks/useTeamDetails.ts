
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team, Match } from "@/types";
import {
  getUpcomingAndPastMatches,
  getOpponentId,
  getMatchResult,
  getScoreDisplay,
  calculateWinPercentage,
  calculateTeamStats
} from "@/utils/teamDetailsUtils";

export const useTeamDetails = (teamId: string | undefined) => {
  // Fetch team data
  const teamQuery = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("v_team_game_totals")
        .select("team_id, name, wins, losses, game_wins, game_losses, logo_url, division_id, divisions(name)")
        .eq("team_id", teamId)
        .single();
        
      if (error) throw error;
      
      return {
        id: data.team_id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: null,
        players: [],
        wins: data.wins || 0,
        losses: data.losses || 0,
        created_at: '',
        division: data.division_id,
        divisionName: data.divisions?.name || null,
        game_wins: data.game_wins || 0,
        game_losses: data.game_losses || 0
      } as Team;
    },
    enabled: !!teamId
  });

  // Fetch all teams for SOS calculation
  const allTeamsQuery = useQuery({
    queryKey: ["all-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, divisions(name)");
        
      if (error) throw error;
      
      return data.map((team: any): Team => ({
        id: team.id,
        name: team.name,
        logoUrl: team.logo_url,
        imageUrl: team.image_url,
        players: team.players?.map((name: string) => ({ name })) || [],
        wins: team.wins || 0,
        losses: team.losses || 0,
        created_at: team.created_at,
        division: team.division_id,
        divisionName: team.divisions?.name || null
      }));
    }
  });
  
  // Fetch matches data
  const matchesQuery = useQuery({
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);
        
      if (error) throw error;
      
      return data.map((match: any): Match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date || new Date().toISOString(), // Fallback if date is missing
        location: match.location || "",
        iscompleted: match.is_completed || false,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        team1_game_wins: match.team1_game_wins || 0,
        team2_game_wins: match.team2_game_wins || 0
      }));
    },
    enabled: !!teamId
  });
  
  // Use our utility functions to process the data
  const winPercentage = calculateWinPercentage(teamQuery.data);
  const { upcomingMatches, pastMatches } = getUpcomingAndPastMatches(matchesQuery.data);
  
  // Create wrapper functions that include the teamId
  const opponentIdWrapper = (match: Match) => getOpponentId(match, teamId);
  const matchResultWrapper = (match: Match) => getMatchResult(match, teamId);
  const scoreDisplayWrapper = (match: Match) => getScoreDisplay(match, teamId);
  
  // Get team stats using our async function
  const [stats, setStats] = useState({
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: "0.0",
    strengthOfSchedule: "0.00",
    closeMatchLosses: 0,
    powerScore: 0.0
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      const calculatedStats = await calculateTeamStats(
        teamQuery.data, 
        allTeamsQuery.data, 
        matchesQuery.data
      );
      setStats(calculatedStats);
    };
    
    fetchStats();
  }, [teamQuery.data, allTeamsQuery.data, matchesQuery.data]);
  
  return {
    team: teamQuery.data,
    isLoadingTeam: teamQuery.isLoading,
    matches: matchesQuery.data,
    isLoadingMatches: matchesQuery.isLoading,
    upcomingMatches,
    pastMatches,
    winPercentage,
    ...stats,
    getOpponentId: opponentIdWrapper,
    getMatchResult: matchResultWrapper,
    getScoreDisplay: scoreDisplayWrapper
  };
};
