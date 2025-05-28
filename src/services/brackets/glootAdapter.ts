
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
  bracketTitle: string = "Tournament"
): GlootTournament {
  const teamMap = new Map(teams.map(team => [team.id, team]));
  
  const glootMatches: GlootMatch[] = matches.map(match => {
    // Use conditional logic instead of empty string fallback
    const team1 = match.team1Id ? teamMap.get(match.team1Id) : undefined;
    const team2 = match.team2Id ? teamMap.get(match.team2Id) : undefined;
    
    // Determine match state
    let state: GlootMatch['state'] = 'NO_PARTY';
    if (match.status === 'completed' && match.winnerId) {
      state = 'SCORE_DONE';
    } else if (match.team1Id && match.team2Id) {
      state = 'DONE';
    }
    
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
    }
    
    if (team2) {
      participants.push({
        id: team2.id,
        name: team2.name,
        resultText: match.team2Score !== null && match.team2Score !== undefined ? match.team2Score.toString() : undefined,
        isWinner: match.winnerId === team2.id,
        status: match.status === 'completed' ? 'PLAYED' as const : 'NO_PARTY' as const
      });
    }
    
    // Fill empty slots if needed
    while (participants.length < 2) {
      participants.push({
        id: `tbd-${match.id}-${participants.length}`,
        name: 'TBD',
        status: 'NO_PARTY' as const
      });
    }
    
    return {
      id: match.id,
      name: `${match.matchType} R${match.round}`,
      nextMatchId: match.nextWinMatchId || undefined,
      nextLooserMatchId: match.nextLoseMatchId || undefined,
      tournamentRoundText: `Round ${match.round}`,
      startTime: new Date().toISOString(), // Fallback since we don't have scheduled_at
      state,
      participants
    };
  });
  
  return {
    type: 'DOUBLE_ELIMINATION',
    title: bracketTitle,
    matches: glootMatches
  };
}
