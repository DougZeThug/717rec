
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Team, Match } from "@/types";
import { format } from "date-fns";
import { calculateSOS } from "@/utils/rankingUtils";

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
      .filter(match => new Date(match.date || "") >= today)
      .sort((a, b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());
    
    const pastMatches = matchesQuery.data
      .filter(match => new Date(match.date || "") < today)
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
      
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
  
  // Calculate detailed team statistics
  const calculateTeamStats = () => {
    if (!teamQuery.data || !matchesQuery.data) return {
      gamesWon: 0,
      gamesLost: 0,
      gameWinPercentage: "0.0",
      strengthOfSchedule: "0.00",
      closeMatchLosses: 0,
      powerScore: 0.0
    };
    
    const matches = matchesQuery.data;
    let gamesWon = 0;
    let gamesLost = 0;
    let closeMatchLosses = 0;
    
    // Calculate games won and lost
    matches.forEach(match => {
      if (!match.iscompleted) return;
      
      if (match.team1Id === teamId) {
        gamesWon += match.team1_game_wins || 0;
        gamesLost += match.team2_game_wins || 0;
        
        // Check for close match loss (lost match but won at least one game)
        if (match.loserId === teamId && (match.team1_game_wins || 0) > 0) {
          closeMatchLosses++;
        }
      } else {
        gamesWon += match.team2_game_wins || 0;
        gamesLost += match.team1_game_wins || 0;
        
        // Check for close match loss (lost match but won at least one game)
        if (match.loserId === teamId && (match.team2_game_wins || 0) > 0) {
          closeMatchLosses++;
        }
      }
    });
    
    const totalGames = gamesWon + gamesLost;
    const gameWinPercentage = totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : "0.0";
    
    // Calculate SOS
    let strengthOfSchedule = 0.5;
    if (teamQuery.data && allTeamsQuery.data) {
      const sosPromise = calculateSOS(teamQuery.data, allTeamsQuery.data, matchesQuery.data);
      sosPromise.then(value => {
        strengthOfSchedule = value;
      });
    }
    
    // Calculate Power Score
    const winPercentValue = parseFloat(calculateWinPercentage()) / 100;
    const gameWinPercentValue = parseFloat(gameWinPercentage) / 100;
    const powerScore = (winPercentValue * 0.5) + (gameWinPercentValue * 0.3) + (strengthOfSchedule * 0.2);
    const formattedPowerScore = (powerScore * 100).toFixed(1);
    
    return {
      gamesWon,
      gamesLost,
      gameWinPercentage,
      strengthOfSchedule: strengthOfSchedule.toFixed(2),
      closeMatchLosses,
      powerScore: parseFloat(formattedPowerScore)
    };
  };
  
  const { upcomingMatches, pastMatches } = getUpcomingAndPastMatches();
  const winPercentage = calculateWinPercentage();
  const stats = calculateTeamStats();
  
  return {
    team: teamQuery.data,
    isLoadingTeam: teamQuery.isLoading,
    matches: matchesQuery.data,
    isLoadingMatches: matchesQuery.isLoading,
    upcomingMatches,
    pastMatches,
    winPercentage,
    ...stats,
    getOpponentId,
    getMatchResult,
    getScoreDisplay
  };
};
