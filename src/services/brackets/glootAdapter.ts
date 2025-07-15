
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
  console.log('🏆 adaptPlayoffMatchesToGloot: Team map:', teamMap);
  
  const glootMatches: GlootMatch[] = matches.map((match, index) => {
    console.log(`🏆 adaptPlayoffMatchesToGloot: Processing match ${index + 1}/${matches.length}:`, match);
    
    // Use conditional logic instead of empty string fallback
    const team1 = match.team1Id ? teamMap.get(match.team1Id) : undefined;
    const team2 = match.team2Id ? teamMap.get(match.team2Id) : undefined;
    
    console.log(`🏆 adaptPlayoffMatchesToGloot: Match ${match.id} teams:`, { team1, team2 });
    
    // Determine match state using enhanced logic
    const state = determineMatchState(match);
    
    // Create participants
    const participants = [];
    
    if (team1) {
      participants.push({
        id: team1.id,
        name: team1.name,
        resultText: match.team1Score !== null && match.team1Score !== undefined ? match.team1Score.toString() : undefined,
        isWinner: match.winnerId === team1.id,
        status: match.status === 'completed' ? 'PLAYED' as const : 'NO_PARTY' as const
      });
    } else {
      // Add placeholder for missing team
      participants.push({
        id: `tbd-${match.id}-0`,
        name: 'TBD',
        status: 'NO_PARTY' as const
      });
    }
    
    if (team2) {
      participants.push({
        id: team2.id,
        name: team2.name,
        resultText: match.team2Score !== null && match.team2Score !== undefined ? match.team2Score.toString() : undefined,
        isWinner: match.winnerId === team2.id,
        status: match.status === 'completed' ? 'PLAYED' as const : 'NO_PARTY' as const
      });
    } else {
      // Add placeholder for missing team
      participants.push({
        id: `tbd-${match.id}-1`,
        name: 'TBD',
        status: 'NO_PARTY' as const
      });
    }
    
    const glootMatch = {
      id: match.id,
      name: createMatchName(match),
      nextMatchId: match.nextWinMatchId || undefined,
      nextLooserMatchId: match.nextLoseMatchId || undefined,
      tournamentRoundText: createTournamentRoundText(match),
      startTime: new Date().toISOString(),
      state,
      participants
    };
    
    console.log(`🏆 adaptPlayoffMatchesToGloot: Created gloot match ${index + 1}:`, glootMatch);
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
