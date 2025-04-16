
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team, Match } from "@/types";
import { format } from "date-fns";

export const useTeamDetails = (teamId: string | undefined) => {
  // Fetch team data
  const teamQuery = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const { data, error } = await supabase
        .from("teams")
        .select("*, divisions(name)")
        .eq("id", teamId)
        .single();
        
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        players: data.players?.map((name: string) => ({ name })) || [],
        wins: data.wins || 0,
        losses: data.losses || 0,
        created_at: data.created_at,
        division: data.division_id,
        divisionName: data.divisions?.name || null
      } as Team;
    },
    enabled: !!teamId
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
        loserId: match.loser_id
      }));
    },
    enabled: !!teamId
  });
  
  // Calculate win percentage
  const calculateWinPercentage = () => {
    if (!teamQuery.data) return "0.0";
    const totalGames = teamQuery.data.wins + teamQuery.data.losses;
    return totalGames > 0 ? ((teamQuery.data.wins / totalGames) * 100).toFixed(1) : "0.0";
  };
  
  // Separate upcoming and past matches
  const getUpcomingAndPastMatches = () => {
    if (!matchesQuery.data) return { upcomingMatches: [], pastMatches: [] };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    const upcomingMatches = matchesQuery.data
      .filter(match => new Date(match.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const pastMatches = matchesQuery.data
      .filter(match => new Date(match.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    return { upcomingMatches, pastMatches };
  };
  
  // For displaying opponents
  const getOpponentId = (match: Match) => {
    return match.team1Id === teamId ? match.team2Id : match.team1Id;
  };
  
  // Match result functions for past matches
  const getMatchResult = (match: Match) => {
    if (!match.iscompleted) return "Incomplete";
    return match.winnerId === teamId ? "Win" : "Loss";
  };
  
  const getScoreDisplay = (match: Match) => {
    if (!match.iscompleted || match.team1Score === undefined || match.team2Score === undefined) {
      return "";
    }
    
    // If this team is team1, show scores as is, otherwise swap
    if (match.team1Id === teamId) {
      return `${match.team1Score}–${match.team2Score}`;
    } else {
      return `${match.team2Score}–${match.team1Score}`;
    }
  };
  
  // Calculate strength of schedule (SOS)
  const calculateSOS = () => {
    if (!teamQuery.data || !matchesQuery.data) return 0;
    
    // This is a simplified approach - in a real app you'd want to fetch all teams and their records
    return 0; // Placeholder for now
  };
  
  const { upcomingMatches, pastMatches } = getUpcomingAndPastMatches();
  const winPercentage = calculateWinPercentage();
  
  return {
    team: teamQuery.data,
    isLoadingTeam: teamQuery.isLoading,
    matches: matchesQuery.data,
    isLoadingMatches: matchesQuery.isLoading,
    upcomingMatches,
    pastMatches,
    winPercentage,
    strengthOfSchedule: calculateSOS(),
    getOpponentId,
    getMatchResult,
    getScoreDisplay
  };
};
