
import { PlayoffMatch, Team } from "@/types/playoffs";

export interface GlootMatch {
  id: string;
  name?: string;
  nextMatchId?: string;
  nextLooserMatchId?: string;
  tournamentRoundText?: string;
  startTime: string;
  state: 'WALK_OVER' | 'NO_SHOW' | 'DONE' | 'SCORE_DONE' | 'NO_PARTY';
  participants: Array<{
    id: string;
    resultText?: string;
    isWinner?: boolean;
    status?: 'PLAYED' | 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY';
    name: string;
  }>;
}

export interface GlootTournament {
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
  title: string;
  matches: GlootMatch[];
}

/**
 * Converts playoff matches to @g-loot format
 */
export function adaptPlayoffMatchesToGloot(
  matches: PlayoffMatch[],
  teams: Team[],
  bracketTitle: string = "Tournament",
  bracketFormat: string = "Double Elimination"
): GlootTournament {
  console.log('🏆 adaptPlayoffMatchesToGloot: Starting conversion');
  console.log('🏆 adaptPlayoffMatchesToGloot: Input matches:', matches);
  console.log('🏆 adaptPlayoffMatchesToGloot: Input teams:', teams);
  console.log('🏆 adaptPlayoffMatchesToGloot: Bracket title:', bracketTitle);
  console.log('🏆 adaptPlayoffMatchesToGloot: Bracket format:', bracketFormat);
  
  if (!Array.isArray(matches) || matches.length === 0) {
    console.log('🏆 adaptPlayoffMatchesToGloot: No matches to convert');
    return {
      type: detectBracketType(bracketFormat),
      title: bracketTitle,
      matches: []
    };
  }
  
  const teamMap = new Map(teams.map(team => [team.id, team]));
  console.log('🏆 adaptPlayoffMatchesToGloot: Team map creation:', {
    teamsCount: teams.length,
    teamMapSize: teamMap.size,
    teamIds: teams.map(t => t.id),
    teamNames: teams.map(t => t.name),
    sampleTeams: teams.slice(0, 3)
  });
  
  // Sort matches to ensure proper G-Loot ordering: Winners first, then Losers, then Finals
  const sortedMatches = [...matches].sort((a, b) => {
    // Match type priority: winners < losers < finals
    const typeOrder = { 'winners': 1, 'losers': 2, 'finals': 3 };
    const aTypePriority = typeOrder[a.matchType] || 4;
    const bTypePriority = typeOrder[b.matchType] || 4;
    
    if (aTypePriority !== bTypePriority) {
      return aTypePriority - bTypePriority;
    }
    
    // Within same type, sort by round then position
    if (a.round !== b.round) {
      return a.round - b.round;
    }
    
    return a.position - b.position;
  });
  
  console.log('🏆 adaptPlayoffMatchesToGloot: Sorted matches order:', 
    sortedMatches.map(m => `${m.matchType}-R${m.round}-P${m.position}`)
  );

  const glootMatches: GlootMatch[] = sortedMatches.map((match, index) => {
    console.log(`🏆 adaptPlayoffMatchesToGloot: Processing match ${index + 1}/${sortedMatches.length}:`, {
      id: match.id,
      matchType: match.matchType,
      round: match.round,
      position: match.position,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      status: match.status
    });
    
    // Look up teams
    const team1 = match.team1Id ? teamMap.get(match.team1Id) : undefined;
    const team2 = match.team2Id ? teamMap.get(match.team2Id) : undefined;
    
    // Enhanced state determination - be more permissive for display
    let state: GlootMatch['state'];
    if (match.status === 'completed' && match.winnerId) {
      state = 'SCORE_DONE';
    } else if (team1 && team2 && match.status === 'pending') {
      // Matches with both teams should be shown as ready to play
      state = 'DONE'; 
    } else if (team1 || team2) {
      // Matches with at least one team should be shown
      state = 'WALK_OVER';
    } else {
      // Empty matches waiting for teams
      state = 'NO_PARTY';
    }
    
    // Create consistent participant structure
    const participant1 = {
      id: team1?.id || `tbd-${match.id}-1`,
      name: team1?.name || 'TBD',
      resultText: match.winnerId && team1 ? (match.winnerId === match.team1Id ? 'W' : 'L') : '',
      isWinner: !!match.winnerId && match.winnerId === match.team1Id,
      status: (match.winnerId && team1) ? 'PLAYED' as const : 
              (team1 ? 'WALK_OVER' as const : 'NO_PARTY' as const),
    };
    
    const participant2 = {
      id: team2?.id || `tbd-${match.id}-2`,
      name: team2?.name || 'TBD',
      resultText: match.winnerId && team2 ? (match.winnerId === match.team2Id ? 'W' : 'L') : '',
      isWinner: !!match.winnerId && match.winnerId === match.team2Id,
      status: (match.winnerId && team2) ? 'PLAYED' as const : 
              (team2 ? 'WALK_OVER' as const : 'NO_PARTY' as const),
    };
    
    const glootMatch = {
      id: match.id,
      name: createMatchName(match),
      nextMatchId: match.nextWinMatchId || undefined,
      nextLooserMatchId: match.nextLoseMatchId || undefined,
      tournamentRoundText: createTournamentRoundText(match),
      startTime: new Date().toISOString(),
      state,
      participants: [participant1, participant2]
    };
    
    console.log(`🏆 adaptPlayoffMatchesToGloot: Created match ${match.matchType}-R${match.round}:`, {
      state,
      hasTeam1: !!team1,
      hasTeam2: !!team2,
      participant1Name: participant1.name,
      participant2Name: participant2.name
    });
    
    return glootMatch;
  });
  
  const result = {
    type: detectBracketType(bracketFormat),
    title: bracketTitle,
    matches: glootMatches
  };
  
  console.log('🏆 adaptPlayoffMatchesToGloot: Final result:', result);
  console.log('🏆 adaptPlayoffMatchesToGloot: Total matches converted:', glootMatches.length);
  
  return result;
}

