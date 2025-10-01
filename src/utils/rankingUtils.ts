
import { Team, Match, Ranking } from "@/types";

// Ranking utilities - now handles NULL power scores for teams with no matches
// The power score calculation is handled in v_team_details using the 40/45/15 formula:
// - 40% Weighted Match Win % = (wins × opponent_weights) / total_matches
// - 45% Strength of Schedule = average opponent division weight
// - 15% Weighted Game Win % = (game_wins × opponent_weights) / total_games

export const sortRankings = (rankings: Ranking[], sortField: string, direction: 'asc' | 'desc'): Ranking[] => {
  return [...rankings].sort((a, b) => {
    let valueA: number | string | null;
    let valueB: number | string | null;

    switch (sortField) {
      case 'powerScore':
        valueA = a.powerScore;
        valueB = b.powerScore;
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
        valueA = a.powerScore;
        valueB = b.powerScore;
    }

    // Handle NULL values for power score - put them at the end regardless of direction
    if (sortField === 'powerScore') {
      if (valueA === null && valueB === null) return 0;
      if (valueA === null) return 1;  // NULL values go to the end
      if (valueB === null) return -1; // NULL values go to the end
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }

    const numA = Number(valueA);
    const numB = Number(valueB);
    return direction === 'asc' ? numA - numB : numB - numA;
  });
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
