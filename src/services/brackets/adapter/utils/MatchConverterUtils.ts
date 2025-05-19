
/**
 * Utility class for converting match formats between brackets-manager and our database
 */
export class MatchConverterUtils {
  /**
   * Convert a match from brackets-manager format to database format
   */
  convertMatchToDbFormat(match: any): any {
    return {
      id: match.id,
      bracket_id: match.stage_id,
      round_number: match.round,
      position: match.position,
      match_type: this.convertMatchTypeForDB(match.group?.toLowerCase() || 'winners'),
      team1_id: match.opponent1?.id || null,
      team2_id: match.opponent2?.id || null,
      winner_id: match.opponent1?.result === 'win' 
        ? match.opponent1.id 
        : (match.opponent2?.result === 'win' ? match.opponent2.id : null),
      loser_id: match.opponent1?.result === 'loss'
        ? match.opponent1.id
        : (match.opponent2?.result === 'loss' ? match.opponent2.id : null),
      next_match_id: match.child_count > 0 ? match.child_match_id : null,
      next_loser_match_id: match.child_count > 1 ? match.child_match_id_loser : null,
      best_of: match.best_of || 3,
      team1_score: match.opponent1?.score !== undefined ? match.opponent1.score : null,
      team2_score: match.opponent2?.score !== undefined ? match.opponent2.score : null,
      iscompleted: match.status === 'completed',
      metadata: {
        team1_seed: match.opponent1?.position || null,
        team2_seed: match.opponent2?.position || null
      }
    };
  }
  
  /**
   * Convert a match from database format to brackets-manager format
   */
  convertMatchFromDbFormat(dbMatch: any): any {
    // Handle opponent1
    const opponent1 = dbMatch.team1_id ? {
      id: dbMatch.team1_id,
      position: dbMatch.metadata?.team1_seed || null,
      result: dbMatch.team1_id === dbMatch.winner_id ? 'win' : 
              (dbMatch.team1_id === dbMatch.loser_id ? 'loss' : null),
      score: dbMatch.team1_score
    } : null;
    
    // Handle opponent2
    const opponent2 = dbMatch.team2_id ? {
      id: dbMatch.team2_id,
      position: dbMatch.metadata?.team2_seed || null,
      result: dbMatch.team2_id === dbMatch.winner_id ? 'win' : 
              (dbMatch.team2_id === dbMatch.loser_id ? 'loss' : null),
      score: dbMatch.team2_score
    } : null;
    
    // Calculate child_count based on next match links
    const childCount = (dbMatch.next_match_id ? 1 : 0) + (dbMatch.next_loser_match_id ? 1 : 0);
    
    return {
      id: dbMatch.id,
      stage_id: dbMatch.bracket_id,
      round: dbMatch.round_number,
      position: dbMatch.position,
      group: this.convertMatchTypeFromDB(dbMatch.match_type).toUpperCase(),
      status: dbMatch.iscompleted ? 'completed' : 'pending',
      opponent1: opponent1,
      opponent2: opponent2,
      child_count: childCount,
      child_match_id: dbMatch.next_match_id,
      child_match_id_loser: dbMatch.next_loser_match_id,
      best_of: dbMatch.best_of
    };
  }

  /**
   * Convert match type for database compatibility
   * Maps play-in and play-in-2 to winners for database storage
   */
  convertMatchTypeForDB(matchType: string): "winners" | "losers" | "finals" {
    if (matchType === "play-in" || matchType === "play-in-2") {
      return "winners";
    }
    return matchType as "winners" | "losers" | "finals";
  }
  
  /**
   * Convert match type from database format to brackets-manager format
   * For now, this is simple, but can be extended if needed
   */
  convertMatchTypeFromDB(matchType: string): string {
    return matchType;
  }
}