/**
 * Detects bracket type from format string
 */
function detectBracketType(format: string): 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' {
  const formatLower = format.toLowerCase();
  if (formatLower.includes('single') || formatLower.includes('singleelim')) {
    return 'SINGLE_ELIMINATION';
  }
  return 'DOUBLE_ELIMINATION';
}

/**
 * Enhanced match state determination
 */
function determineMatchState(match: PlayoffMatch): GlootMatch['state'] {
  if (match.status === 'completed' && match.winnerId) {
    return 'SCORE_DONE';
  }
  if (match.status === 'in_progress') {
    return 'DONE';
  }
  if (match.team1Id && match.team2Id && match.status === 'pending') {
    return 'DONE';
  }
  // Match with no teams assigned yet
  return 'NO_PARTY';
}

/**
 * Creates enhanced match name with better formatting
 */
function createMatchName(match: PlayoffMatch): string {
  const typeMap = {
    'winners': 'WB',
    'losers': 'LB',
    'finals': 'Finals',
    'play-in': 'Play-In',
    'play-in-2': 'Play-In 2'
  };
  
  const prefix = typeMap[match.matchType] || match.matchType;
  
  if (match.matchType === 'finals') {
    return `${prefix}`;
  }
  
  return `${prefix} R${match.round}`;
}

/**
 * Creates proper tournament round text for G-Loot display
 */
function createTournamentRoundText(match: PlayoffMatch): string {
  switch (match.matchType) {
    case 'winners':
      if (match.round === 1) return 'Winners Round 1';
      if (match.round === 2) return 'Winners Round 2';
      if (match.round === 3) return 'Winners Semi-Final';
      if (match.round === 4) return 'Winners Final';
      return `Winners Round ${match.round}`;
    
    case 'losers':
      if (match.round === 1) return 'Losers Round 1';
      if (match.round === 2) return 'Losers Round 2';
      if (match.round === 3) return 'Losers Round 3';
      if (match.round === 4) return 'Losers Semi-Final';
      if (match.round === 5) return 'Losers Final';
      return `Losers Round ${match.round}`;
    
    case 'finals':
      return 'Grand Final';
    
    case 'play-in':
      return 'Play-In';
    
    case 'play-in-2':
      return 'Play-In 2';
    
    default:
      return `Round ${match.round}`;
  }
}
