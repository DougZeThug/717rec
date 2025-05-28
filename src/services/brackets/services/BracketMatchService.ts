
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame, PlayoffMatch } from '@/types/playoffs';
import { updateMatchScore } from '../updateMatchScore';
import { computeBracketState } from '../computeBracketState';

/**
 * Service for bracket match operations
 */
export class BracketMatchService {
  /**
   * Update match score and result
   */
  static async updateMatchResult(
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number,
    team1GameWins: number = 0,
    team2GameWins: number = 0,
    games?: PlayoffGame[]
  ): Promise<void> {
    await updateMatchScore(
      matchId,
      winnerId, 
      team1Score,
      team2Score,
      team1GameWins,
      team2GameWins,
      games
    );
    
    console.log(`Match ${matchId} updated with scores: ${team1Score}-${team2Score}`);
  }

  /**
   * Group bracket matches by type
   */
  static groupBracketMatchesByType(bracket: any) {
    if (!bracket || !bracket.matches || !Array.isArray(bracket.matches)) {
      return { winners: [], losers: [], finals: [] };
    }

    const winners: any[][] = [];
    const losers: any[][] = [];
    const finals: any[] = [];

    bracket.matches.forEach((match: any) => {
      const round = match.round || 0;
      
      if (match.matchType === "winners" || match.match_type === "winners") {
        winners[round] = winners[round] || [];
        winners[round].push(match);
      } 
      else if (match.matchType === "losers" || match.match_type === "losers") {
        losers[round] = losers[round] || [];
        losers[round].push(match);
      } 
      else if (match.matchType === "finals" || match.match_type === "finals") {
        finals.push(match);
      }
    });

    return { winners, losers, finals };
  }
}
