
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
      }
    };
    
    loadPreviousRankings();
  }, []);
  
  const calculateSOS = (team: Team, allTeams: Team[]) => {
    const otherTeams = allTeams.filter(t => t.id !== team.id);
    
    if (otherTeams.length === 0) return 0.5;
    
    let divisionWeight = 0.85;
    if (team.divisionName === 'Recreational') divisionWeight = 0.7;
    if (team.divisionName === 'Competitive') divisionWeight = 1.0;
    
    const opponentWinRates = otherTeams.map(opponent => {
      const totalGames = opponent.wins + opponent.losses;
      return totalGames > 0 ? (opponent.wins / totalGames) : 0.5;
    });
    
    const avgOpponentWinRate = opponentWinRates.reduce((sum, rate) => sum + rate, 0) / opponentWinRates.length;
    
    return avgOpponentWinRate * divisionWeight;
  };

  const calculateStreak = (teamId: string, allMatches: Match[] | undefined) => {
    if (!allMatches) return undefined;
    
    const teamMatches = allMatches
      .filter(match => 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
    
    if (teamMatches.length === 0) return undefined;
    
    let streakCount = 1;
    let isWin = teamMatches[0].winnerId === teamId;
    
    for (let i = 1; i < teamMatches.length; i++) {
      const match = teamMatches[i];
      const currentIsWin = match.winnerId === teamId;
      
      if (currentIsWin === isWin) {
        streakCount++;
      } else {
        break;
      }
    }
    
    return isWin ? `W${streakCount}` : `L${streakCount}`;
  };

  const calculateHeadToHead = (teamId: string, allTeams: Team[], allMatches: Match[] | undefined): HeadToHeadMap => {
    const result: HeadToHeadMap = {};
    
    if (!allMatches) return result;
    
    allTeams.forEach(team => {
      if (team.id !== teamId) {
        result[team.id] = {
          opponentName: team.name,
          wins: 0,
          losses: 0
        };
      }
    });
    
    allMatches
      .filter(match => 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .forEach(match => {
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
    
    const rankings = teamsData.map(team => {
      const totalGames = team.wins + team.losses;
      const winPercentage = totalGames > 0 ? team.wins / totalGames : 0;
      const sos = calculateSOS(team, teamsData);
      const streak = calculateStreak(team.id, matchesData);
      const headToHead = calculateHeadToHead(team.id, teamsData, matchesData);
      const previousRank = previousRankings[team.id];
      
      return {
        teamId: team.id,
        teamName: team.name,
        logoUrl: team.logoUrl,
        imageUrl: team.imageUrl,
        wins: team.wins,
        losses: team.losses,
        winPercentage,
        divisionName: team.divisionName,
        sos,
        streak,
        headToHead,
        previousRank,
        rankChange: previousRank !== undefined ? previousRank - (rankings?.length + 1 || 0) : undefined
      };
    });
    
    const sortedRankings = rankings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.sos - a.sos;
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
      const currentRankings = calculateRankings(teams, matches);
      const rankingsToSave: Record<string, number> = {};
      
      currentRankings.forEach((ranking, index) => {
        rankingsToSave[ranking.teamId] = index + 1;
      });
      
      localStorage.setItem('previousRankings', JSON.stringify(rankingsToSave));
    }
  }, [teams, matches]);

  return {
    calculateRankings
  };
};
