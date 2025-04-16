
import { useEffect, useState } from "react";
import { Team, Match, Ranking, HeadToHeadMap } from "@/types";

export const useTeamRankings = (teams: Team[] | undefined, matches: Match[] | undefined) => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const loadPreviousRankings = () => {
      try {
        const storedRankings = localStorage.getItem('previousRankings');
        if (storedRankings) {
          setPreviousRankings(JSON.parse(storedRankings));
        }
      } catch (error) {
        console.error('Error loading previous rankings:', error);
        // If there's an error, we'll use an empty object as fallback
        setPreviousRankings({});
      }
    };
    
    loadPreviousRankings();
  }, []);
  
  const calculateSOS = (team: Team, allTeams: Team[]) => {
    if (!team || !allTeams || allTeams.length === 0) return 0.5;
    
    const otherTeams = allTeams.filter(t => t.id !== team.id);
    
    if (otherTeams.length === 0) return 0.5;
    
    let divisionWeight = 0.85;
    if (team.divisionName === 'Recreational') divisionWeight = 0.7;
    if (team.divisionName === 'Competitive') divisionWeight = 1.0;
    
    const opponentWinRates = otherTeams.map(opponent => {
      const totalGames = (opponent.wins || 0) + (opponent.losses || 0);
      return totalGames > 0 ? ((opponent.wins || 0) / totalGames) : 0.5;
    });
    
    if (opponentWinRates.length === 0) return 0.5;
    
    const avgOpponentWinRate = opponentWinRates.reduce((sum, rate) => sum + rate, 0) / opponentWinRates.length;
    
    return avgOpponentWinRate * divisionWeight;
  };

  const calculateStreak = (teamId: string, allMatches: Match[] | undefined) => {
    if (!teamId || !allMatches || allMatches.length === 0) return undefined;
    
    const teamMatches = allMatches
      .filter(match => 
        match && 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
    
    if (teamMatches.length === 0) return undefined;
    
    let streakCount = 1;
    let isWin = teamMatches[0].winnerId === teamId;
    
    for (let i = 1; i < teamMatches.length; i++) {
      const match = teamMatches[i];
      if (!match) continue;
      
      const currentIsWin = match.winnerId === teamId;
      
      if (currentIsWin === isWin) {
        streakCount++;
      } else {
        break;
      }
    }
    
    return isWin ? `W${streakCount}` : `L${streakCount}`;
  };

  const calculateHeadToHead = (teamId: string, allTeams: Team[] | undefined, allMatches: Match[] | undefined): HeadToHeadMap => {
    const result: HeadToHeadMap = {};
    
    if (!teamId || !allTeams || !allMatches || allTeams.length === 0) return result;
    
    allTeams.forEach(team => {
      if (team && team.id && team.id !== teamId) {
        result[team.id] = {
          opponentName: team.name || 'Unknown Team',
          wins: 0,
          losses: 0
        };
      }
    });
    
    allMatches
      .filter(match => 
        match && 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .forEach(match => {
        if (!match) return;
        
        const isTeam1 = match.team1Id === teamId;
        const opponentId = isTeam1 ? match.team2Id : match.team1Id;
        
        if (opponentId && result[opponentId]) {
          if (match.winnerId === teamId) {
            result[opponentId].wins += 1;
          } else if (match.loserId === teamId) {
            result[opponentId].losses += 1;
          }
        }
      });
    
    return result;
  };

  const calculateRankings = (teamsData: Team[] | undefined, matchesData: Match[] | undefined): Ranking[] => {
    if (!teamsData || teamsData.length === 0) {
      return [];
    }
    
    const rankings = teamsData
      .filter(team => team !== null && team !== undefined)
      .map(team => {
        const totalGames = (team.wins || 0) + (team.losses || 0);
        const winPercentage = totalGames > 0 ? (team.wins || 0) / totalGames : 0;
        const sos = calculateSOS(team, teamsData);
        const streak = calculateStreak(team.id, matchesData);
        const headToHead = calculateHeadToHead(team.id, teamsData, matchesData);
        const previousRank = previousRankings[team.id];
        
        return {
          teamId: team.id,
          teamName: team.name || 'Unknown Team',
          logoUrl: team.logoUrl,
          imageUrl: team.imageUrl,
          wins: team.wins || 0,
          losses: team.losses || 0,
          winPercentage,
          divisionName: team.divisionName,
          sos,
          streak,
          headToHead,
          previousRank,
          rankChange: previousRank !== undefined ? previousRank - (0) : undefined
        };
      });
    
    // Sort rankings by win percentage first, then by SOS
    const sortedRankings = rankings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return (b.sos || 0) - (a.sos || 0);
    });
    
    // Update the rankChange after sorting
    sortedRankings.forEach((ranking, index) => {
      if (ranking.previousRank !== undefined) {
        ranking.rankChange = ranking.previousRank - (index + 1);
      }
    });
    
    return sortedRankings;
  };
  
  // Save current rankings to localStorage for future comparison
  useEffect(() => {
    if (teams && teams.length > 0 && matches) {
      try {
        const currentRankings = calculateRankings(teams, matches);
        const rankingsToSave: Record<string, number> = {};
        
        currentRankings.forEach((ranking, index) => {
          rankingsToSave[ranking.teamId] = index + 1;
        });
        
        localStorage.setItem('previousRankings', JSON.stringify(rankingsToSave));
      } catch (error) {
        console.error('Error saving rankings:', error);
      }
    }
  }, [teams, matches]);

  return {
    calculateRankings
  };
};
