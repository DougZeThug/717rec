
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team, Match } from "@/types";

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
        isCompleted: match.is_completed || false,
        winnerId: match.winner_id,
        loserId: match.loser_id
      }));
    },
    enabled: !!teamId
  });
  
  // Calculate strength of schedule (SOS)
  // A simple implementation: average win percentage of all opponents
  const calculateSOS = () => {
    if (!teamQuery.data || !matchesQuery.data) return 0;
    
    // This is a simplified approach - in a real app you'd want to fetch all teams and their records
    return 0; // Placeholder for now
  };
  
  return {
    team: teamQuery.data,
    isLoadingTeam: teamQuery.isLoading,
    matches: matchesQuery.data,
    isLoadingMatches: matchesQuery.isLoading,
    strengthOfSchedule: calculateSOS()
  };
};
