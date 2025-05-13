
import { useQuery } from "@tanstack/react-query";
import { PlayoffBracket, Team } from "@/types";
import { useTeamData } from "./useTeamData";
import { fetchBracketById } from "@/services/bracketDataService";
import { ChallongeService } from "@/services/ChallongeService";
import { useEffect, useState } from "react";

export const useBracketData = (bracketId?: string) => {
  // Use the shared team data hook to get teams
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  const [challongeData, setChallongeData] = useState<any>(null);
  const [isChallongeLoading, setIsChallongeLoading] = useState(false);
  
  // Query for bracket data if we have a bracketId
  const bracketQuery = useQuery({
    queryKey: ['bracket', bracketId],
    queryFn: async () => {
      if (!bracketId) throw new Error("No bracket ID provided");
      return fetchBracketById(bracketId);
    },
    enabled: !!bracketId
  });
  
  // Fetch Challonge data if available
  useEffect(() => {
    const fetchChallongeData = async () => {
      if (!bracketQuery.data || !bracketQuery.data.challongeTournamentId) {
        return;
      }
      
      try {
        setIsChallongeLoading(true);
        const tournamentData = await ChallongeService.getTournament(bracketQuery.data.challongeTournamentId);
        setChallongeData(tournamentData);
        
        // Update our bracket with Challonge state
        if (bracketQuery.data && tournamentData) {
          const updatedBracket = { ...bracketQuery.data };
          updatedBracket.state = tournamentData.state;
          
          // Map participants to teams
          if (tournamentData.participants && teams) {
            const participantMap = new Map();
            tournamentData.participants.forEach((participant: any) => {
              participantMap.set(participant.name, participant.id);
            });
            
            // Update match data with Challonge IDs
            updatedBracket.matches = updatedBracket.matches.map((match) => {
              const updatedMatch = { ...match };
              
              const team1 = teams.find(t => t.id === match.team1Id);
              const team2 = teams.find(t => t.id === match.team2Id);
              
              if (team1 && participantMap.has(team1.name)) {
                updatedMatch.team1ChallongeId = participantMap.get(team1.name);
              }
              
              if (team2 && participantMap.has(team2.name)) {
                updatedMatch.team2ChallongeId = participantMap.get(team2.name);
              }
              
              return updatedMatch;
            });
          }
          
          // Set match IDs from Challonge if available
          if (tournamentData.matches) {
            const matchesMap = new Map();
            tournamentData.matches.forEach((match: any) => {
              matchesMap.set(`${match.player1_id}-${match.player2_id}-${match.round}`, match.id);
              matchesMap.set(`${match.player2_id}-${match.player1_id}-${match.round}`, match.id);
            });
            
            // Update match data with Challonge match IDs
            updatedBracket.matches = updatedBracket.matches.map((match) => {
              const updatedMatch = { ...match };
              
              if (match.team1ChallongeId && match.team2ChallongeId) {
                const key = `${match.team1ChallongeId}-${match.team2ChallongeId}-${match.round}`;
                const key2 = `${match.team2ChallongeId}-${match.team1ChallongeId}-${match.round}`;
                
                if (matchesMap.has(key)) {
                  updatedMatch.challongeMatchId = matchesMap.get(key).toString();
                } else if (matchesMap.has(key2)) {
                  updatedMatch.challongeMatchId = matchesMap.get(key2).toString();
                }
              }
              
              return updatedMatch;
            });
          }
        }
      } catch (error) {
        console.error("Error fetching Challonge data:", error);
      } finally {
        setIsChallongeLoading(false);
      }
    };
    
    fetchChallongeData();
  }, [bracketQuery.data, teams]);

  const bracket = bracketQuery.data;
  const isLoading = teamsLoading || bracketQuery.isLoading || isChallongeLoading;

  return {
    teams: teams || [],
    bracket,
    isLoading,
    error: bracketQuery.error,
    challongeData
  };
};
