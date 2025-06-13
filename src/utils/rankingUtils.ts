
import { Team, Match, Ranking } from "@/types";

// Ranking utilities - now uses database-calculated power scores
// The power score calculation is handled in v_team_details using the correct 40/40/20 formula

export const sortRankings = (rankings: Ranking[], sortField: string, direction: 'asc' | 'desc'): Ranking[] => {
  return [...rankings].sort((a, b) => {
    let valueA: number | string;
    let valueB: number | string;

    switch (sortField) {
      case 'powerScore':
        valueA = a.powerScore || 0;
        valueB = b.powerScore || 0;
        break;
      case 'winPercentage':
        valueA = a.winPercentage || 0;
        valueB = b.winPercentage || 0;
        break;
      case 'sos':
        valueA = a.sos || 0;
        valueB = b.sos || 0;
        break;
      case 'wins':
        valueA = a.wins || 0;
        valueB = b.wins || 0;
        break;
      case 'teamName':
        valueA = a.teamName;
        valueB = b.teamName;
        break;
      default:
        valueA = a.powerScore || 0;
        valueB = b.powerScore || 0;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    const numA = Number(valueA);
    const numB = Number(valueB);
    return direction === 'asc' ? numA - numB : numB - numA;
  });
};

export const calculateStreak = (teamId: string, matches: Match[]): string => {
  if (!matches || matches.length === 0) return 'N/A';
  
  const teamMatches = matches
    .filter(match => 
      match.iscompleted && 
      (match.team1Id === teamId || match.team2Id === teamId)
    )
    .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());

  if (teamMatches.length === 0) return 'N/A';

  let streak = 0;
  let isWinStreak = teamMatches[0].winnerId === teamId;
  
  for (const match of teamMatches) {
    const isWin = match.winnerId === teamId;
    if (isWin === isWinStreak) {
      streak++;
    } else {
      break;
    }
  }

  return `${isWinStreak ? 'W' : 'L'}${streak}`;
};

export const updateRankChanges = (rankings: Ranking[]): Ranking[] => {
  return rankings.map((ranking, index) => {
    const currentRank = index + 1;
    const previousRank = ranking.previousRank;
    
    let rankChange = 0;
    if (previousRank && previousRank !== currentRank) {
      rankChange = previousRank - currentRank;
    }
    
    return {
      ...ranking,
      rankChange
    };
  });
};

export const saveRankingsToStorage = (rankings: Ranking[]): void => {
  try {
    const rankingMap = rankings.reduce((acc, ranking, index) => {
      acc[ranking.teamId] = index + 1;
      return acc;
    }, {} as Record<string, number>);
    
    localStorage.setItem('previousRankings', JSON.stringify(rankingMap));
    localStorage.setItem('rankingsLastUpdated', new Date().toISOString());
  } catch (error) {
    console.error('Failed to save rankings to storage:', error);
  }
};

export const loadRankingsFromStorage = (): { rankings: Record<string, number>, lastUpdated: string | null } => {
  try {
    const rankings = JSON.parse(localStorage.getItem('previousRankings') || '{}');
    const lastUpdated = localStorage.getItem('rankingsLastUpdated');
    return { rankings, lastUpdated };
  } catch (error) {
    console.error('Failed to load rankings from storage:', error);
    return { rankings: {}, lastUpdated: null };
  }
};
