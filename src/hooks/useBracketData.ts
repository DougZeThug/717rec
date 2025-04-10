
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, Team, PlayoffMatch, Player } from "@/types";

export const useBracketData = (bracketId?: string) => {
  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('seed', { ascending: true })
      .order('name');
      
    if (error) throw error;
    
    // Transform to our application Team type
    return data.map((team): Team => ({
      id: team.id,
      name: team.name,
      logoUrl: team.logo_url,
      // Convert string[] to Player[] by mapping each string to a Player object
      players: team.players ? team.players.map((playerName: string): Player => ({
        name: playerName
      })) : [],
      wins: 0, // We'll calculate this from matches later
      losses: 0, // We'll calculate this from matches later
      created_at: team.created_at,
      division: team.division_id // This will be the division ID from Supabase
    }));
  };
  
  const fetchBracket = async (id: string) => {
    // Get the bracket
    const { data: bracketData, error: bracketError } = await supabase
      .from('brackets')
      .select('*, divisions(name)')
      .eq('id', id)
      .single();
      
    if (bracketError) throw bracketError;
    
    // Get all matches for this bracket
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('*, games(*)')
      .eq('bracket_id', id)
      .order('round_number', { ascending: true })
      .order('position', { ascending: true });
      
    if (matchesError) throw matchesError;
    
    // Transform to our application PlayoffMatch type
    const matches = matchesData.map((match): PlayoffMatch => ({
      id: match.id,
      round: match.round_number,
      position: match.position || 0, // Default to 0 if position is not present
      team1Id: match.team1_id,
      team2Id: match.team2_id,
      winnerId: match.winner_id,
      team1Score: match.games?.filter(g => g.team1_score > g.team2_score).length || 0,
      team2Score: match.games?.filter(g => g.team2_score > g.team1_score).length || 0,
      matchType: match.match_type as "Winners" | "Losers" | "Finals" || "Winners",
      bestOf: match.best_of || 3,
      games: match.games?.map(game => ({
        id: game.id,
        team1Score: game.team1_score || 0,
        team2Score: game.team2_score || 0,
        winner: game.team1_score > game.team2_score ? match.team1_id : match.team2_id
      })) || []
    }));
    
    // Transform to our application PlayoffBracket type
    const bracket: PlayoffBracket = {
      id: bracketData.id,
      name: bracketData.title,
      division: bracketData.divisions?.name || "Unknown",
      matches: matches,
      format: bracketData.format as "Single Elimination" | "Double Elimination" || "Single Elimination"
    };
    
    return bracket;
  };

  // Query for teams
  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams
  });
  
  // Query for bracket data if we have a bracketId
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: () => fetchBracket(bracketId!),
    enabled: !!bracketId
  });

  return {
    teams: teamsQuery.data || [],
    bracket: bracketQuery.data,
    isLoading: teamsQuery.isLoading || (bracketId ? bracketQuery.isLoading : false),
    error: teamsQuery.error || bracketQuery.error
  };
};
